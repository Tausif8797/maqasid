const mongoose = require('mongoose')
const Member = require('../models/Member')
const Contribution = require('../models/Contribution')
const Loan = require('../models/Loan')
const Settlement = require('../models/Settlement')
const ApiError = require('../utils/ApiError')
const { createNotification } = require('../utils/notificationHelper')

/**
 * Calculate settlement preview for a member.
 * @param {string} memberId
 * @returns {Promise<{ totalContributions: number, activeLoans: number, suggestedPayout: number, hasActiveLoans: boolean, activeLoans: array }>}
 */
async function calculateSettlementPreview(memberId) {
  const member = await Member.findOne({ _id: memberId, isDeleted: false })
  if (!member) throw new ApiError(404, 'Member not found')
  if (member.status === 'Settled') throw new ApiError(400, 'Member has already been settled')

  const [contributionResult, activeLoans] = await Promise.all([
    Contribution.aggregate([
      { $match: { memberId: new mongoose.Types.ObjectId(memberId), status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Loan.find({ memberId: memberId, status: 'active' }).select('_id loanNumber remaining dueDate'),
  ])

  const totalContributions = Math.round((contributionResult[0]?.total || 0) * 100) / 100
  const activeLoansTotal = Math.round(
    activeLoans.reduce((sum, loan) => sum + loan.remaining, 0) * 100,
  ) / 100
  const suggestedPayout = Math.round((totalContributions - activeLoansTotal) * 100) / 100

  return {
    totalContributions,
    activeLoansTotal,
    suggestedPayout,
    hasActiveLoans: activeLoans.length > 0,
    activeLoanDetails: activeLoans.map((loan) => ({
      loanId: loan._id,
      loanNumber: loan.loanNumber,
      remaining: loan.remaining,
      dueDate: loan.dueDate,
    })),
  }
}

/**
 * Execute a member settlement — close loans, update member, create settlement record.
 * @param {string} memberId
 * @param {{ payoutAmount: number }} data
 * @param {object} meta - { adminId, ip, userAgent }
 * @returns {Promise<object>}
 */
async function executeSettlement(memberId, data, meta = {}) {
  const member = await Member.findOne({ _id: memberId, isDeleted: false })
  if (!member) throw new ApiError(404, 'Member not found')
  if (member.status === 'Settled') throw new ApiError(400, 'Member has already been settled')
  if (!meta.performedBy) throw new ApiError(401, 'Admin authentication required')

  const preview = await calculateSettlementPreview(memberId)

  if (preview.hasActiveLoans) {
    throw new ApiError(400, 'Cannot settle member with active loans. Please close all loans first.')
  }

  const payoutAmount = Math.round((Number(data.payoutAmount) || 0) * 100) / 100
  if (payoutAmount < 0 || payoutAmount > preview.totalContributions) {
    throw new ApiError(400, `Payout amount must be between 0 and ${preview.totalContributions}`)
  }

  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    // Update member status to Settled
    member.status = 'Settled'
    member.settledAt = new Date()
    member.settledBy = meta.performedBy
    await member.save({ session })

    // Determine direction and net amount
    const netAmount = Math.round((payoutAmount - preview.activeLoansTotal) * 100) / 100
    let direction = 'zero'
    if (netAmount > 0) direction = 'pay_to_member'
    else if (netAmount < 0) direction = 'collect_from_member'

    // Create settlement record
    const [settlementRecord] = await Settlement.create(
      [
        {
          memberId: member._id,
          totalContributions: preview.totalContributions,
          remainingLoan: preview.activeLoansTotal,
          netAmount: Math.abs(netAmount),
          direction,
          settledAt: new Date(),
          settledBy: meta.performedBy,
        },
      ],
      { session },
    )

    // Create a negative contribution record to reflect the payout deduction
    // This ensures the fund balance is recalculated correctly
    if (payoutAmount > 0) {
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const payoutRecord = await Contribution.create(
        [
          {
            memberId: member._id,
            month: currentMonth,
            amount: -payoutAmount,
            status: 'paid',
            isSettlementPayout: true,
            paymentDate: new Date(),
          },
        ],
        { session },
      )
      console.log('[settlementService] Created negative contribution:', payoutRecord[0]?._id, 'amount:', -payoutAmount)
    }

    await session.commitTransaction()
    session.endSession()

    createNotification({
      recipientId: member._id,
      recipientRole: 'member',
      title: 'Account settled',
      message: `Your account has been settled. Payout amount: ₹${payoutAmount.toLocaleString('en-IN')}. Thank you for being a member.`,
      type: 'info',
      relatedEntity: 'Settlement',
      relatedEntityId: settlementRecord._id,
    })

    return {
      member: {
        id: member._id,
        name: member.name,
        status: member.status,
        settledAt: member.settledAt,
      },
      settlement: settlementRecord,
    }
  } catch (error) {
    try { await session.abortTransaction() } catch {}
    try { session.endSession() } catch {}
    console.error('[settlementService] Settlement execution error:', error.message, error.stack)
    if (error instanceof ApiError) throw error
    throw new ApiError(500, 'Failed to process settlement. Please try again.')
  }
}

/**
 * List all settlements with optional filters.
 * @param {{ page?: number, limit?: number }} query
 * @returns {Promise<{ settlements: object[], pagination: object }>}
 */
async function listSettlements({ page = 1, limit = 50 } = {}) {
  const currentPage = Math.max(1, Number(page) || 1)
  const perPage = Math.min(100, Math.max(1, Number(limit) || 50))
  const skip = (currentPage - 1) * perPage

  const [docs, total] = await Promise.all([
    Settlement.find()
      .populate('memberId', 'name email mobile')
      .populate('settledBy', 'name email')
      .sort({ settledAt: -1 })
      .skip(skip)
      .limit(perPage),
    Settlement.countDocuments(),
  ])

  return {
    settlements: docs.map((s) => ({
      id: s._id,
      member: s.memberId
        ? { id: s.memberId._id, name: s.memberId.name, email: s.memberId.email, mobile: s.memberId.mobile }
        : null,
      totalContributions: s.totalContributions,
      remainingLoan: s.remainingLoan,
      netAmount: s.netAmount,
      direction: s.direction,
      settledAt: s.settledAt,
      settledBy: s.settledBy ? { id: s.settledBy._id, name: s.settledBy.name } : null,
    })),
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.ceil(total / perPage) || 1,
    },
  }
}

module.exports = {
  calculateSettlementPreview,
  executeSettlement,
  listSettlements,
}