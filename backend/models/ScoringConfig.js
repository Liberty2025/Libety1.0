const mongoose = require('mongoose');

const scoringConfigSchema = new mongoose.Schema({
  config_key: {
    type: String,
    required: true,
    unique: true,
    maxlength: 100
  },
  config_value: {
    type: String,
    required: true
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ScoringConfig', scoringConfigSchema);
