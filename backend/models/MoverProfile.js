const mongoose = require('mongoose');

const moverProfileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  company_name: {
    type: String,
    maxlength: 255
  },
  description: {
    type: String
  },
  experience_years: {
    type: Number,
    min: 0
  },
  services_offered: [{
    type: String
  }],
  equipment_available: [{
    type: String
  }],
  insurance_coverage: {
    type: Boolean,
    default: false
  },
  license_number: {
    type: String,
    maxlength: 100
  },
  rating: {
    type: Number,
    default: 0.00,
    min: 0,
    max: 5
  },
  total_reviews: {
    type: Number,
    default: 0,
    min: 0
  },
  is_verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MoverProfile', moverProfileSchema);
