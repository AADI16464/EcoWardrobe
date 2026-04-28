const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  user_id: { type: String, required: true },
  pdf_url: { type: String },
  qr_code: { type: String },
  donor_name: { type: String },
  ngo_name: { type: String },
  impact_metrics: {
    co2_saved: Number,
    beneficiaries: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);
