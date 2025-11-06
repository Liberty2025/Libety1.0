const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');

const Reservation = sequelize.define('Reservation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  demenageur_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  date_reservation: {
    type: DataTypes.DATE,
    allowNull: false
  },
  adresse_depart: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  adresse_arrivee: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  volume_m3: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  special_requirements: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('en_attente', 'confirme', 'en_cours', 'termine', 'annule'),
    defaultValue: 'en_attente'
  }
}, {
  tableName: 'reservations',
  timestamps: true,
  underscored: true
});

Reservation.belongsTo(User, { foreignKey: 'client_id', as: 'client' });
Reservation.belongsTo(User, { foreignKey: 'demenageur_id', as: 'demenageur' });

module.exports = Reservation;
