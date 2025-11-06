const mongoose = require('mongoose');

const codePromoSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  },
  discount_type: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed'],
    maxlength: 20
  },
  discount_value: {
    type: Number,
    required: true,
    min: 0
  },
  valid_until: {
    type: Date
  },
  max_usage: {
    type: Number
  },
  current_usage: {
    type: Number,
    default: 0
  },
  description: {
    type: String
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CodePromo', codePromoSchema);
