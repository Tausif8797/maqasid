const asyncHandler = require('../utils/asyncHandler')
const settlementService = require('../services/settlementService')
const { buildMeta } = require('../utils/buildMeta')

/**
 * @desc    Preview settlement calculation for a member
 * @route   GET /api/settlements/:memberId/preview
 * @access  Private (admin)
 */
const previewSettlement = asyncHandler(async (req, res) => {
  const result = await settlementService.calculateSettlement(req.params.memberId)
  res.status(200).json({
    success: true,
    data: result,
  })
})

/**
 * @desc    Execute a member settlement
 * @route   POST /api/settlements/:memberId/execute
 * @access  Private (admin)
 */
const executeSettlement = asyncHandler(async (req, res) => {
  const meta = buildMeta(req)
  const result = await settlementService.executeSettlement(req.params.memberId, req.body, meta)
  res.status(200).json({
    success: true,
    message: 'Member settled successfully',
    data: result,
  })
})

/**
 * @desc    List all settlements
 * @route   GET /api/settlements
 * @access  Private (admin)
 */
const listSettlements = asyncHandler(async (req, res) => {
  const result = await settlementService.listSettlements(req.query)
  res.status(200).json({
    success: true,
    data: result,
  })
})

module.exports = { previewSettlement, executeSettlement, listSettlements }