const nodemailer = require('nodemailer')

const sendEmail = async (options) => {
  try {
    const {
      SMTP_HOST = process.env.SMTP_HOST,
      SMTP_PORT = process.env.SMTP_PORT,
      SMTP_USER = process.env.SMTP_USER,
      SMTP_PASS = process.env.SMTP_PASS,
      FROM_EMAIL = process.env.FROM_EMAIL,
      FROM_NAME = process.env.FROM_NAME || 'Maqasid Bank',
    } = process.env

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !FROM_EMAIL) {
      throw new Error('Email configuration is incomplete. Please check environment variables.')
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })

    const info = await transporter.sendMail({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })

    return info
  } catch (err) {
    console.error('[emailService] Failed to send email:', err.message)
    throw err
  }
}

module.exports = { sendEmail }