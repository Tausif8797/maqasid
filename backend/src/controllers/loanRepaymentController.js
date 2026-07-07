const asyncHandler = require('../utils/asyncHandler')
const loanRepaymentService = require('../services/loanRepaymentService')
const { buildMeta } = require('../utils/buildMeta')

const createLoanRepayment = asyncHandler(async (req, res) => {
  const { loan, repayment } = await loanRepaymentService.createRepayment(
    req.body.loanId,
    req.body,
    req.body.memberId,
    buildMeta(req),
  )
  res.status(201).json({
    success: true,
    message: 'Repayment recorded successfully',
    data: { repayment, loan },
  })
})

const listAllLoanRepayments = asyncHandler(async (req, res) => {
  const result = await loanRepaymentService.listRepayments(req.query)
  res.status(200).json({
    success: true,
    data: result,
  })
})

const listLoanRepayments = asyncHandler(async (req, res) => {
  const result = await loanRepaymentService.listRepayments({
    loanId: req.params.loanId,
  })
  res.status(200).json({
    success: true,
    data: result,
  })
})

const getLoanRepayment = asyncHandler(async (req, res) => {
  const repayment = await loanRepaymentService.getRepaymentById(req.params.id)
  res.status(200).json({
    success: true,
    data: { repayment },
  })
})

const updateLoanRepayment = asyncHandler(async (req, res) => {
  const repayment = await loanRepaymentService.updateRepayment(req.params.id, req.body)
  res.status(200).json({
    success: true,
    message: 'Repayment updated successfully',
    data: { repayment },
  })
})

const deleteLoanRepayment = asyncHandler(async (req, res) => {
  await loanRepaymentService.deleteRepayment(req.params.id)
  res.status(200).json({
    success: true,
    message: 'Repayment deleted successfully',
    data: {},
  })
})

module.exports = {
  createLoanRepayment,
  listAllLoanRepayments,
  listLoanRepayments,
  getLoanRepayment,
  updateLoanRepayment,
  deleteLoanRepayment,
}
