const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');

const ScoringConfigHistory = sequelize.define('ScoringConfigHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  config_key: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  old_value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  new_value: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  changed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  change_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'scoring_config_history',
  timestamps: true,
  underscored: true
});

ScoringConfigHistory.belongsTo(User, { foreignKey: 'changed_by' });

module.exports = ScoringConfigHistory;
