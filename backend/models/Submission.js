const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    type: { type: String, enum: ['bulk', 'multi', 'single'], required: true },
    
    // For Bulk
    item_name: { type: String },
    quantity: { type: Number },
    price_per_item: { type: Number },
    total_price: { type: Number },
    decision: { type: String },
    status: { type: String, default: 'processing' },
    
    // For Multi
    items: [
      {
        name: String,
        price: Number,
        decision: String,
      }
    ],

    total_co2_saved: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Submission', submissionSchema);
