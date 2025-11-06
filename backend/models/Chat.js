const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  // Référence vers la demande de service qui a créé ce chat
  serviceRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest',
    required: true,
    unique: true // Un chat par demande de service
  },
  
  // Participants du chat
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
  
  // Statut du chat
  status: {
    type: String,
    enum: ['active', 'archived', 'closed'],
    default: 'active'
  },
  
  // Dernière activité
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  
  // Messages non lus par client et déménageur
  unreadByClient: {
    type: Number,
    default: 0
  },
  
  unreadByDemenageur: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
chatSchema.index({ clientId: 1, status: 1 });
chatSchema.index({ demenageurId: 1, status: 1 });
chatSchema.index({ serviceRequestId: 1 });

module.exports = mongoose.model('Chat', chatSchema);
