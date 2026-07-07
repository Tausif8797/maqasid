// Create admin account script
const mongoose = require('mongoose')
const connectDB = require('./src/config/db')
const Admin = require('./src/models/Admin')

async function createAdmin() {
  await connectDB()

  try {
    const admin = await Admin.create({
      name: 'Admin',
      email: 'admin@admin.com',
      password: 'Admin@123',
      role: 'admin',
    })

    console.log('✅ Admin account created successfully!')
    console.log('----------------------------------------')
    console.log('Email:    admin@admin.com')
    console.log('Password: Admin@123')
    console.log('----------------------------------------')
    
  } catch (error) {
    console.error('❌ Failed to create admin:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from database')
  }
}

createAdmin()