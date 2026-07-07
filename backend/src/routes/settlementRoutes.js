const express = require('express')
const {
  previewSettlement,
  executeSettlement,
  listSettlements,
} = require('../controllers/settlementController')
const { protect, authorize } = require('../middleware/authMiddleware')

const router = express.Router()

// All settlement routes require an authenticated admin.
router.use(protect, authorize('admin'))

// GET /api/settlements
router.get('/', listSettlements)

// GET /api/settlements/:memberId/preview
router.get('/:memberId/preview', previewSettlement)

// POST /api/settlements/:memberId/execute
router.post('/:memberId/execute', executeSettlement)

module.exports = router