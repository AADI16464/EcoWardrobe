const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Item = require('../models/Item');
const User = require('../models/User');
const { protect: auth } = require('../middleware/auth');

// Simple admin middleware
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findOne({ user_id: req.user.user_id });
    if (user && user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Access denied. Admins only.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({ status: { $ne: 'Pending Payment' } });
    
    // Total revenue from successful orders
    const orders = await Order.find({ status: { $ne: 'Pending Payment' } });
    const totalRevenue = orders.reduce((acc, order) => acc + (order.total_amount || 0), 0);
    const platformProfit = totalRevenue * 0.10; // Assume 10% commission

    const totalDonations = await Item.countDocuments({ decision: 'donate', status: 'listed' });
    
    const soldItems = await Item.countDocuments({ status: 'sold' });
    
    const activeListings = await Item.countDocuments({ status: 'listed' });

    // Chart Data Mockup (Monthly Sales logic)
    const chartData = [
      { name: 'Jan', sales: Math.floor(Math.random() * 5000), donations: Math.floor(Math.random() * 50) },
      { name: 'Feb', sales: Math.floor(Math.random() * 5000), donations: Math.floor(Math.random() * 50) },
      { name: 'Mar', sales: Math.floor(Math.random() * 5000), donations: Math.floor(Math.random() * 50) },
      { name: 'Apr', sales: totalRevenue, donations: totalDonations }, // Current month real data
    ];

    res.json({
      totalOrders,
      totalRevenue,
      platformProfit,
      totalDonations,
      soldItems,
      activeListings,
      chartData
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

module.exports = router;
