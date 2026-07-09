const Member = require('../models/Member')
const Contribution = require('../models/Contribution')
const Loan = require('../models/Loan')
const { sendEmail } = require('../utils/emailService')
const { createNotification } = require('../utils/notificationHelper')

/**
 * Send contribution reminder email to a member.
 *
 * @param {string} memberId - Member ID
 * @returns {Promise<object>} Result object with success status and message
 */
/**
 * Generate email preview content without sending.
 *
 * @param {string} memberId - Member ID
 * @returns {Promise<object>} Preview data with subject, html, and text
 */
const previewContributionReminder = async (memberId) => {
  try {
    // Fetch member details
    const member = await Member.findById(memberId).select('name email')
    if (!member) {
      return { success: false, message: 'Member not found' }
    }

    // Get current month in MMM YYYY format (e.g., "Jul 2026")
    const currentDate = new Date()
    const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    // Get current month in YYYY-MM format for database query
    const currentMonthForQuery = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    
    // Check for unpaid contribution for current month
    const unpaidContribution = await Contribution.findOne({
      memberId,
      month: currentMonthForQuery,
      status: 'unpaid',
    })

    // Check for paid contribution for current month
    const paidContribution = await Contribution.findOne({
      memberId,
      month: currentMonthForQuery,
      status: 'paid',
    })

    // For preview, show a sample amount if no unpaid contribution exists
    const contributionAmount = unpaidContribution ? unpaidContribution.amount : 0
    const hasUnpaidContribution = !!unpaidContribution
    const hasPaidContribution = !!paidContribution
    
    // Debug logging
    console.log('[Preview] MemberId:', memberId)
    console.log('[Preview] CurrentMonth:', currentMonth)
    console.log('[Preview] UnpaidContribution:', unpaidContribution)
    console.log('[Preview] HasUnpaid:', hasUnpaidContribution)

    // Check for active loans
    const activeLoans = await Loan.find({
      memberId,
      status: 'active',
    })

    // Debug logging
    console.log('[Preview] MemberId:', memberId)
    console.log('[Preview] CurrentMonth:', currentMonth)
    console.log('[Preview] UnpaidContribution:', unpaidContribution)
    console.log('[Preview] PaidContribution:', paidContribution)
    console.log('[Preview] HasUnpaid:', hasUnpaidContribution)
    console.log('[Preview] HasPaid:', hasPaidContribution)

    // Build email content
    const emailSubject = `Contribution Reminder - ${member.name}`
    let emailBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3563ff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
            .section { margin-bottom: 20px; padding: 15px; background-color: white; border-radius: 5px; }
            .section-title { font-weight: bold; color: #3563ff; margin-bottom: 10px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
            .info-label { color: #666; }
            .info-value { font-weight: bold; color: #333; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Maqasid Bank</h1>
            </div>
            <div class="content">
              <p>Dear ${member.name},</p>
              <p>This is a friendly reminder about your monthly contribution.</p>

              <div class="section">
                <div class="section-title">Contribution Details</div>
                <div class="info-row">
                  <span class="info-label">Month:</span>
                  <span class="info-value">${currentMonth}</span>
                </div>
                ${hasUnpaidContribution ? `
                <div class="info-row">
                  <span class="info-label">Amount:</span>
                  <span class="info-value">₹${contributionAmount}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value" style="color: #dc2626;">Unpaid</span>
                </div>
                ` : hasPaidContribution ? `
                <div class="info-row">
                  <span class="info-label">Amount:</span>
                  <span class="info-value" style="color: #16a34a;">Paid</span>
                </div>
                ` : `
                <div class="info-row">
                  <span class="info-label">Amount:</span>
                  <span class="info-value" style="color: #666;">(Sample amount - no unpaid contribution for current month)</span>
                </div>
                `}
              </div>
    `

    // Add loan details if active loans exist
    if (activeLoans.length > 0) {
      emailBody += `
              <div class="section">
                <div class="section-title">Active Loan Details</div>
      `

      activeLoans.forEach((loan, index) => {
        emailBody += `
                <div style="margin-bottom: ${index < activeLoans.length - 1 ? '15px' : '0'}; padding-bottom: ${index < activeLoans.length - 1 ? '15px' : '0'}; border-bottom: ${index < activeLoans.length - 1 ? '1px solid #e0e0e0' : 'none'};">
                  <div class="info-row">
                    <span class="info-label">Loan Amount:</span>
                    <span class="info-value">₹${loan.amount}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Remaining Balance:</span>
                    <span class="info-value" style="color: #dc2626;">₹${loan.remaining}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Issue Date:</span>
                    <span class="info-value">${new Date(loan.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  ${loan.dueDate ? `
                  <div class="info-row">
                    <span class="info-label">Due Date:</span>
                    <span class="info-value">${new Date(loan.dueDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  ` : ''}
                </div>
        `
      })

      emailBody += `
              </div>
      `
    }

    emailBody += `
              <p>Please make your payment at the earliest to avoid any inconvenience.</p>
              <p>If you have already made the payment, please ignore this reminder.</p>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Maqasid Bank. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    // Create plain text version
    const textBody = `
Dear ${member.name},

This is a friendly reminder about your monthly contribution.

Contribution Details:
- Month: ${currentMonth}
${hasUnpaidContribution ? `- Amount: ₹${contributionAmount}
- Status: Unpaid` : '- Amount: (Sample amount - no unpaid contribution for current month)'}

${activeLoans.length > 0 ? 'Active Loan Details:\n' + activeLoans.map(loan => 
  `- Loan Amount: ₹${loan.amount}\n- Remaining Balance: ₹${loan.remaining}\n- Issue Date: ${new Date(loan.issueDate).toLocaleDateString('en-IN')}${loan.dueDate ? `\n- Due Date: ${new Date(loan.dueDate).toLocaleDateString('en-IN')}` : ''}`
).join('\n\n') + '\n' : ''}

Please make your payment at the earliest to avoid any inconvenience.

If you have already made the payment, please ignore this reminder.

Regards,
Maqasid Bank
    `.trim()

    return {
      success: true,
      preview: {
        to: member.email,
        subject: emailSubject,
        html: emailBody,
        text: textBody,
        memberName: member.name,
        memberEmail: member.email,
        currentMonth,
        contributionAmount: contributionAmount,
        hasUnpaidContribution,
        hasActiveLoans: activeLoans.length > 0,
        loanCount: activeLoans.length,
        loans: activeLoans.map(loan => ({
          amount: loan.amount,
          remaining: loan.remaining,
          issueDate: loan.issueDate,
          dueDate: loan.dueDate,
        })),
      },
    }
  } catch (err) {
    console.error('[notificationService] Failed to preview contribution reminder:', err.message)
    return {
      success: false,
      message: err.message || 'Failed to generate email preview',
    }
  }
}

const sendContributionReminder = async (memberId) => {
  try {
    // Fetch member details
    const member = await Member.findById(memberId).select('name email')
    if (!member) {
      return { success: false, message: 'Member not found' }
    }

    // Get current month in YYYY-MM format
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

    // Check for unpaid contribution for current month
    const unpaidContribution = await Contribution.findOne({
      memberId,
      month: currentMonth,
      status: 'unpaid',
    })

    if (!unpaidContribution) {
      return { success: false, message: 'No unpaid contribution found for current month' }
    }

    // Check for active loans
    const activeLoans = await Loan.find({
      memberId,
      status: 'active',
    })

    // Build email content
    let emailSubject = `Contribution Reminder - ${member.name}`
    let emailBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3563ff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
            .section { margin-bottom: 20px; padding: 15px; background-color: white; border-radius: 5px; }
            .section-title { font-weight: bold; color: #3563ff; margin-bottom: 10px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
            .info-label { color: #666; }
            .info-value { font-weight: bold; color: #333; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Maqasid Bank</h1>
            </div>
            <div class="content">
              <p>Dear ${member.name},</p>
              <p>This is a friendly reminder about your monthly contribution.</p>

              <div class="section">
                <div class="section-title">Contribution Details</div>
                <div class="info-row">
                  <span class="info-label">Month:</span>
                  <span class="info-value">${currentMonth}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Amount:</span>
                  <span class="info-value">₹${unpaidContribution.amount}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value" style="color: #dc2626;">Unpaid</span>
                </div>
              </div>
    `

    // Add loan details if active loans exist
    if (activeLoans.length > 0) {
      emailBody += `
              <div class="section">
                <div class="section-title">Active Loan Details</div>
      `

      activeLoans.forEach((loan, index) => {
        emailBody += `
                <div style="margin-bottom: ${index < activeLoans.length - 1 ? '15px' : '0'}; padding-bottom: ${index < activeLoans.length - 1 ? '15px' : '0'}; border-bottom: ${index < activeLoans.length - 1 ? '1px solid #e0e0e0' : 'none'};">
                  <div class="info-row">
                    <span class="info-label">Loan Amount:</span>
                    <span class="info-value">₹${loan.amount}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Remaining Balance:</span>
                    <span class="info-value" style="color: #dc2626;">₹${loan.remaining}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Issue Date:</span>
                    <span class="info-value">${new Date(loan.issueDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  ${loan.dueDate ? `
                  <div class="info-row">
                    <span class="info-label">Due Date:</span>
                    <span class="info-value">${new Date(loan.dueDate).toLocaleDateString('en-IN')}</span>
                  </div>
                  ` : ''}
                </div>
        `
      })

      emailBody += `
              </div>
      `
    }

    emailBody += `
              <p>Please make your payment at the earliest to avoid any inconvenience.</p>
              <p>If you have already made the payment, please ignore this reminder.</p>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Maqasid Bank. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    // Create plain text version
    const textBody = `
Dear ${member.name},

This is a friendly reminder about your monthly contribution.

Contribution Details:
- Month: ${currentMonth}
- Amount: ₹${unpaidContribution.amount}
- Status: Unpaid

${activeLoans.length > 0 ? 'Active Loan Details:\n' + activeLoans.map(loan => 
  `- Loan Amount: ₹${loan.amount}\n- Remaining Balance: ₹${loan.remaining}\n- Issue Date: ${new Date(loan.issueDate).toLocaleDateString('en-IN')}${loan.dueDate ? `\n- Due Date: ${new Date(loan.dueDate).toLocaleDateString('en-IN')}` : ''}`
).join('\n\n') + '\n' : ''}

Please make your payment at the earliest to avoid any inconvenience.

If you have already made the payment, please ignore this reminder.

Regards,
Maqasid Bank
    `.trim()

    // Send email
    await sendEmail({
      to: member.email,
      subject: emailSubject,
      text: textBody,
      html: emailBody,
    })

    // Create in-app notification
    await createNotification({
      recipientId: memberId,
      recipientRole: 'member',
      title: 'Contribution Reminder Sent',
      message: `Email notification sent to ${member.email} for contribution reminder.`,
      type: 'info',
      relatedEntity: 'Contribution',
      relatedEntityId: unpaidContribution._id,
    })

    return {
      success: true,
      message: 'Email notification sent successfully',
      email: member.email,
      hasActiveLoans: activeLoans.length > 0,
      loanCount: activeLoans.length,
    }
  } catch (err) {
    console.error('[notificationService] Failed to send contribution reminder:', err.message)
    return {
      success: false,
      message: err.message || 'Failed to send email notification',
    }
  }
}

module.exports = {
  sendContributionReminder,
  previewContributionReminder,
}
