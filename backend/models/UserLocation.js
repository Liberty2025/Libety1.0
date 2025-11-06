const mongoose = require('mongoose');

const userLocationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lat: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  lng: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  address: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserLocation', userLocationSchema);
