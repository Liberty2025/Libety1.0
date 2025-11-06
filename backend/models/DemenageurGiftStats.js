const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');

const DemenageurGiftStats = sequelize.define('DemenageurGiftStats', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  demenageur_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  current_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  total_gifts_received: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  last_gift_received_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'demenageur_gift_stats',
  timestamps: true,
  underscored: true
});

DemenageurGiftStats.belongsTo(User, { foreignKey: 'demenageur_id' });

module.exports = DemenageurGiftStats;
