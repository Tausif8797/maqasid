const mongoose = require('mongoose')

/**
 * Settlement record — tracks a member's final settlement when they exit.
 * One settlement per member, created at the time of exit.
 */
const settlementSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
      unique: true,
    },
    totalContributions: {
      type: Number,
      required: true,
      min: [0, 'Total contributions cannot be negative'],
    },
    remainingLoan: {
      type: Number,
      required: true,
      min: [0, 'Remaining loan cannot be negative'],
    },
    netAmount: {
      type: Number,
      required: true,
    },
    direction: {
      type: String,
      enum: ['pay_to_member', 'collect_from_member', 'zero'],
      required: true,
    },
    settledAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    settledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true },
)

module.exports = mongoose.model('Settlement', settlementSchema)