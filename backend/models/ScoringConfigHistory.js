const mongoose = require('mongoose');

const scoringConfigHistorySchema = new mongoose.Schema({
  config_key: {
    type: String,
    required: true,
    maxlength: 100
  },
  old_value: {
    type: String
  },
  new_value: {
    type: String,
    required: true
  },
  changed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  change_reason: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ScoringConfigHistory', scoringConfigHistorySchema);
