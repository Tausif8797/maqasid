const express = require('express')
const router = express.Router()
const { previewContributionReminderController, sendContributionReminderController } = require('../controllers/notificationController')
const { protect } = require('../middleware/authMiddleware')

/**
 * @route   POST /api/notifications/preview-email
 * @desc    Preview contribution reminder email
 * @access  Private (Admin only)
 */
router.post('/preview-email', protect, previewContributionReminderController)

/**
 * @route   POST /api/notifications/send-email
 * @desc    Send contribution reminder email to a member
 * @access  Private (Admin only)
 */
router.post('/send-email', protect, sendContributionReminderController)

module.exports = router
