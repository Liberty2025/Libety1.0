const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./User');

const MoverProfile = sequelize.define('MoverProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  experience_years: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  services_offered: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  equipment_available: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  insurance_coverage: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  license_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 5
    }
  },
  total_reviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'mover_profiles',
  timestamps: true,
  underscored: true
});

MoverProfile.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(MoverProfile, { foreignKey: 'user_id' });

module.exports = MoverProfile;
