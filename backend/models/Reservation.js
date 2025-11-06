const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  demenageur_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  date_reservation: {
    type: Date,
    required: true
  },
  adresse_depart: {
    type: String,
    required: true
  },
  adresse_arrivee: {
    type: String,
    required: true
  },
  volume_m3: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String
  },
  special_requirements: {
    type: String
  },
  status: {
    type: String,
    enum: ['en_attente', 'confirme', 'en_cours', 'termine', 'annule'],
    default: 'en_attente',
    maxlength: 20
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Reservation', reservationSchema);
