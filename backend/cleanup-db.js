// Cleanup script - deletes all data from the database
const mongoose = require('mongoose')
const connectDB = require('./src/config/db')

async function cleanup() {
  await connectDB()

  try {
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray()
    
    console.log('🗑️  Deleting all data...\n')
    
    for (const collection of collections) {
      const result = await mongoose.connection.db.collection(collection.name).deleteMany({})
      console.log(`✓ ${collection.name}: Deleted ${result.deletedCount} documents`)
    }

    console.log('\n✅ Database cleaned successfully!')
    console.log('📝 Note: Admin and members need to be recreated via the app')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
    console.log('👋 Disconnected from database')
  }
}

cleanup()