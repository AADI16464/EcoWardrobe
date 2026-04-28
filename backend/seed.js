const mongoose = require('mongoose');
const Item = require('./models/Item');

const MONGO_URI = 'mongodb://127.0.0.1:27017/ecowardrobe';

const ITEMS = [
  { category: 'Men', brand: 'U.S. Polo Assn.', description: 'Men Slim Fit Solid Cotton Shirt', color: 'Navy Blue', condition_score: 0.95, condition_label: 'excellent', price: 899, base_price: 1999, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&q=80'], co2_saved: 4.2, user_id: 'u1' },
  { category: 'Women', brand: 'Biba', description: 'Women Floral Print Kurta', color: 'Mustard Yellow', condition_score: 0.88, condition_label: 'excellent', price: 1250, base_price: 2499, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80'], co2_saved: 3.8, user_id: 'u1' },
  { category: 'Shoes', brand: 'Puma', description: 'Men X-Ray 2 Square Sneakers', color: 'White & Red', condition_score: 0.75, condition_label: 'good', price: 2199, base_price: 5499, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80'], co2_saved: 8.5, user_id: 'u1' },
  { category: 'Other', brand: 'Titan', description: 'Analog Men\'s Watch', color: 'Rose Gold', condition_score: 0.92, condition_label: 'excellent', price: 3450, base_price: 6995, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=500&q=80'], co2_saved: 2.1, user_id: 'u1' },
  { category: 'Men', brand: 'Levi\'s', description: 'Men 511 Slim Fit Jeans', color: 'Light Indigo', condition_score: 0.65, condition_label: 'fair', price: 0, base_price: 2899, decision: 'refurbish', status: 'refurbishing', images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80'], co2_saved: 6.4, user_id: 'u1' },
  { category: 'Other', brand: 'Safari', description: 'Cabin Size Hard Luggage Trolley', color: 'Metallic Blue', condition_score: 0.81, condition_label: 'good', price: 1899, base_price: 5500, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=500&q=80'], co2_saved: 12.0, user_id: 'u1' },
  { category: 'Electronics', brand: 'Samsung', description: 'Galaxy Buds Pro Noise Cancelling', color: 'Phantom Black', condition_score: 0.55, condition_label: 'fair', price: 0, base_price: 8990, decision: 'refurbish', status: 'refurbishing', images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80'], co2_saved: 3.2, user_id: 'u1' },
  { category: 'Kids', brand: 'Mothercare', description: 'Boys Printed Cotton T-Shirt', color: 'Grey Melange', condition_score: 0.35, condition_label: 'poor', price: 0, base_price: 699, decision: 'donate', status: 'listed', images: ['https://images.unsplash.com/photo-1519238263530-99abc11eeff4?w=500&q=80'], co2_saved: 1.5, user_id: 'u1' },
  { category: 'Other', brand: 'Wildcraft', description: 'Unisex Laptop Backpack', color: 'Yellow & Black', condition_score: 0.89, condition_label: 'excellent', price: 850, base_price: 2100, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=500&q=80'], co2_saved: 4.5, user_id: 'u1' },
  { category: 'Other', brand: 'Zaveri Pearls', description: 'Gold Plated Kundan Jewellery Set', color: 'Gold', condition_score: 0.98, condition_label: 'excellent', price: 399, base_price: 1995, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1599643478514-4a4204142f1f?w=500&q=80'], co2_saved: 0.8, user_id: 'u1' }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    await Item.deleteMany({});
    console.log('Cleared existing items');
    await Item.insertMany(ITEMS);
    console.log('Inserted seed items successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
