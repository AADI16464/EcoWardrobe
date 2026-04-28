const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer_id: { type: String, required: true },
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  status: { type: String, enum: ['Processing', 'Shipped', 'Delivered'], default: 'Processing' },
  tracking_id: { type: String },
  delivery_address: { type: String },
  total_amount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
