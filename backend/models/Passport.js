const mongoose = require('mongoose');

const passportSchema = new mongoose.Schema({
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  events: [{
    stage: { type: String, required: true }, // e.g. "Uploaded", "AI Analyzed", "Donated", "Delivered"
    timestamp: { type: Date, default: Date.now },
    metadata: { type: String }
  }],
  impact: {
    co2_saved: { type: Number, default: 0 },
    beneficiaries: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Passport', passportSchema);
