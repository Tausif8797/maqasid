const mongoose = require('mongoose')
const Loan = require('../models/Loan')
const LoanRepayment = require('../models/LoanRepayment')
const ApiError = require('../utils/ApiError')
const { logAudit } = require('../utils/auditLogger')
const { createNotification } = require('../utils/notificationHelper')

/**
 * Recalculate remaining balance for a loan based on standalone LoanRepayment docs.
 * @param {string} loanId
 * @returns {Promise<object>} Updated loan document
 */
async function recalculateRemaining(loanId) {
  const result = await LoanRepayment.aggregate([
    { $match: { loanId: new mongoose.Types.ObjectId(loanId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  const sum = result[0]?.total || 0
  const loan = await Loan.findById(loanId)
  if (!loan) throw new ApiError(404, 'Loan not found')

  loan.remaining = Math.max(0, loan.amount - sum)
  if (loan.remaining === 0) {
    loan.status = 'paid'
  }
  await loan.save()

  return loan
}

/**
 * Create a new loan repayment.
 * @param {string} loanId
 * @param {object} data - { amount, date, notes }
 * @param {string} memberId
 * @returns {Promise<{ loan: object, repayment: object }>}
 */
async function createRepayment(loanId, data, memberId, meta = {}) {
  const loan = await Loan.findById(loanId)
  if (!loan) throw new ApiError(404, 'Loan not found')
  if (loan.status === 'paid') throw new ApiError(400, 'Loan is already paid')
  if (loan.status === 'defaulted') throw new ApiError(400, 'Cannot repay a defaulted loan')

  const repaymentAmount = Number(data.amount)
  if (isNaN(repaymentAmount) || repaymentAmount <= 0) {
    throw new ApiError(400, 'Invalid repayment amount')
  }
  if (repaymentAmount > loan.remaining) {
    throw new ApiError(400, `Repayment amount exceeds remaining balance (${loan.remaining})`)
  }

  const repaymentDate = new Date(data.date)
  if (isNaN(repaymentDate.getTime())) {
    throw new ApiError(400, 'Invalid repayment date')
  }

  const recipientId = memberId || loan.memberId

  let repayment
  try {
    repayment = await LoanRepayment.create({
      loanId: loan._id,
      memberId: recipientId,
      amount: repaymentAmount,
      date: repaymentDate,
      notes: data.notes?.trim() || '',
    })

    loan.repayments.push({
      amount: repaymentAmount,
      date: repaymentDate,
      notes: data.notes?.trim() || '',
    })
    await loan.save()
  } catch (error) {
    if (repayment) {
      await LoanRepayment.findByIdAndDelete(repayment._id)
    }
    throw new ApiError(500, 'Failed to record repayment. Please try again.')
  }

  const updatedLoan = await recalculateRemaining(loanId)

  logAudit(meta, {
    action: 'REPAYMENT_RECORDED',
    entity: 'LoanRepayment',
    entityId: repayment._id,
    description: `Loan repayment of ${repaymentAmount} recorded`,
    metadata: { loanId },
  })

  createNotification({
    recipientId,
    recipientRole: 'member',
    title: 'Loan repayment recorded',
    message: `Your loan repayment of ₹${repaymentAmount.toLocaleString('en-IN')} has been recorded.`,
    type: 'success',
    relatedEntity: 'LoanRepayment',
    relatedEntityId: repayment._id,
  })

  return {
    loan: {
      id: updatedLoan._id,
      remaining: updatedLoan.remaining,
      status: updatedLoan.status,
    },
    repayment: {
      id: repayment._id,
      loanId: repayment.loanId,
      memberId: repayment.memberId,
      amount: repayment.amount,
      date: repayment.date,
      notes: repayment.notes,
    },
  }
}

/**
 * List repayments with optional filters.
 * @param {{ loanId?: string, memberId?: string, page?: number, limit?: number }} query
 * @returns {Promise<{ repayments: object[], pagination: object }>}
 */
async function listRepayments({ loanId, memberId, page = 1, limit = 50 } = {}) {
  const filter = {}
  if (loanId) filter.loanId = loanId
  if (memberId) filter.memberId = memberId

  const currentPage = Math.max(1, Number(page) || 1)
  const perPage = Math.min(100, Math.max(1, Number(limit) || 50))
  const skip = (currentPage - 1) * perPage

  const [repayments, total] = await Promise.all([
    LoanRepayment.find(filter).sort({ date: -1 }).skip(skip).limit(perPage),
    LoanRepayment.countDocuments(filter),
  ])

  return {
    repayments: repayments.map((r) => ({
      id: r._id,
      loanId: r.loanId,
      memberId: r.memberId,
      amount: r.amount,
      date: r.date,
      notes: r.notes,
    })),
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.ceil(total / perPage) || 1,
    },
  }
}

/**
 * Get repayment by ID.
 * @param {string} id
 * @returns {Promise<object>}
 */
async function getRepaymentById(id) {
  const repayment = await LoanRepayment.findById(id)
  if (!repayment) throw new ApiError(404, 'Repayment not found')

  return {
    id: repayment._id,
    loanId: repayment.loanId,
    memberId: repayment.memberId,
    amount: repayment.amount,
    date: repayment.date,
    notes: repayment.notes,
  }
}

/**
 * Update a repayment.
 * @param {string} id
 * @param {object} data - { amount, date, notes }
 * @returns {Promise<object>}
 */
async function updateRepayment(id, data) {
  const repayment = await LoanRepayment.findById(id)
  if (!repayment) throw new ApiError(404, 'Repayment not found')

  const loan = await Loan.findById(repayment.loanId)
  if (!loan) throw new ApiError(404, 'Loan not found')

  const updates = {}
  if (data.amount !== undefined) {
    const newAmount = Number(data.amount)
    if (isNaN(newAmount) || newAmount <= 0) {
      throw new ApiError(400, 'Invalid repayment amount')
    }

    const currentSum = await LoanRepayment.aggregate([
      { $match: { loanId: repayment.loanId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    const existingSum = currentSum[0]?.total || 0
    const prospectiveTotal = existingSum - repayment.amount + newAmount

    if (prospectiveTotal > loan.amount) {
      throw new ApiError(400, `Updated repayment amount would exceed loan principal (${loan.amount})`)
    }

    updates.amount = newAmount
  }
  if (data.date !== undefined) {
    const newDate = new Date(data.date)
    if (isNaN(newDate.getTime())) {
      throw new ApiError(400, 'Invalid repayment date')
    }
    updates.date = newDate
  }
  if (data.notes !== undefined) {
    updates.notes = data.notes.trim()
  }

  Object.assign(repayment, updates)
  await repayment.save()

  const updatedLoan = await recalculateRemaining(repayment.loanId)

  return {
    id: repayment._id,
    loanId: repayment.loanId,
    memberId: repayment.memberId,
    amount: repayment.amount,
    date: repayment.date,
    notes: repayment.notes,
    loan: {
      id: updatedLoan._id,
      remaining: updatedLoan.remaining,
      status: updatedLoan.status,
    },
  }
}

/**
 * Delete a repayment.
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteRepayment(id) {
  const repayment = await LoanRepayment.findById(id)
  if (!repayment) throw new ApiError(404, 'Repayment not found')

  const loanId = repayment.loanId
  await LoanRepayment.findByIdAndDelete(id)

  const updatedLoan = await recalculateRemaining(loanId)

  if (updatedLoan.remaining > 0) {
    updatedLoan.status = 'active'
    await updatedLoan.save()
  }
}

module.exports = {
  createRepayment,
  listRepayments,
  getRepaymentById,
  updateRepayment,
  deleteRepayment,
  recalculateRemaining,
}
