const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const CodePromo = sequelize.define('CodePromo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  discount_type: {
    type: DataTypes.ENUM('percentage', 'fixed'),
    allowNull: false
  },
  discount_value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  valid_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  max_usage: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  current_usage: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'codes_promo',
  timestamps: true,
  underscored: true
});

module.exports = CodePromo;
