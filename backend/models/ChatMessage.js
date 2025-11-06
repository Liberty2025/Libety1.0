const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  // Référence vers le chat
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  
  // Référence vers la demande de service
  serviceRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest',
    required: true
  },
  
  // Expéditeur du message
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Type d'expéditeur
  senderType: {
    type: String,
    enum: ['client', 'demenageur'],
    required: true
  },
  
  // Contenu du message
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Type de message
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  
  // Statut du message
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  // Message lu par le destinataire
  readAt: {
    type: Date
  },
  
  // Référence vers un message cité (pour les réponses)
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
chatMessageSchema.index({ chatId: 1, createdAt: -1 });
chatMessageSchema.index({ serviceRequestId: 1 });
chatMessageSchema.index({ senderId: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
