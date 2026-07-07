const mongoose = require('mongoose')
const Member = require('../models/Member')
const Contribution = require('../models/Contribution')
const Loan = require('../models/Loan')
const Settlement = require('../models/Settlement')
const ApiError = require('../utils/ApiError')
const { logAudit } = require('../utils/auditLogger')
const { createNotification } = require('../utils/notificationHelper')

/**
 * Calculate the settlement amount for a member.
 * @param {string} memberId
 * @returns {Promise<{ totalContributions: number, remainingLoan: number, netAmount: number, direction: string }>}
 */
async function calculateSettlement(memberId) {
  const member = await Member.findOne({ _id: memberId, isDeleted: false })
  if (!member) throw new ApiError(404, 'Member not found')
  if (member.status === 'Exited') throw new ApiError(400, 'Member has already been settled')

  const [contributionResult, loanResult] = await Promise.all([
    Contribution.aggregate([
      { $match: { memberId: new mongoose.Types.ObjectId(memberId), status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Loan.aggregate([
      { $match: { memberId: new mongoose.Types.ObjectId(memberId), status: 'active' } },
      { $group: { _id: null, total: { $sum: '$remaining' } } },
    ]),
  ])

  const totalContributions = Math.round((contributionResult[0]?.total || 0) * 100) / 100
  const remainingLoan = Math.round((loanResult[0]?.total || 0) * 100) / 100
  const netAmount = Math.round((totalContributions - remainingLoan) * 100) / 100

  let direction
  if (netAmount > 0) direction = 'pay_to_member'
  else if (netAmount < 0) direction = 'collect_from_member'
  else direction = 'zero'

  return { totalContributions, remainingLoan, netAmount, direction }
}

/**
 * Execute a member settlement — close loans, update member, create settlement record.
 * @param {string} memberId
 * @param {{ notes?: string }} data
 * @param {object} meta - { adminId, ip, userAgent }
 * @returns {Promise<object>}
 */
async function executeSettlement(memberId, data, meta = {}) {
  const member = await Member.findOne({ _id: memberId, isDeleted: false })
  if (!member) throw new ApiError(404, 'Member not found')
  if (member.status === 'Exited') throw new ApiError(400, 'Member has already been settled')
  if (!meta.performedBy) throw new ApiError(401, 'Admin authentication required')

  const settlement = await calculateSettlement(memberId)

  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    // Close all active loans
    await Loan.updateMany(
      { memberId: memberId, status: 'active' },
      { $set: { remaining: 0, status: 'paid', closedAt: new Date() } },
      { session },
    )

    // Update member status
    member.status = 'Exited'
    member.exitedAt = new Date()
    await member.save({ session })

    // Create settlement record
    const [settlementRecord] = await Settlement.create(
      [
        {
          memberId: member._id,
          totalContributions: settlement.totalContributions,
          remainingLoan: settlement.remainingLoan,
          netAmount: Math.abs(settlement.netAmount),
          direction: settlement.direction,
          notes: data.notes?.trim() || '',
          settledBy: meta.performedBy,
          settledAt: new Date(),
        },
      ],
      { session },
    )

    await session.commitTransaction()
    session.endSession()

    logAudit(meta, {
      action: 'MEMBER_SETTLED',
      entity: 'Settlement',
      entityId: settlementRecord._id,
      description: `Member ${member.name} settled. Net: ${settlement.direction === 'pay_to_member' ? 'Pay' : 'Collect'} ₹${Math.abs(settlement.netAmount).toLocaleString('en-IN')}`,
    })

    createNotification({
      recipientId: member._id,
      recipientRole: 'member',
      title: 'Account settled',
      message: `Your account has been settled. Final settlement amount: ₹${Math.abs(settlement.netAmount).toLocaleString('en-IN')}. Thank you for being a member.`,
      type: 'info',
      relatedEntity: 'Settlement',
      relatedEntityId: settlementRecord._id,
    })

    return {
      member: {
        id: member._id,
        name: member.name,
        status: member.status,
        exitedAt: member.exitedAt,
      },
      settlement: settlementRecord,
    }
  } catch (error) {
    try { await session.abortTransaction() } catch {}
    try { session.endSession() } catch {}
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
      notes: s.notes,
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

module.exports = { calculateSettlement, executeSettlement, listSettlements }