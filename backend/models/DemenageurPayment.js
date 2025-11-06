const mongoose = require('mongoose');

const demenageurPaymentSchema = new mongoose.Schema({
  demenageur_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reservation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  payment_method: {
    type: String,
    maxlength: 50
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
    maxlength: 20
  },
  payment_date: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DemenageurPayment', demenageurPaymentSchema);
