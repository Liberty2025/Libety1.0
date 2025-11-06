const mongoose = require('mongoose');

const demenageurSubscriptionSchema = new mongoose.Schema({
  demenageur_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription_type: {
    type: String,
    required: true,
    maxlength: 50
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'active',
    maxlength: 20
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date
  },
  payment_method: {
    type: String,
    maxlength: 50
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DemenageurSubscription', demenageurSubscriptionSchema);
