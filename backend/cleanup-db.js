// Cleanup script - deletes all data except admin accounts
const mongoose = require('mongoose')
const connectDB = require('./src/config/db')

async function cleanup() {
  await connectDB()

  try {
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray()
    
    console.log('🗑️  Deleting all data except admin accounts...\n')
    
    for (const collection of collections) {
      // Preserve Admin collection
      if (collection.name === 'admins') {
        console.log(`⏭️  ${collection.name}: Preserved (admin accounts)`)
        continue
      }
      
      const result = await mongoose.connection.db.collection(collection.name).deleteMany({})
      console.log(`✓ ${collection.name}: Deleted ${result.deletedCount} documents`)
    }

    console.log('\n✅ Database cleaned successfully!')
    console.log('📝 Admin accounts preserved. All other data has been deleted.')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from database')
  }
}

cleanup()
