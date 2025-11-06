const mongoose = require('mongoose');

const demenageurEvaluationSchema = new mongoose.Schema({
  demenageur_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reservation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String
  }
}, {
  timestamps: true
});

// Index unique pour éviter les doublons
demenageurEvaluationSchema.index({ demenageur_id: 1, client_id: 1, reservation_id: 1 }, { unique: true });

module.exports = mongoose.model('DemenageurEvaluation', demenageurEvaluationSchema);
