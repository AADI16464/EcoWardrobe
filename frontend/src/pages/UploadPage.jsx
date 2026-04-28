import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, CheckCircle, Loader2, Leaf, Sparkles, AlertCircle, Tag, Heart, Plus, Minus, Layers } from 'lucide-react';
import { uploadItems, isLoggedIn, getUserId } from '../api';

const CATEGORIES = ['Men', 'Women', 'Kids', 'Shoes', 'Electronics'];

const CONDITION_PRESETS = [
  { label: 'Like New', score: 0.95 },
  { label: 'Excellent', score: 0.85 },
  { label: 'Good', score: 0.72 },
  { label: 'Fair', score: 0.55 },
  { label: 'Poor', score: 0.30 },
];

const basePrices = { Men: 1200, Women: 1500, Kids: 800, Shoes: 2000, Electronics: 5000 };

export default function UploadPage() {
  const fileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn()) navigate('/login');
  }, []);
  const [mode, setMode] = useState('resell'); // 'resell' or 'donate'
  const [uploadType, setUploadType] = useState('single-bulk'); // 'single-bulk' or 'multi'

  // State for Single/Bulk mode
  const [form, setForm] = useState({
    category: 'Men',
    brand: '',
    description: '',
    condition_score: 0.85,
    quantity: 1,
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(1);

  // State for Multi mode
  const [multiItems, setMultiItems] = useState([
    { id: 1, category: 'Men', brand: '', description: '', condition_score: 0.85, images: [], previews: [], selectedPreset: 1 }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loadingText, setLoadingText] = useState('');

  // Single/Bulk Calculations
  const score = form.condition_score;
  let decision = {};
  if (mode === 'resell') {
    decision = score > 0.7 ? { label: 'Resell', color: 'cyan' } :
      score > 0.4 ? { label: 'Refurbish', color: 'violet' } :
        { label: 'Unfit for Resell (Donate Instead)', color: 'rose' };
  } else {
    decision = { label: 'Donate', color: 'emerald' };
  }
  const estimatedPrice = mode === 'resell' ? Math.round((basePrices[form.category] || 1000) * score) : 0;
  const estimatedCO2 = Math.round((basePrices[form.category] || 1000) * 0.005 * score * 10) / 10;
  const totalPrice = estimatedPrice * form.quantity;

  // Single/Bulk Handlers
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - images.length);
    if (files.length > 1 && uploadType === 'single-bulk' && form.quantity === 1) {
      if (window.confirm("Are these different items? Switch to Multiple Items mode?")) {
        setUploadType('multi');
        return;
      }
    }
    setImages(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (i) => {
    setImages(images.filter((_, idx) => idx !== i));
    URL.revokeObjectURL(previews[i]);
    setPreviews(previews.filter((_, idx) => idx !== i));
  };

  const handlePreset = (preset, idx) => {
    setSelectedPreset(idx);
    setForm(f => ({ ...f, condition_score: preset.score }));
  };

  const updateQuantity = (delta) => {
    setForm(f => ({ ...f, quantity: Math.max(1, f.quantity + delta) }));
  };

  // Multi Handlers
  const addMultiItem = () => {
    setMultiItems(prev => [
      ...prev,
      { id: Date.now(), category: 'Men', brand: '', description: '', condition_score: 0.85, images: [], previews: [], selectedPreset: 1 }
    ]);
  };

  const removeMultiItem = (id) => {
    setMultiItems(prev => prev.filter(item => item.id !== id));
  };

  const updateMultiItem = (id, field, value) => {
    setMultiItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleMultiImageChange = (id, e) => {
    const item = multiItems.find(i => i.id === id);
    const files = Array.from(e.target.files).slice(0, 5 - item.images.length);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setMultiItems(prev => prev.map(i => i.id === id ? {
      ...i,
      images: [...i.images, ...files],
      previews: [...i.previews, ...newPreviews]
    } : i));
  };

  const removeMultiImage = (itemId, imgIndex) => {
    setMultiItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      URL.revokeObjectURL(item.previews[imgIndex]);
      return {
        ...item,
        images: item.images.filter((_, idx) => idx !== imgIndex),
        previews: item.previews.filter((_, idx) => idx !== imgIndex)
      };
    }));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const formData = new FormData();
      const user_id = getUserId();
      if (!user_id) { navigate('/login'); return; }
      formData.append('user_id', user_id);

      if (uploadType === 'single-bulk') {
        if (!form.brand.trim()) { setError('Please enter a brand or name.'); return; }
        if (images.length === 0) { setError('At least one image is required.'); return; }

        setSubmitting(true);
        setLoadingText('AI analyzing your item(s)…');

        formData.append('type', form.quantity > 1 ? 'bulk' : 'single');
        Object.keys(form).forEach(k => formData.append(k, form[k]));
        formData.append('decision', mode === 'donate' ? 'donate' : (score > 0.4 ? 'resell' : 'donate'));
        formData.append('price', estimatedPrice);
        images.forEach(img => formData.append('images', img));

      } else {
        const isValid = multiItems.every(i => i.brand.trim() && i.images.length > 0);
        if (!isValid) { setError('Please complete all fields and add at least one image per item.'); return; }

        setSubmitting(true);
        setLoadingText('AI analyzing your items…');

        formData.append('type', 'multi');

        const itemsToSubmit = multiItems.map(item => ({
          category: item.category,
          brand: item.brand,
          description: item.description,
          condition_score: item.condition_score,
          decision: mode === 'donate' ? 'donate' : (item.condition_score > 0.4 ? 'resell' : 'donate'),
          price: mode === 'resell' ? Math.round((basePrices[item.category] || 1000) * item.condition_score) : 0
        }));

        formData.append('items', JSON.stringify(itemsToSubmit));

        multiItems.forEach((item, idx) => {
          item.images.forEach(img => formData.append(`images_${idx}`, img));
        });
      }

      await uploadItems(formData);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process item(s).');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="pt-32 pb-16 min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="section-container max-w-lg w-full">
          <div className="glass-card p-10 text-center bg-white shadow-2xl">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${mode === 'donate' ? 'bg-emerald-50' : 'bg-cyan-50'}`}>
              <CheckCircle className={`w-10 h-10 ${mode === 'donate' ? 'text-emerald-500' : 'text-cyan-500'}`} />
            </div>
            <h2 className="font-display font-black text-3xl mb-4 text-slate-900">
              {mode === 'donate' ? 'Thank You for Donating!' : 'Successfully Listed!'}
            </h2>
            <p className="text-slate-600 mb-8 font-medium">
              {mode === 'donate'
                ? 'Your donation has been recorded. You are making a real difference and saving CO₂.'
                : 'Your items are now live. Our AI has recorded their conditions and calculated the CO₂ savings.'}
            </p>
            <div className="flex flex-col gap-4">
              <button onClick={() => window.location.reload()} className={`w-full py-4 rounded-xl font-black text-white transition-all hover:scale-105 shadow-md ${mode === 'donate' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-900 hover:bg-cyan-600'}`}>
                Submit More Items
              </button>
              <button onClick={() => window.location.href = '/dashboard'} className="w-full py-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all">
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isResell = mode === 'resell';

  return (
    <div className="pt-24 pb-16 min-h-screen bg-[#fafafa]">
      <div className="section-container max-w-3xl mx-auto">

        {/* Header & Mode Toggle */}
        <div className="mb-10 flex flex-col items-center sm:items-start">
          <div className="flex bg-slate-200/60 p-1.5 rounded-2xl mb-8 w-full sm:max-w-md shadow-inner">
            <button
              type="button"
              onClick={() => setMode('resell')}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2
                 ${isResell ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Tag className={`w-4 h-4 ${isResell ? 'text-cyan-500' : ''}`} /> Resell Item
            </button>
            <button
              type="button"
              onClick={() => setMode('donate')}
              className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2
                 ${!isResell ? 'bg-emerald-500 shadow-md text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Heart className={`w-4 h-4 ${!isResell ? 'text-white fill-white' : ''}`} /> Donate Item
            </button>
          </div>

          <h1 className="font-display font-black text-4xl sm:text-5xl mb-4 text-slate-900 text-center sm:text-left">
            {isResell ? 'Sell Your ' : 'Donate Your '}
            <span className={isResell ? 'gradient-text' : 'text-emerald-500'}>Item(s)</span>
          </h1>
          <p className="text-slate-600 text-center sm:text-left max-w-xl text-lg font-medium">
            {isResell
              ? 'Turn your pre-loved fashion and electronics into cash. Our AI will analyze the condition and estimate its optimal resale value.'
              : 'Give your items a second life. Donate to verified partner NGOs to support those in need while reducing your carbon footprint.'}
          </p>
        </div>

        {/* Upload Type Toggle */}
        <div className="flex border-b border-slate-200 mb-8 w-full">
          <button
            onClick={() => setUploadType('single-bulk')}
            className={`flex-1 py-4 text-sm font-bold border-b-4 transition-all
               ${uploadType === 'single-bulk' ? (isResell ? 'border-cyan-500 text-cyan-700' : 'border-emerald-500 text-emerald-700') : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Single / Bulk Item
          </button>
          <button
            onClick={() => setUploadType('multi')}
            className={`flex-1 py-4 text-sm font-bold border-b-4 transition-all flex justify-center items-center gap-2
               ${uploadType === 'multi' ? (isResell ? 'border-cyan-500 text-cyan-700' : 'border-emerald-500 text-emerald-700') : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Layers className="w-4 h-4" /> Multiple Different Items
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {uploadType === 'single-bulk' ? (
            // SINGLE / BULK FORM
            <>
              {/* Live Preview Bar */}
              <div className={`glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 bg-white border-l-4 shadow-sm ${isResell ? 'border-cyan-500' : 'border-emerald-500'}`}>
                <div className={`flex items-center gap-2 ${isResell ? 'text-cyan-600' : 'text-emerald-600'}`}>
                  {isResell ? <Sparkles className="w-6 h-6 animate-pulse" /> : <Leaf className="w-6 h-6" />}
                  <span className="font-black text-sm tracking-widest uppercase">{isResell ? 'AI Resell Preview' : 'Impact Preview'}</span>
                </div>

                <div className="flex flex-wrap gap-8 text-sm">
                  {isResell ? (
                    <>
                      <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Est. Per Item</span>
                        <span className="text-cyan-600 font-black text-xl">
                          {decision.color === 'rose' ? 'Free (Donate)' : `₹${estimatedPrice.toLocaleString()}`}
                        </span>
                      </div>
                      {form.quantity > 1 && (
                        <div className="flex flex-col">
                          <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Price ({form.quantity})</span>
                          <span className="text-slate-900 font-black text-xl">
                            {decision.color === 'rose' ? '-' : `₹${totalPrice.toLocaleString()}`}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Quality Score</span>
                        <span className="text-slate-900 font-black text-xl">{Math.round(score * 100)}%</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Destination</span>
                        <span className="text-emerald-600 font-black text-xl">Partner NGOs</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total CO₂ Saved</span>
                        <span className="text-slate-900 font-black text-xl">{Math.round(estimatedCO2 * form.quantity * 10) / 10} kg</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="glass-card p-6 sm:p-10 bg-white shadow-xl border border-slate-100 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-slate-900 text-sm font-black mb-3 block uppercase tracking-wide">Category *</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="eco-input h-14 bg-slate-50 border-transparent focus:bg-white w-full font-bold"
                    >
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-900 text-sm font-black mb-3 block uppercase tracking-wide">Quantity *</label>
                    <div className="flex items-center h-14 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                      <button type="button" onClick={() => updateQuantity(-1)} className="w-14 h-full flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors">
                        <Minus className="w-5 h-5" />
                      </button>
                      <div className="flex-1 text-center font-black text-lg text-slate-900 select-none">
                        {form.quantity}
                      </div>
                      <button type="button" onClick={() => updateQuantity(1)} className="w-14 h-full flex items-center justify-center hover:bg-slate-200 text-slate-600 transition-colors">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-slate-900 text-sm font-black mb-3 block uppercase tracking-wide">
                    {isResell ? 'Brand / Item Name *' : 'Item Name / Type *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isResell ? "e.g. Nike Air Max..." : "e.g. Winter Coat..."}
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className={`eco-input h-14 bg-slate-50 border-transparent focus:bg-white focus:border-slate-300 ${!isResell ? 'focus:border-emerald-500 focus:ring-emerald-500/20' : ''}`}
                  />
                </div>

                <div>
                  <label className="text-slate-900 text-sm font-black mb-3 block uppercase tracking-wide">Description</label>
                  <textarea
                    rows={4}
                    placeholder="Describe the item, list any flaws, original purchase details, color..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="eco-input resize-none py-4 bg-slate-50 border-transparent focus:bg-white focus:border-slate-300"
                  />
                </div>

                <div>
                  <label className="text-slate-900 text-sm font-black mb-4 block uppercase tracking-wide">Condition *</label>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">
                      <span>Poor (0%)</span>
                      <span className={isResell ? 'text-violet-600 text-sm' : 'text-emerald-600 text-sm'}>{Math.round(score * 100)}%</span>
                      <span>Like New (100%)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={score}
                      onChange={e => setForm(f => ({ ...f, condition_score: parseFloat(e.target.value) }))}
                      className={`w-full ${isResell ? 'accent-violet-500' : 'accent-emerald-500'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-900 text-sm font-black mb-3 block flex items-center justify-between uppercase tracking-wide">
                    <span>Images *</span>
                    <span className="text-slate-400 font-bold text-[10px] bg-slate-100 px-3 py-1.5 rounded-full normal-case">Max 5 photos</span>
                  </label>

                  {previews.length > 0 && (
                    <div className="flex flex-wrap gap-4 mb-4">
                      {previews.map((src, i) => (
                        <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm group">
                          <img src={src} alt="preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1.5 right-1.5 bg-white/90 rounded-full p-1 text-slate-400 hover:text-rose-500 shadow-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className={`flex flex-col items-center gap-3 border-2 border-dashed rounded-2xl px-6 py-10 w-full justify-center bg-slate-50/50 ${isResell ? 'hover:border-cyan-400 text-slate-500 hover:text-cyan-700' : 'hover:border-emerald-400 text-slate-500 hover:text-emerald-700'}`}
                  >
                    <Upload className="w-8 h-8 opacity-50" />
                    <span className="font-bold text-sm">Click to upload photos</span>
                  </button>
                  <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                </div>
              </div>
            </>
          ) : (
            // MULTI FORM
            <div className="space-y-6">
              {multiItems.map((item, index) => (
                <div key={item.id} className="glass-card p-6 sm:p-8 bg-white shadow-md border border-slate-100 relative">
                  {multiItems.length > 1 && (
                    <button type="button" onClick={() => removeMultiItem(item.id)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 bg-slate-50 p-2 rounded-full transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  <h3 className="font-display font-black text-xl mb-6 text-slate-900 border-b border-slate-100 pb-4">
                    Item {index + 1}
                  </h3>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-900 text-xs font-bold mb-2 block uppercase tracking-wide">Category</label>
                        <select
                          value={item.category}
                          onChange={e => updateMultiItem(item.id, 'category', e.target.value)}
                          className="eco-input h-12 bg-slate-50 border-transparent focus:bg-white w-full font-bold text-sm"
                        >
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-900 text-xs font-bold mb-2 block uppercase tracking-wide">Name / Brand</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Vintage Denim Jacket"
                          value={item.brand}
                          onChange={e => updateMultiItem(item.id, 'brand', e.target.value)}
                          className="eco-input h-12 bg-slate-50 border-transparent focus:bg-white focus:border-slate-300 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-900 text-xs font-bold mb-2 block uppercase tracking-wide">Condition Score: {Math.round(item.condition_score * 100)}%</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={item.condition_score}
                        onChange={e => updateMultiItem(item.id, 'condition_score', parseFloat(e.target.value))}
                        className={`w-full ${isResell ? 'accent-violet-500' : 'accent-emerald-500'}`}
                      />
                    </div>

                    <div>
                      <label className="text-slate-900 text-xs font-bold mb-2 block flex items-center justify-between uppercase tracking-wide">
                        <span>Images *</span>
                      </label>
                      {item.previews.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-3">
                          {item.previews.map((src, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                              <img src={src} alt="preview" className="w-full h-full object-cover" />
                              <button type="button" onClick={() => removeMultiImage(item.id, i)} className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 text-slate-400 hover:text-rose-500">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors">
                        <Upload className="w-4 h-4" /> Add Photos
                        <input type="file" multiple accept="image/*" onChange={(e) => handleMultiImageChange(item.id, e)} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addMultiItem}
                className="w-full py-6 border-2 border-dashed border-slate-300 hover:border-slate-400 text-slate-500 hover:text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors bg-slate-50/50"
              >
                <Plus className="w-5 h-5" /> Add Another Item
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 text-rose-600 bg-rose-50 border-2 border-rose-100 rounded-2xl p-4 text-sm font-bold shadow-sm animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full text-lg font-black py-5 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-60 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 mt-8
              ${isResell
                ? 'bg-slate-900 text-white hover:bg-cyan-600'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                {loadingText}
              </>
            ) : isResell ? (
              <>
                <Sparkles className="w-6 h-6" />
                Submit {uploadType === 'multi' ? 'Items' : 'for AI Analysis'}
              </>
            ) : (
              <>
                <Heart className="w-6 h-6" />
                Confirm {uploadType === 'multi' ? 'Donations' : 'Donation'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
