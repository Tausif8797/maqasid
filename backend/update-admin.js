// Update admin credentials script
const mongoose = require('mongoose')
const connectDB = require('./src/config/db')
const Admin = require('./src/models/Admin')

async function updateAdmin() {
  await connectDB()

  try {
    // Find the first admin account
    const admin = await Admin.findOne()
    if (!admin) {
      console.error('❌ No admin account found. Run create-admin.js first.')
      process.exitCode = 1
      return
    }

    admin.email = 'admin@maqasidbank.in'
    admin.password = 'Maqasid@2025'
    await admin.save()  // Triggers bcrypt hash via pre-save hook

    console.log('✅ Admin credentials updated successfully!')
    console.log('----------------------------------------')
    console.log('Email:    admin@maqasidbank.in')
    console.log('Password: Maqasid@2025')
    console.log('----------------------------------------')
  } catch (error) {
    console.error('❌ Failed to update admin:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from database')
  }
}

updateAdmin()