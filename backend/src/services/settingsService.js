const mongoose = require('mongoose')
const ApiError = require('../utils/ApiError')
const { logAudit } = require('../utils/auditLogger')

/**
 * Cleanup database - delete all data except admin accounts.
 * @param {object} meta - { performedBy, performedByName, ipAddress, userAgent }
 * @returns {Promise<{ deletedCounts: object }>}
 */
async function cleanupDatabase(meta = {}) {
  const collections = await mongoose.connection.db.listCollections().toArray()
  
  const deletedCounts = {}
  
  for (const collection of collections) {
    // Preserve Admin collection
    if (collection.name === 'admins') {
      deletedCounts[collection.name] = 'preserved'
      continue
    }
    
    const result = await mongoose.connection.db.collection(collection.name).deleteMany({})
    deletedCounts[collection.name] = result.deletedCount
  }

  logAudit(meta, {
    action: 'DATABASE_CLEANUP',
    entity: 'Database',
    entityId: null,
    description: `Database cleaned. Preserved admins, deleted all other data.`,
  })

  return { deletedCounts }
}

module.exports = { cleanupDatabase }