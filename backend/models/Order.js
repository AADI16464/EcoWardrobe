const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer_id: { type: String, required: true },
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  status: { type: String, enum: ['Pending Payment', 'Processing', 'Shipped', 'Delivered'], default: 'Pending Payment' },
  tracking_id: { type: String },
  delivery_address: { type: String },
  total_amount: { type: Number, default: 0 },
  razorpay_order_id: { type: String },
  razorpay_payment_id: { type: String },
  razorpay_signature: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
