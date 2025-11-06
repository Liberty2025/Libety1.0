const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  client_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    maxlength: 50
  },
  subject: {
    type: String,
    required: true,
    maxlength: 255
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    maxlength: 20
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    maxlength: 20
  },
  admin_response: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Ticket', ticketSchema);
