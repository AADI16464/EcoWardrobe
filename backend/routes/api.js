const express    = require('express');
const router     = express.Router();
const Item       = require('../models/Item');
const User       = require('../models/User');
const Submission = require('../models/Submission');
const upload     = require('../middleware/upload');
const { protect }     = require('../middleware/auth');
const { analyzeItem } = require('../utils/aiLogic');
const { getPrediction } = require('../services/mlService');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build impact sub-doc from ML prediction result
// ─────────────────────────────────────────────────────────────────────────────
function buildImpact(prediction) {
  return {
    co2_saved:     prediction.impact?.co2_saved     || 0,
    beneficiaries: prediction.impact?.beneficiaries || 0,
    location:      prediction.decision === 'donate' ? 'Hope NGO, New Delhi' : '',
    description:   prediction.decision === 'donate'
      ? 'Item actively being used by beneficiaries.'
      : '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: merge ML prediction + AI analysis into a single item payload
// ─────────────────────────────────────────────────────────────────────────────
function buildItemPayload({ user_id, category, brand, description, score, age, qty, images, prediction, aiAnalysis }) {
  const statusMap  = { resell: 'listed', refurbish: 'refurbishing', donate: 'donated' };
  const impact     = buildImpact(prediction);

  return {
    user_id,
    name:             brand || category,
    category,
    brand:            brand || category,
    description:      description || '',
    age:              age || 0,
    quantity:         qty || 1,

    // Condition
    condition_score:  score,
    condition_label:  aiAnalysis.condition_label,

    // Pricing — prefer ML prediction
    base_price:       aiAnalysis.base_price,
    price:            prediction.predicted_price || aiAnalysis.price,
    predicted_price:  prediction.predicted_price || aiAnalysis.price,
    repair_cost:      prediction.repair_cost     || 0,

    // ML outputs
    sell_probability: prediction.sell_probability || 0,
    decision:         prediction.decision,
    prediction_source: prediction._source || 'fallback',

    // Lifecycle
    status:           statusMap[prediction.decision] || 'listed',
    images,

    // Impact
    co2_saved:        impact.co2_saved,
    impact,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/upload-items
// Upload single, bulk, or multi items with ML + AI analysis
// Requires: Authorization: Bearer <token>
// ─────────────────────────────────────────────────────────────────────────────
router.post('/upload-items', protect, upload.any(), async (req, res) => {
  try {
    const user_id = req.user?.user_id || req.body.user_id;
    const { type } = req.body;

    console.log(`[upload-items] type=${type}, user_id=${user_id}`);

    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    if (!type || !['bulk', 'multi', 'single'].includes(type)) {
      return res.status(400).json({ error: 'Valid type is required: single | bulk | multi' });
    }

    // ── Single / Bulk ────────────────────────────────────────────────────────
    if (type === 'bulk' || type === 'single') {
      const { category, brand, description, condition_score, quantity = 1, age = 0, base_price } = req.body;

      if (!category || condition_score === undefined) {
        return res.status(400).json({ error: 'category and condition_score are required' });
      }

      const score = parseFloat(condition_score);
      if (isNaN(score) || score < 0 || score > 1) {
        return res.status(400).json({ error: 'condition_score must be between 0 and 1' });
      }

      const qty    = Math.max(1, parseInt(quantity, 10) || 1);
      const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

      // Run AI analysis (always works, used for fallback + condition_label)
      const aiAnalysis = analyzeItem({ category, condition_score: score });

      // Call ML service (with automatic fallback)
      const prediction = await getPrediction({
        category,
        condition_score: score,
        base_price:      parseFloat(base_price) || aiAnalysis.base_price,
        age:             parseFloat(age) || 0,
        brand:           brand || '',
      });

      const itemPayload = buildItemPayload({
        user_id, category, brand, description,
        score, age: parseFloat(age) || 0,
        qty, images, prediction, aiAnalysis,
      });

      // Submission record
      const submission = await Submission.create({
        user_id,
        type:            qty > 1 ? 'bulk' : 'single',
        item_name:       brand || category,
        quantity:        qty,
        price_per_item:  itemPayload.predicted_price,
        total_price:     itemPayload.predicted_price * qty,
        decision:        prediction.decision,
        status:          itemPayload.status,
        total_co2_saved: itemPayload.impact.co2_saved * qty,
      });

      // Create Item documents (one per quantity unit)
      const itemsToCreate = Array.from({ length: qty }).map(() => ({ ...itemPayload }));
      const createdItems  = await Item.insertMany(itemsToCreate);

      // Update user aggregate stats
      const userUpdate = {
        $inc: {
          items_listed: qty,
          co2_saved:    Math.round(itemPayload.impact.co2_saved * qty * 10) / 10,
          ...(prediction.decision === 'donate' ? { items_donated: qty } : {}),
        },
      };
      await User.findOneAndUpdate({ user_id }, userUpdate);

      console.log(`[upload-items] Created ${qty} item(s) → decision=${prediction.decision} source=${prediction._source}`);
      return res.status(201).json({
        success: true,
        submission,
        prediction,
        items:   createdItems,
        message: `${qty} item(s) uploaded successfully`,
      });

    // ── Multi ────────────────────────────────────────────────────────────────
    } else if (type === 'multi') {
      let parsedItems;
      try {
        parsedItems = JSON.parse(req.body.items || '[]');
      } catch {
        return res.status(400).json({ error: 'Invalid items JSON' });
      }

      if (!parsedItems.length) {
        return res.status(400).json({ error: 'At least one item is required' });
      }

      const submissionItems = [];
      let   totalCo2        = 0;
      let   totalDonated    = 0;
      const itemsToCreate   = [];
      const predictions     = [];

      // Process each item — run ML calls in parallel for performance
      const analysisResults = await Promise.all(
        parsedItems.map(async (item, idx) => {
          const score = parseFloat(item.condition_score);
          if (isNaN(score)) return null;

          const aiAnalysis = analyzeItem({ category: item.category, condition_score: score });
          const prediction = await getPrediction({
            category:        item.category,
            condition_score: score,
            base_price:      parseFloat(item.base_price) || aiAnalysis.base_price,
            age:             parseFloat(item.age)        || 0,
            brand:           item.brand                  || '',
          });

          const itemImages = (req.files || [])
            .filter(f => f.fieldname === `images_${idx}`)
            .map(f => `/uploads/${f.filename}`);

          return { item, idx, score, aiAnalysis, prediction, itemImages };
        })
      );

      for (const result of analysisResults) {
        if (!result) continue;
        const { item, score, aiAnalysis, prediction, itemImages } = result;

        const itemPayload = buildItemPayload({
          user_id,
          category:    item.category,
          brand:       item.brand,
          description: item.description,
          score,
          age:         parseFloat(item.age) || 0,
          qty:         1,
          images:      itemImages,
          prediction,
          aiAnalysis,
        });

        submissionItems.push({
          name:     item.brand || item.category,
          price:    itemPayload.predicted_price,
          decision: prediction.decision,
        });

        itemsToCreate.push(itemPayload);
        predictions.push(prediction);
        totalCo2 += itemPayload.impact.co2_saved;
        if (prediction.decision === 'donate') totalDonated++;
      }

      const submission = await Submission.create({
        user_id,
        type:            'multi',
        items:           submissionItems,
        total_co2_saved: Math.round(totalCo2 * 10) / 10,
      });

      const createdItems = await Item.insertMany(itemsToCreate);

      await User.findOneAndUpdate(
        { user_id },
        {
          $inc: {
            items_listed:  itemsToCreate.length,
            co2_saved:     Math.round(totalCo2 * 10) / 10,
            items_donated: totalDonated,
          },
        }
      );

      console.log(`[upload-items] Created ${itemsToCreate.length} multi-items for user ${user_id}`);
      return res.status(201).json({
        success: true,
        submission,
        predictions,
        items:   createdItems,
        message: `${itemsToCreate.length} items uploaded`,
      });
    }
  } catch (err) {
    console.error('[upload-items] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/upload-item  (single item — kept for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/upload-item', protect, upload.array('images', 5), async (req, res) => {
  try {
    const user_id = req.user?.user_id || req.body.user_id;
    const { category, brand, description, condition_score, age = 0, base_price } = req.body;

    console.log(`[upload-item] category=${category}, user_id=${user_id}`);

    if (!user_id)   return res.status(400).json({ error: 'user_id is required' });
    if (!category || condition_score === undefined) {
      return res.status(400).json({ error: 'category and condition_score are required' });
    }

    const score = parseFloat(condition_score);
    if (isNaN(score) || score < 0 || score > 1) {
      return res.status(400).json({ error: 'condition_score must be between 0 and 1' });
    }

    const images     = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    const aiAnalysis = analyzeItem({ category, condition_score: score });

    const prediction = await getPrediction({
      category,
      condition_score: score,
      base_price:      parseFloat(base_price) || aiAnalysis.base_price,
      age:             parseFloat(age) || 0,
      brand:           brand || '',
    });

    const itemPayload = buildItemPayload({
      user_id, category, brand, description,
      score, age: parseFloat(age) || 0,
      qty: 1, images, prediction, aiAnalysis,
    });

    const item = await Item.create(itemPayload);

    await User.findOneAndUpdate(
      { user_id },
      {
        $inc: {
          items_listed: 1,
          co2_saved:    itemPayload.impact.co2_saved,
          ...(prediction.decision === 'donate' ? { items_donated: 1 } : {}),
        },
      }
    );

    console.log(`[upload-item] Item created: ${item._id} | Decision: ${prediction.decision} | Source: ${prediction._source}`);
    res.status(201).json({ success: true, item, prediction });
  } catch (err) {
    console.error('[upload-item] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/items   — Public marketplace listing
// ─────────────────────────────────────────────────────────────────────────────
router.get('/items', async (req, res) => {
  try {
    const { category, decision, page = 1, limit = 20 } = req.query;
    const filter = { status: 'listed', decision: 'resell' };
    if (category) filter.category = new RegExp(`^${category}$`, 'i');
    if (decision) filter.decision = decision;

    const total = await Item.countDocuments(filter);
    const items = await Item.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      items,
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[GET /items] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/items/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/items/user/:user_id   — All items for a specific user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/items/user/:user_id', protect, async (req, res) => {
  try {
    const { user_id } = req.params;
    if (req.user.user_id !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const items = await Item.find({ user_id }).sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/buy-item
// ─────────────────────────────────────────────────────────────────────────────
router.post('/buy-item', protect, async (req, res) => {
  try {
    const buyer_id = req.user.user_id;
    const { item_id } = req.body;
    if (!item_id) return res.status(400).json({ error: 'item_id is required' });

    const item = await Item.findById(item_id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status !== 'listed') {
      return res.status(400).json({ error: `Item is not available (status: ${item.status})` });
    }
    if (item.user_id === buyer_id) {
      return res.status(400).json({ error: 'You cannot buy your own item' });
    }

    item.status   = 'sold';
    item.buyer_id = buyer_id;
    await item.save();

    // Credit seller's earnings
    await User.findOneAndUpdate(
      { user_id: item.user_id },
      { $inc: { earnings: item.predicted_price || item.price, items_sold: 1 } }
    );

    res.json({ success: true, message: 'Item purchased successfully', item });
  } catch (err) {
    console.error('[buy-item] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stats  — Platform-wide stats (public)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [total, sold, donated, refurbishing] = await Promise.all([
      Item.countDocuments(),
      Item.countDocuments({ status: 'sold' }),
      Item.countDocuments({ status: 'donated' }),
      Item.countDocuments({ status: 'refurbishing' }),
    ]);

    const [co2Result, benefResult] = await Promise.all([
      Item.aggregate([{ $group: { _id: null, total: { $sum: '$impact.co2_saved' } } }]),
      Item.aggregate([{ $group: { _id: null, total: { $sum: '$impact.beneficiaries' } } }]),
    ]);

    res.json({
      success: true,
      stats: {
        total_items:   total,
        sold,
        donated,
        refurbishing,
        co2_saved:     Math.round((co2Result[0]?.total || 0) * 10) / 10,
        beneficiaries: benefResult[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/user/dashboard  — (kept for backward compat)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/user/dashboard', protect, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const user    = await User.findOne({ user_id }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const items     = await Item.find({ user_id }).sort({ createdAt: -1 });
    const earnings  = items.filter(i => i.status === 'sold').reduce((sum, i) => sum + (i.predicted_price || i.price || 0), 0);
    const co2_saved = items.reduce((sum, i) => sum + (i.impact?.co2_saved || i.co2_saved || 0), 0);
    const beneficiaries = items.reduce((sum, i) => sum + (i.impact?.beneficiaries || 0), 0);

    const stats = {
      listed:       items.filter(i => i.status === 'listed').length,
      sold:         items.filter(i => i.status === 'sold').length,
      donated:      items.filter(i => i.status === 'donated').length,
      refurbishing: items.filter(i => i.status === 'refurbishing').length,
    };

    res.json({
      success: true,
      user: {
        name:           user.name,
        email:          user.email,
        total_earnings: earnings,
        co2_saved_kg:   Math.round(co2_saved * 10) / 10,
        beneficiaries,
        stats,
      },
      items,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
