const { Resend } = require('resend')

/**
 * Lazily initialised Resend client. Creating the instance at the top level
 * would crash the whole app on boot when RESEND_API_KEY is not set, so we
 * defer construction until the first email is actually sent.
 */
let _resend = null
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('Missing API key. Pass it to the constructor `new Resend("re_123")`')
    }
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

const sendEmail = async (options) => {
  try {
    const FROM_EMAIL = process.env.FROM_EMAIL
    const FROM_NAME = process.env.FROM_NAME || 'Maqasid Bank'

    if (!FROM_EMAIL) {
      throw new Error('FROM_EMAIL is not configured.')
    }

    const resend = getResend()

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
