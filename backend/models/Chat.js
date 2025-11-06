const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');
const ServiceRequest = require('./ServiceRequest');

const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  serviceRequestId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'service_request_id',
    references: {
      model: ServiceRequest,
      key: 'id'
    }
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'client_id',
    references: {
      model: User,
      key: 'id'
    }
  },
  demenageurId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'demenageur_id',
    references: {
      model: User,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'archived', 'closed'),
    defaultValue: 'active'
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_message_at'
  },
  unreadByClient: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'unread_by_client'
  },
  unreadByDemenageur: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'unread_by_demenageur'
  }
}, {
  tableName: 'chats',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['client_id', 'status'] },
    { fields: ['demenageur_id', 'status'] },
    { fields: ['service_request_id'] }
  ]
});

Chat.belongsTo(ServiceRequest, { foreignKey: 'serviceRequestId' });
Chat.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
Chat.belongsTo(User, { foreignKey: 'demenageurId', as: 'demenageur' });

module.exports = Chat;
