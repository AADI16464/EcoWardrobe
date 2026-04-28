const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const { protect: auth } = require('../middleware/auth');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { amount, item_ids } = req.body;
    
    const options = {
      amount: amount * 100, // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Save initial order in DB
    const newOrder = new Order({
      buyer_id: req.user.user_id,
      items: item_ids, // array of ObjectIds
      total_amount: amount,
      razorpay_order_id: order.id,
      status: 'Pending Payment'
    });
    await newOrder.save();

    res.json({ order, dbOrderId: newOrder._id, razorpayKey: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error('Razorpay create order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify Payment
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Payment is successful
      await Order.findByIdAndUpdate(dbOrderId, {
        status: 'Processing',
        razorpay_payment_id,
        razorpay_signature
      });
      res.json({ success: true, message: "Payment verified successfully" });
    } else {
      res.status(400).json({ error: "Invalid payment signature" });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

module.exports = router;
