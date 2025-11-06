const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true,
    maxlength: 100
  },
  last_name: {
    type: String,
    required: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    maxlength: 255
  },
  phone: {
    type: String,
    maxlength: 20
  },
  password: {
    type: String,
    required: true,
    maxlength: 255
  },
  role: {
    type: String,
    required: true,
    enum: ['client', 'demenageur', 'admin'],
    maxlength: 20
  },
  identityCardNumber: {
    type: String,
    unique: true,
    sparse: true,
    maxlength: 20
  },
  documents: {
    drivingLicense: {
      front: String,
      back: String
    },
    vehicleRegistration: {
      front: String,
      back: String
    },
    identityCard: {
      front: String,
      back: String
    }
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  siret: {
    type: String,
    maxlength: 20
  },
  insurance_attestations: {
    type: String
  },
  permits: {
    type: String
  },
  address: {
    type: String
  },
  latitude: {
    type: Number,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    min: -180,
    max: 180
  },
  status: {
    type: String,
    enum: ['available', 'inactive', 'suspended', 'banned'],
    default: 'available',
    maxlength: 20
  },
  is_admin: {
    type: Boolean,
    default: false
  },
  banned_at: {
    type: Date
  },
  ban_reason: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
