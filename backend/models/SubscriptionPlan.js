const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  plan_id: {
    type: String,
    required: true,
    unique: true,
    maxlength: 50
  },
  name: {
    type: String,
    required: true,
    maxlength: 255
  },
  description: {
    type: String
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'EUR',
    maxlength: 3
  },
  billing_cycle: {
    type: String,
    required: true,
    enum: ['monthly', 'yearly'],
    maxlength: 20
  },
  features: {
    type: mongoose.Schema.Types.Mixed
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
