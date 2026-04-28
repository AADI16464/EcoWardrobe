import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, X, RefreshCw, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { getItems } from '../api';

const PROMOS = [
  { title: 'Latest Collection', sub: 'Fresh Arrivals Now Live', bg: 'bg-slate-900', img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80', text: 'text-white' },
  { title: 'Trending Now', sub: 'The Most Loved Eco-Styles', bg: 'bg-slate-900', img: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80', text: 'text-white' },
  { title: 'Exclusive Drops', sub: 'Limited Edition Sustainable Gear', bg: 'bg-slate-900', img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80', text: 'text-white' },
  { title: 'Curated Picks', sub: 'Handpicked for Your Unique Vibe', bg: 'bg-slate-900', img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80', text: 'text-white' },
];

const MAIN_CATEGORIES = [
  { id: 'Men', label: 'Men\'s Fashion', img: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80' },
  { id: 'Women', label: 'Women\'s Fashion', img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80' },
  { id: 'Kids', label: 'Kids\' Wear', img: 'https://images.unsplash.com/photo-1513273154690-266bd2b57ccf?w=600&q=80' }
];

const CATEGORY_BOXES = {
  Men: [
    { id: 'Shirts, T-shirts', label: 'Shirts, T-shirts', img: 'https://images.unsplash.com/photo-1620012253295-c05c26feafce?w=300&q=80', bg: 'bg-[#fef0bc]' },
    { id: 'Jeans', label: 'Jeans', img: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&q=80', bg: 'bg-[#fef0bc]' },
    { id: 'Sports Shoes', label: 'Sports Shoes', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80', bg: 'bg-[#fef0bc]' },
    { id: 'Summer Wear', label: 'Summer Wear', img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=80', bg: 'bg-[#fef0bc]' },
  ],
  Women: [
    { id: 'Trends', label: 'Trends', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=80', bg: 'bg-[#fce3e0]' },
    { id: 'Kurta sets', label: 'Kurta sets', img: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=300&q=80', bg: 'bg-[#fce3e0]' },
    { id: 'Dresses', label: 'Dresses', img: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&q=80', bg: 'bg-[#fce3e0]' },
    { id: 'Casual shoes', label: 'Casual shoes', img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=300&q=80', bg: 'bg-[#fce3e0]' },
    { id: 'Jeans, trousers', label: 'Jeans, trousers', img: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&q=80', bg: 'bg-[#fce3e0]' },
    { id: 'Kurtis', label: 'Kurtis', img: 'https://images.unsplash.com/photo-1610030469668-93510ef2d62d?w=300&q=80', bg: 'bg-[#fce3e0]' },
  ],
  Kids: [
    { id: 'Kids\' clothing', label: 'Kids\' clothing', img: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=300&q=80', bg: 'bg-[#fef0bc]' },
  ]
};

const DECISIONS  = ['All', 'resell', 'refurbish'];
const PRICE_RANGES = [
  { label: 'Any Price', min: '', max: '' },
  { label: 'Under ₹500', min: '', max: '500' },
  { label: '₹500 – ₹1,500', min: '500', max: '1500' },
  { label: '₹1,500 – ₹3,000', min: '1500', max: '3000' },
  { label: 'Over ₹3,000', min: '3000', max: '' },
];

const MOCK_ITEMS = [
  { _id: 'm1', category: 'Men', brand: 'U.S. Polo Assn.', description: 'Men Slim Fit Solid Cotton Shirt', color: 'Navy Blue', condition_score: 0.95, condition_label: 'excellent', price: 899, base_price: 1999, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&q=80'], co2_saved: 4.2, user_id: 'u1', reviews: 4.3, reviewCount: 842 },
  { _id: 'm2', category: 'Women', brand: 'Biba', description: 'Women Floral Print Kurta', color: 'Mustard Yellow', condition_score: 0.88, condition_label: 'excellent', price: 1250, base_price: 2499, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80'], co2_saved: 3.8, user_id: 'u1', reviews: 4.6, reviewCount: 1205 },
  { _id: 'm3', category: 'Shoes', brand: 'Puma', description: 'Men X-Ray 2 Square Sneakers', color: 'White & Red', condition_score: 0.75, condition_label: 'good', price: 2199, base_price: 5499, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80'], co2_saved: 8.5, user_id: 'u1', reviews: 4.1, reviewCount: 3420 },
  { _id: 'm4', category: 'Accessories', brand: 'Titan', description: 'Analog Men\'s Watch', color: 'Rose Gold', condition_score: 0.92, condition_label: 'excellent', price: 3450, base_price: 6995, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=500&q=80'], co2_saved: 2.1, user_id: 'u1', reviews: 4.8, reviewCount: 512 },
  { _id: 'm5', category: 'Men', brand: 'Levi\'s', description: 'Men 511 Slim Fit Jeans', color: 'Light Indigo', condition_score: 0.65, condition_label: 'fair', price: 0, base_price: 2899, decision: 'refurbish', status: 'refurbishing', images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80'], co2_saved: 6.4, user_id: 'u1', reviews: 3.9, reviewCount: 210 },
  { _id: 'm6', category: 'Accessories', brand: 'Safari', description: 'Cabin Size Hard Luggage Trolley', color: 'Metallic Blue', condition_score: 0.81, condition_label: 'good', price: 1899, base_price: 5500, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=500&q=80'], co2_saved: 12.0, user_id: 'u1', reviews: 4.4, reviewCount: 1850 },
  { _id: 'm7', category: 'Electronics', brand: 'Samsung', description: 'Galaxy Buds Pro Noise Cancelling', color: 'Phantom Black', condition_score: 0.55, condition_label: 'fair', price: 0, base_price: 8990, decision: 'refurbish', status: 'refurbishing', images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80'], co2_saved: 3.2, user_id: 'u1', reviews: 4.2, reviewCount: 432 },
  { _id: 'm8', category: 'Kids', brand: 'Mothercare', description: 'Boys Printed Cotton T-Shirt', color: 'Grey Melange', condition_score: 0.35, condition_label: 'poor', price: 0, base_price: 699, decision: 'donate', status: 'listed', images: ['https://images.unsplash.com/photo-1519238263530-99abc11eeff4?w=500&q=80'], co2_saved: 1.5, user_id: 'u1', reviews: 4.0, reviewCount: 88 },
  { _id: 'm9', category: 'Accessories', brand: 'Wildcraft', description: 'Unisex Laptop Backpack', color: 'Yellow & Black', condition_score: 0.89, condition_label: 'excellent', price: 850, base_price: 2100, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=500&q=80'], co2_saved: 4.5, user_id: 'u1', reviews: 4.5, reviewCount: 654 },
  { _id: 'm10', category: 'Accessories', brand: 'Zaveri Pearls', description: 'Gold Plated Kundan Jewellery Set', color: 'Gold', condition_score: 0.98, condition_label: 'excellent', price: 399, base_price: 1995, decision: 'resell', status: 'listed', images: ['https://images.unsplash.com/photo-1599643478514-4a4204142f1f?w=500&q=80'], co2_saved: 0.8, user_id: 'u1', reviews: 4.7, reviewCount: 2200 },
];

export default function ShopPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [subCategory, setSubCategory] = useState('All');
  const [decision, setDecision] = useState('All');
  const [priceRange, setPriceRange] = useState(PRICE_RANGES[0]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPromo, setCurrentPromo] = useState(0);
  const promoRef = useRef(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 12 };
      if (category !== 'All') params.category = category;
      if (decision !== 'All') params.decision = decision;
      if (priceRange.min) params.min_price = priceRange.min;
      if (subCategory !== 'All') {
        // As backend sub-categories aren't mapped, pass it to description/query optionally
        // or just rely on frontend filter for now
        params.subCategory = subCategory;
      }

      const res = await getItems(params);
      const fetched = res.data.items;
      const combined = fetched.length > 0 ? fetched : MOCK_ITEMS;
      setItems(combined);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch {
      let filteredMocks = MOCK_ITEMS;
      if (category !== 'All') {
        filteredMocks = filteredMocks.filter(i => i.category === category);
      }
      setItems(filteredMocks);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [category, subCategory, decision, priceRange, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPromo((prev) => (prev + 1) % PROMOS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (promoRef.current) {
      const scrollWidth = promoRef.current.offsetWidth;
      promoRef.current.scrollTo({
        left: currentPromo * (scrollWidth + 16), // 16 is the gap
        behavior: 'smooth'
      });
    }
  }, [currentPromo]);

  const filtered = items.filter(item => {
    if (!search && subCategory === 'All') return true;
    
    let matchSub = true;
    if (subCategory !== 'All') {
      const sub = subCategory.toLowerCase();
      const desc = item.description?.toLowerCase() || '';
      
      // Basic text matching logic for mock items
      if (sub.includes('shirt') && !desc.includes('shirt')) matchSub = false;
      if (sub.includes('jeans') && !desc.includes('jean')) matchSub = false;
      if (sub.includes('shoe') && !desc.includes('shoe') && !desc.includes('sneaker')) matchSub = false;
      if (sub.includes('kurta') && !desc.includes('kurta') && !desc.includes('kurti')) matchSub = false;
      if (sub.includes('dress') && !desc.includes('dress')) matchSub = false;
      if (sub.includes('kids') && !desc.includes('boy') && !desc.includes('girl') && !desc.includes('kids')) matchSub = false;
    }

    if (!matchSub) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        item.brand?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeFilters = [
    category !== 'All' && { label: `Category: ${category}`, clear: () => { setCategory('All'); setSubCategory('All'); } },
    subCategory !== 'All' && { label: subCategory, clear: () => setSubCategory('All') },
    decision !== 'All' && { label: decision, clear: () => setDecision('All') },
    priceRange.label !== 'Any Price' && { label: priceRange.label, clear: () => setPriceRange(PRICE_RANGES[0]) },
  ].filter(Boolean);

  return (
    <div className="pt-24 pb-16 min-h-screen bg-[#fafafa]">
      <div className="section-container">
        
        {/* Header - Interesting Tagline */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="font-display font-black text-4xl sm:text-6xl mb-3 text-slate-900 leading-tight">
            Revive. Relove. <span className="gradient-text">Redefine Style.</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl">
            Curated vintage gems and sustainable drops, handpicked for your unique vibe. 
            Kind to your wardrobe, <span className="text-emerald-600 font-semibold">better for the planet.</span>
          </p>
        </div>

        {/* --- Hero Promotional Carousel (Automatic) --- */}
        <div 
          ref={promoRef}
          className="flex gap-4 sm:gap-6 overflow-x-hidden pb-4 mb-6 transition-all duration-700 ease-in-out scroll-smooth"
        >
          {PROMOS.map((promo, i) => (
            <div key={i} className={`shrink-0 w-full sm:w-[500px] md:w-[600px] h-64 rounded-[2rem] p-10 flex flex-col justify-center ${promo.bg} shadow-xl relative overflow-hidden group cursor-pointer border border-black/5`}>
              {promo.img && (
                <div className="absolute inset-0 z-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent z-10" />
                  <img src={promo.img} alt={promo.title} className="w-full h-full object-cover z-0" />
                </div>
              )}
              <div className="relative z-20 max-w-md">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">
                    Featured Drop
                  </span>
                </div>
                <h3 className={`font-display font-bold text-2xl sm:text-3xl mb-2 ${promo.text} drop-shadow-lg`}>
                  {promo.title}
                </h3>
                <p className={`text-lg sm:text-xl font-medium ${promo.text} opacity-90 drop-shadow-md`}>
                  {promo.sub}
                </p>
                <button className="mt-6 bg-white text-slate-900 px-6 py-2.5 rounded-full font-bold text-sm hover:scale-105 transition-transform shadow-lg">
                  Explore Collection
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* --- Main Category Sections (Men, Women, Kids) --- */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8">
          {MAIN_CATEGORIES.map((cat, i) => (
            <button
              key={i}
              onClick={() => { setCategory(cat.id); setSubCategory('All'); }}
              className={`relative aspect-[4/3] sm:aspect-[16/9] rounded-3xl overflow-hidden group shadow-lg outline-none border-4 transition-all duration-300 ${category === cat.id ? 'border-violet-500 scale-[1.02]' : 'border-transparent hover:scale-[1.02]'}`}
            >
              <div className={`absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500 z-10 ${category === cat.id ? 'bg-black/20' : ''}`} />
              <img src={cat.img} alt={cat.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-2">
                <span className="text-white font-display font-black text-xl sm:text-4xl drop-shadow-2xl tracking-tight">
                  {cat.label}
                </span>
                <span className={`text-white/90 text-[10px] sm:text-sm font-bold bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full transition-all duration-500 mt-4 border border-white/20 ${category === cat.id ? 'opacity-100 translate-y-0 bg-violet-600/60' : 'opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0'}`}>
                  {category === cat.id ? 'Selected' : `Shop ${cat.id} →`}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* --- Detailed Category Image Boxes Grid --- */}
        {category !== 'All' && CATEGORY_BOXES[category] && (
          <div className="mb-12 animate-slide-up">
            <h3 className="font-display font-bold text-xl text-slate-900 mb-4">{category} Collections</h3>
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 scrollbar-eco snap-x">
              {CATEGORY_BOXES[category].map((box, i) => {
                const isActive = subCategory === box.id;
                return (
                  <button
                    key={i}
                    onClick={() => setSubCategory(isActive ? 'All' : box.id)}
                    className="flex flex-col items-center gap-3 w-20 sm:w-28 shrink-0 snap-start group outline-none"
                  >
                    <div className={`w-full aspect-square rounded-3xl ${box.bg} overflow-hidden flex items-center justify-center transition-all duration-500
                      ${isActive ? 'shadow-xl scale-110 ring-4 ring-offset-4 ring-violet-500 z-10' : 'shadow-md group-hover:scale-105 group-hover:shadow-lg'}
                    `}>
                      <img src={box.img} alt={box.label} className={`w-full h-full object-cover mix-blend-multiply transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`} />
                    </div>
                    <span className={`text-[10px] sm:text-xs font-bold text-center leading-tight transition-colors duration-300 px-1
                      ${isActive ? 'text-violet-700 bg-violet-100 rounded-full px-3 py-1' : 'text-slate-500 group-hover:text-slate-900'}
                    `}>
                      {box.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Search & Utility Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
            <input
              type="text"
              placeholder="Search vintage gems, sustainable brands..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="eco-input pl-12 h-14 text-base bg-white border-slate-100 focus:bg-white focus:shadow-xl transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 h-14 rounded-2xl border font-bold text-sm transition-all duration-300
              ${showFilters
                ? 'bg-slate-900 border-slate-900 text-white shadow-xl translate-y-[-2px]'
                : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:shadow-lg'
              }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            Filters
            {activeFilters.length > 0 && (
              <span className="bg-cyan-500 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black">
                {activeFilters.length}
              </span>
            )}
          </button>
          <button
            onClick={fetchItems}
            className="bg-white border border-slate-100 text-slate-500 hover:text-slate-900 h-14 px-6 rounded-2xl hover:shadow-lg transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="glass-card p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-8 bg-white border-slate-50 shadow-2xl animate-slide-up">
            <div>
              <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 block">
                Curation Type
              </label>
              <div className="flex flex-wrap gap-2">
                {DECISIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDecision(d)}
                    className={`text-xs px-4 py-2 rounded-xl border-2 transition-all duration-300 capitalize font-bold
                      ${decision === d
                        ? 'bg-violet-600 border-violet-600 text-white shadow-lg'
                        : 'bg-white border-slate-50 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 block">
                Price Range
              </label>
              <select
                value={priceRange.label}
                onChange={e => setPriceRange(PRICE_RANGES.find(p => p.label === e.target.value))}
                className="eco-select h-12 text-sm font-bold bg-slate-50 border-transparent rounded-xl focus:bg-white"
              >
                {PRICE_RANGES.map(p => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {activeFilters.map(({ label, clear }) => (
              <button
                key={label}
                onClick={clear}
                className="flex items-center gap-2 bg-slate-900 text-white text-[10px] font-bold px-4 py-2 rounded-full hover:bg-rose-500 transition-all shadow-lg group"
              >
                {label}
                <X className="w-3 h-3 group-hover:rotate-90 transition-transform" />
              </button>
            ))}
          </div>
        )}

        {/* Results Counter */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-slate-100" />
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
            {loading ? 'Curating Items...' : `${filtered.length} Items Discovered`}
          </p>
          <div className="h-px flex-1 bg-slate-100" />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-card overflow-hidden bg-white aspect-[3/4]">
                <div className="skeleton h-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-32 text-slate-300 glass-card bg-white border-dashed border-2 border-slate-100">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 opacity-20" />
            </div>
            <p className="text-xl font-black text-slate-900 mb-2">The hunt continues!</p>
            <p className="text-sm font-medium text-slate-400">We couldn't find exactly what you were looking for.</p>
            <button 
              onClick={() => {setSearch(''); setCategory('All'); setSubCategory('All'); setDecision('All'); setPriceRange(PRICE_RANGES[0]);}}
              className="mt-8 text-cyan-600 font-bold text-sm hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
            {filtered.map(item => (
              <ProductCard
                key={item._id}
                item={item}
                onPurchased={() => fetchItems()}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-6 mt-16">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-slate-100 text-slate-400 disabled:opacity-30 hover:border-slate-900 hover:text-slate-900 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-2xl text-slate-900">{page}</span>
              <span className="text-slate-300 font-bold">/</span>
              <span className="text-slate-400 font-bold">{totalPages}</span>
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-slate-100 text-slate-400 disabled:opacity-30 hover:border-slate-900 hover:text-slate-900 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
