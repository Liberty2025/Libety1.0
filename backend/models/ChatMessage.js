const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const Chat = require('./Chat');
const ServiceRequest = require('./ServiceRequest');
const User = require('./User');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  chatId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'chat_id',
    references: {
      model: Chat,
      key: 'id'
    }
  },
  serviceRequestId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'service_request_id',
    references: {
      model: ServiceRequest,
      key: 'id'
    }
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'sender_id',
    references: {
      model: User,
      key: 'id'
    }
  },
  senderType: {
    type: DataTypes.ENUM('client', 'demenageur'),
    allowNull: false,
    field: 'sender_type'
  },
  content: {
    type: DataTypes.STRING(1000),
    allowNull: false
  },
  messageType: {
    type: DataTypes.ENUM('text', 'image', 'file', 'system'),
    defaultValue: 'text',
    field: 'message_type'
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'read'),
    defaultValue: 'sent'
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'read_at'
  },
  replyTo: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reply_to',
    references: {
      model: 'chat_messages',
      key: 'id'
    }
  }
}, {
  tableName: 'chat_messages',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['chat_id', 'created_at'] },
    { fields: ['service_request_id'] },
    { fields: ['sender_id'] }
  ]
});

ChatMessage.belongsTo(Chat, { foreignKey: 'chatId' });
ChatMessage.belongsTo(ServiceRequest, { foreignKey: 'serviceRequestId' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
ChatMessage.belongsTo(ChatMessage, { foreignKey: 'replyTo', as: 'replyToMessage' });

module.exports = ChatMessage;
