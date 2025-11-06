const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');
const Reservation = require('./Reservation');

const DemenageurEvaluation = sequelize.define('DemenageurEvaluation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  demenageur_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  reservation_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Reservation,
      key: 'id'
    }
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'demenageur_evaluations',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['demenageur_id', 'client_id', 'reservation_id']
    }
  ]
});

DemenageurEvaluation.belongsTo(User, { foreignKey: 'demenageur_id', as: 'demenageur' });
DemenageurEvaluation.belongsTo(User, { foreignKey: 'client_id', as: 'client' });
DemenageurEvaluation.belongsTo(Reservation, { foreignKey: 'reservation_id' });

module.exports = DemenageurEvaluation;
