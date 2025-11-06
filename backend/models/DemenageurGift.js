const mongoose = require('mongoose');

const demenageurGiftSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 255
  },
  description: {
    type: String
  },
  required_score: {
    type: Number,
    required: true,
    min: 0
  },
  gift_type: {
    type: String,
    required: true,
    maxlength: 50
  },
  value: {
    type: Number,
    min: 0
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DemenageurGift', demenageurGiftSchema);
