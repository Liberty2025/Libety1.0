const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');
const Reservation = require('./Reservation');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
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
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'payments',
  timestamps: true,
  underscored: true
});

Payment.belongsTo(User, { foreignKey: 'user_id' });
Payment.belongsTo(Reservation, { foreignKey: 'reservation_id' });

module.exports = Payment;
