const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    earnings: { type: Number, default: 0 },
    co2_saved: { type: Number, default: 0 },
    items_listed: { type: Number, default: 0 },
    items_sold: { type: Number, default: 0 },
    items_donated: { type: Number, default: 0 },
    certificates: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
