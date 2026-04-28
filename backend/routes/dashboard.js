const express = require('express');
const router  = express.Router();
const Item    = require('../models/Item');
const Order   = require('../models/Order');
const Certificate = require('../models/Certificate');
const Passport    = require('../models/Passport');
const { protect } = require('../middleware/auth');

// All dashboard routes require authentication
router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/summary
// ─────────────────────────────────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    // Always use authenticated user's ID (ignore query param for security)
    const user_id = req.user.user_id;
    console.log(`[Dashboard Summary] user_id=${user_id}`);

    // Run all DB queries in parallel for performance
    const [items, orders, impactAgg] = await Promise.all([
      Item.find({ user_id }),
      Order.find({ buyer_id: user_id }),
      // MongoDB aggregation for accurate impact sums
      Item.aggregate([
        { $match: { user_id } },
        {
          $group: {
            _id:           null,
            co2_saved:     { $sum: '$impact.co2_saved' },
            beneficiaries: { $sum: '$impact.beneficiaries' },
          },
        },
      ]),
    ]);

    // Prefer predicted_price (ML) for earnings, fallback to price
    const total_earnings  = items
      .filter(i => i.status === 'sold')
      .reduce((sum, i) => sum + (i.predicted_price || i.price || 0), 0);

    const co2_saved       = impactAgg[0]?.co2_saved     || 0;
    const beneficiaries   = impactAgg[0]?.beneficiaries || 0;
    const items_sold      = items.filter(i => i.status === 'sold').length;
    const items_donated   = items.filter(i => i.status === 'donated').length;
    const items_listed    = items.filter(i => i.status === 'listed').length;
    const items_refurb    = items.filter(i => i.status === 'refurbishing').length;
    const items_purchased = orders.reduce((sum, o) => sum + (o.items?.length || 0), 0);

    res.json({
      success: true,
      summary: {
        total_earnings,
        co2_saved:          Math.round(co2_saved * 10) / 10,
        beneficiaries,
        items_sold,
        items_donated,
        items_listed,
        items_refurbishing: items_refurb,
        items_purchased,
        total_items:        items.length,
      },
    });
  } catch (err) {
    console.error('Dashboard Summary Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/items
// ─────────────────────────────────────────────────────────────────────────────
router.get('/items', async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { status } = req.query; // optional filter
    const filter = { user_id };
    if (status && status !== 'all') filter.status = status;

    const items = await Item.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (err) {
    console.error('Dashboard Items Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/orders
// ─────────────────────────────────────────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const orders  = await Order.find({ buyer_id: user_id })
      .populate('items')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Dashboard Orders Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/impact
// ─────────────────────────────────────────────────────────────────────────────
router.get('/impact', async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // Parallel: fetch all items + MongoDB impact aggregation
    const [allItems, impactAgg] = await Promise.all([
      Item.find({ user_id }),
      Item.aggregate([
        { $match: { user_id } },
        {
          $group: {
            _id:           null,
            co2_saved:     { $sum: '$impact.co2_saved' },
            beneficiaries: { $sum: '$impact.beneficiaries' },
          },
        },
      ]),
    ]);

    const donatedItems  = allItems.filter(i => i.status === 'donated');
    const totalCo2      = impactAgg[0]?.co2_saved     || 0;
    const beneficiaries = impactAgg[0]?.beneficiaries || 0;

    const proofs = donatedItems.map(item => ({
      item_id:          item._id,
      brand:            item.brand || item.name,
      category:         item.category,
      decision:         item.decision,
      predicted_price:  item.predicted_price || item.price || 0,
      sell_probability: item.sell_probability || 0,
      repair_cost:      item.repair_cost      || 0,
      co2_saved:        item.impact?.co2_saved || 0,
      beneficiaries:    item.impact?.beneficiaries || 0,
      media_url:        item.impact?.media_url || 'https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?w=500&q=80',
      location:         item.impact?.location  || 'Hope NGO, New Delhi',
      timestamp:        item.updatedAt,
      description:      item.impact?.description || 'Item actively being used by beneficiaries.',
    }));

    res.json({
      success: true,
      impact: {
        co2_saved:         Math.round(totalCo2 * 10) / 10,
        waste_diverted_kg: Math.round(totalCo2 * 0.4 * 10) / 10,
        beneficiaries,
        schools_supported: Math.max(0, Math.ceil(donatedItems.length / 2)),
        proofs,
      },
    });
  } catch (err) {
    console.error('Dashboard Impact Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/passport/:item_id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/passport/:item_id', async (req, res) => {
  try {
    const { item_id } = req.params;
    let passport = await Passport.findOne({ item_id });

    if (!passport) {
      const item = await Item.findById(item_id);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      // Ensure user owns the item
      if (item.user_id !== req.user.user_id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const events = [
        {
          stage:    'Uploaded',
          timestamp: item.createdAt,
          metadata: 'Item listed by user',
        },
        {
          stage:    'AI Analyzed',
          timestamp: new Date(item.createdAt.getTime() + 2000),
          metadata: `Decision: ${item.decision} | Condition: ${item.condition_label} (${Math.round((item.condition_score || 0) * 100)}%)`,
        },
      ];

      if (item.status === 'donated') {
        events.push({
          stage: 'Donated',
          timestamp: new Date(item.createdAt.getTime() + 10000),
          metadata: 'Sent to partner NGO',
        });
      } else if (item.status === 'refurbishing') {
        events.push({
          stage: 'Refurbishment Started',
          timestamp: new Date(item.createdAt.getTime() + 10000),
          metadata: 'Sent to refurbishment partner',
        });
      } else if (item.status === 'sold') {
        events.push({
          stage:    'Sold',
          timestamp: item.updatedAt,
          metadata: `Sold for ₹${item.price}`,
        });
      } else {
        events.push({
          stage:    'Listed',
          timestamp: new Date(item.createdAt.getTime() + 5000),
          metadata: 'Available on marketplace',
        });
      }

      passport = await Passport.create({
        item_id,
        events,
        impact: {
          co2_saved:    item.impact?.co2_saved || item.co2_saved || 0,
          beneficiaries: item.impact?.beneficiaries || (item.decision === 'donate' ? 1 : 0),
        },
      });
    }

    const item = await Item.findById(item_id);
    res.json({ success: true, passport, item });
  } catch (err) {
    console.error('Passport Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/certificates
// ─────────────────────────────────────────────────────────────────────────────
router.get('/certificates', async (req, res) => {
  try {
    const user_id = req.user.user_id;

    let certificates = await Certificate.find({ user_id })
      .populate('item_id')
      .sort({ createdAt: -1 });

    // Auto-generate certificates for donated items that don't have one yet
    const donatedItems  = await Item.find({ user_id, status: 'donated' });
    const certItemIds   = certificates.map(c => c.item_id?._id?.toString());

    const newCerts = donatedItems
      .filter(item => !certItemIds.includes(item._id.toString()))
      .map(item => ({
        item_id:    item._id,
        user_id,
        pdf_url:    '#',
        qr_code:    'ECO-CERT-' + item._id.toString().slice(-8).toUpperCase(),
        donor_name: 'EcoWardrobe User',
        ngo_name:   item.impact?.location || 'Hope Foundation NGO',
        impact_metrics: {
          co2_saved:    item.impact?.co2_saved || item.co2_saved || 0,
          beneficiaries: item.impact?.beneficiaries || 1,
        },
      }));

    if (newCerts.length > 0) {
      await Certificate.insertMany(newCerts);
      certificates = await Certificate.find({ user_id })
        .populate('item_id')
        .sort({ createdAt: -1 });
    }

    res.json({ success: true, certificates });
  } catch (err) {
    console.error('Certificates Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
