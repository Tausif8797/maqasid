const { sendContributionReminder, previewContributionReminder } = require('../services/notificationService')

/**
 * Preview contribution reminder email.
 * POST /api/notifications/preview-email
 */
const previewContributionReminderController = async (req, res) => {
  try {
    const { memberId } = req.body

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required',
      })
    }

    const result = await previewContributionReminder(memberId)

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          preview: result.preview,
        },
      })
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
      })
    }
  } catch (err) {
    console.error('[notificationController] Preview error:', err.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to generate email preview',
      error: err.message,
    })
  }
}

/**
 * Send contribution reminder email to a member.
 * POST /api/notifications/send-email
 */
const sendContributionReminderController = async (req, res) => {
  try {
    const { memberId } = req.body

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required',
      })
    }

    const result = await sendContributionReminder(memberId)

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          message: result.message,
          email: result.email,
          hasActiveLoans: result.hasActiveLoans,
          loanCount: result.loanCount,
        },
      })
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
      })
    }
  } catch (err) {
    console.error('[notificationController] Error:', err.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to send email notification',
      error: err.message,
    })
  }
}

module.exports = {
  previewContributionReminderController,
  sendContributionReminderController,
}
