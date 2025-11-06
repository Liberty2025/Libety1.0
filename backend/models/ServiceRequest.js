const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  demenageurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceType: {
    type: String,
    enum: ['demenagement', 'transport'],
    required: true
  },
  departureAddress: {
    type: String,
    required: true
  },
  destinationAddress: {
    type: String,
    required: true
  },
  serviceDetails: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  actualPrice: {
    type: Number,
    default: null
  },
  // Négociation de prix
  proposedPrice: {
    type: Number,
    default: null
  },
  priceNegotiation: {
    demenageurPrice: {
      type: Number,
      default: null
    },
    clientPrice: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'negotiating'],
      default: null
    }
  },
  notes: {
    type: String,
    default: ''
  },
  // Champ pour suivre si la demande a été vue par le déménageur
  viewedByDemenageur: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware pour mettre à jour updatedAt
serviceRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
