const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('client', 'demenageur', 'admin'),
    allowNull: false
  },
  carte_grise: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  carte_cin: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  permis: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  siret: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  insurance_attestations: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  permits: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    validate: {
      min: -90,
      max: 90
    }
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    validate: {
      min: -180,
      max: 180
    }
  },
  status: {
    type: DataTypes.ENUM('available', 'inactive', 'suspended', 'banned'),
    defaultValue: 'available'
  },
  is_admin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  banned_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ban_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

module.exports = User;
