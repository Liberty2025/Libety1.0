const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');

const DemenageurPaymentPreferences = sequelize.define('DemenageurPaymentPreferences', {
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
  preferred_method: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  bank_account: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  paypal_email: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'demenageur_payment_preferences',
  timestamps: true,
  underscored: true
});

DemenageurPaymentPreferences.belongsTo(User, { foreignKey: 'demenageur_id' });

module.exports = DemenageurPaymentPreferences;
