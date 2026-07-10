const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

const sendEmail = async (options) => {
  try {
    const FROM_EMAIL = process.env.FROM_EMAIL
    const FROM_NAME = process.env.FROM_NAME || 'Maqasid Bank'

    if (!process.env.RESEND_API_KEY) {
      throw new Error('Resend API key is missing. Please set RESEND_API_KEY environment variable.')
    }

    if (!FROM_EMAIL) {
      throw new Error('FROM_EMAIL is not configured.')
    }

    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })

    if (error) {
      throw new Error(error.message)
    }

    console.log('[emailService] Email sent successfully via Resend')
    return data
  } catch (err) {
    console.error('[emailService] Failed to send email:', err.message)
    throw err
  }
}

module.exports = { sendEmail }