const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const ScoringConfig = sequelize.define('ScoringConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  config_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  config_value: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'scoring_config',
  timestamps: true,
  underscored: true
});

module.exports = ScoringConfig;
