const mongoose = require('mongoose');

const demenageurGiftStatsSchema = new mongoose.Schema({
  demenageur_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  current_score: {
    type: Number,
    default: 0,
    min: 0
  },
  total_gifts_received: {
    type: Number,
    default: 0,
    min: 0
  },
  last_gift_received_at: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DemenageurGiftStats', demenageurGiftStatsSchema);
