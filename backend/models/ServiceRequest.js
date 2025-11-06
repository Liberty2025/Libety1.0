const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');

const ServiceRequest = sequelize.define('ServiceRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  serviceType: {
    type: DataTypes.ENUM('demenagement', 'transport'),
    allowNull: false,
    field: 'service_type'
  },
  departureAddress: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'departure_address'
  },
  destinationAddress: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'destination_address'
  },
  serviceDetails: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'service_details',
    defaultValue: {}
  },
  scheduledDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'scheduled_date'
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  actualPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'actual_price'
  },
  proposedPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'proposed_price'
  },
  priceNegotiation: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'price_negotiation'
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  viewedByDemenageur: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'viewed_by_demenageur'
  }
}, {
  tableName: 'service_requests',
  timestamps: true,
  underscored: true
});

ServiceRequest.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
ServiceRequest.belongsTo(User, { foreignKey: 'demenageurId', as: 'demenageur' });

module.exports = ServiceRequest;
