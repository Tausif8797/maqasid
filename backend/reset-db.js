// Reset script - deletes all data EXCEPT the admin account
const mongoose = require('mongoose')
const connectDB = require('./src/config/db')

async function reset() {
  await connectDB()

  try {
    // Collections to completely clear
    const collectionsToClear = [
      'members',
      'contributions',
      'loans',
      'loanrepayments',
      'notifications',
      'auditlogs',
      'contributionsettings',
    ]

    console.log('🗑️  Deleting all data except admin accounts...\n')

    for (const name of collectionsToClear) {
      const result = await mongoose.connection.db.collection(name).deleteMany({})
      console.log(`✓ ${name}: Deleted ${result.deletedCount} documents`)
    }

    // Verify admin still exists
    const adminCount = await mongoose.connection.db.collection('admins').countDocuments({})
    console.log(`\n👤 Admin accounts preserved: ${adminCount}`)

    if (adminCount > 0) {
      const admin = await mongoose.connection.db.collection('admins').findOne({}, { projection: { email: 1, name: 1 } })
      console.log(`   Admin: ${admin.name} (${admin.email})`)
    }

    console.log('\n✅ Database reset successfully!')
    console.log('📝 Admin login credentials are preserved.')
    console.log('📝 You can now test from scratch for both admin and member.')

  } catch (error) {
    console.error('❌ Reset failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from database')
  }
}

reset()