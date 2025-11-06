const mongoose = require('mongoose');

const demenageurPaymentPreferencesSchema = new mongoose.Schema({
  demenageur_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  preferred_method: {
    type: String,
    maxlength: 50
  },
  bank_account: {
    type: String
  },
  paypal_email: {
    type: String,
    maxlength: 255
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DemenageurPaymentPreferences', demenageurPaymentPreferencesSchema);
