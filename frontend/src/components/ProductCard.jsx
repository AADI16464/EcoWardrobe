import { useState, useRef } from 'react';
import { ShoppingCart, Tag, Recycle, Heart, Star, Sparkles, UploadCloud, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { buyItem, tryOn, createRazorpayOrder, verifyRazorpayPayment } from '../api';

const DECISION_CONFIG = {
  resell:   { label: 'Resell',    badge: 'badge-resell',    icon: Tag },
  refurbish:{ label: 'Refurbish', badge: 'badge-refurbish', icon: Recycle },
  donate:   { label: 'Donate',    badge: 'badge-donate',    icon: Heart },
};

const CONDITION_COLORS = {
  excellent: 'text-emerald-600',
  good:      'text-cyan-600',
  fair:      'text-amber-600',
  poor:      'text-rose-600',
};

export default function ProductCard({ item, onPurchased }) {
  const [buying, setBuying] = useState(false);
  const [added, setAdded] = useState(item.status === 'sold');
  const [error, setError] = useState('');
  
  // Modals State
  const [showDetails, setShowDetails] = useState(false);
  
  // Try-On State
  const [showTryOn, setShowTryOn] = useState(false);
  const [userImage, setUserImage] = useState(null);
  const [userImagePreview, setUserImagePreview] = useState(null);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [tryOnResult, setTryOnResult] = useState(null);
  const fileInputRef = useRef(null);

  const { label, badge, icon: DecisionIcon } = DECISION_CONFIG[item.decision] || DECISION_CONFIG.resell;
  const conditionColor = CONDITION_COLORS[item.condition_label] || 'text-slate-600';

  const handleAddToCart = async (e) => {
    if (e) e.stopPropagation();
    if (added || buying) return;
    setBuying(true);
    setError('');
    try {
      if (item._id && item._id.toString().startsWith('m')) {
        // Mock item simulation
        await new Promise(resolve => setTimeout(resolve, 800));
        setAdded(true);
        if (onPurchased) onPurchased(item._id);
        setBuying(false);
        return;
      }

      if (item.decision === 'donate' || item.price === 0) {
        await buyItem(item._id);
        setAdded(true);
        if (onPurchased) onPurchased(item._id);
        setBuying(false);
      } else {
        // Razorpay integration
        const res = await createRazorpayOrder({ amount: item.price, item_ids: [item._id] });
        const { order, dbOrderId, razorpayKey } = res.data;

        const options = {
          key: razorpayKey,
          amount: order.amount,
          currency: order.currency,
          name: "EcoWardrobe",
          description: "Purchase " + (item.brand || item.category),
          order_id: order.id,
          handler: async function (response) {
            try {
              await verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                dbOrderId
              });
              setAdded(true);
              if (onPurchased) onPurchased(item._id);
            } catch (err) {
              setError("Payment verification failed");
            }
          },
          prefill: {
            name: "Customer",
            email: "customer@example.com",
            contact: "9999999999"
          },
          theme: {
            color: "#16a34a"
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response){
          setError(response.error.description);
        });
        rzp.open();
        setBuying(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add to cart');
    } finally {
      setBuying(false);
    }
  };

  const imageSrc = item.images?.[0] || null;
  const reviews = item.reviews || (Math.random() * (5 - 3.5) + 3.5).toFixed(1);
  const reviewCount = item.reviewCount || Math.floor(Math.random() * 500) + 20;

  const handleUserImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUserImage(file);
      setUserImagePreview(URL.createObjectURL(file));
      setTryOnResult(null);
    }
  };

  const handleTryOnSubmit = async () => {
    if (!userImage) return;
    setIsTryingOn(true);
    try {
      // We need the item image as a File or blob to send. 
      let clothBlob;
      try {
        const response = await fetch(imageSrc);
        if (!response.ok) throw new Error(`Fetch status: ${response.status}`);
        clothBlob = await response.blob();
        
        // If the blob is HTML instead of image, throw error
        if (clothBlob.type.includes('html')) throw new Error('Fetched HTML instead of image');
      } catch (err) {
        console.warn('Fallback: Failed to fetch clothing image from URL', err);
        // Fallback to a 1x1 transparent PNG if the image is blocked by CORS or 404
        const fallbackPng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
        clothBlob = new Blob([fallbackPng], { type: 'image/png' });
      }

      const clothFile = new File([clothBlob], 'cloth.png', { type: clothBlob.type });

      const formData = new FormData();
      formData.append('user_image', userImage);
      formData.append('cloth_image', clothFile);

      const res = await tryOn(formData);
      
      // Response is a blob
      const resultUrl = URL.createObjectURL(res.data);
      setTryOnResult(resultUrl);
    } catch (err) {
      console.error('Try-On failed:', err);
      setError('Failed to process virtual try-on. Please try again later.');
    } finally {
      setIsTryingOn(false);
    }
  };

  return (
    <>
    <div 
      className="glass-card-hover flex flex-col overflow-hidden group cursor-pointer"
      onClick={() => setShowDetails(true)}
    >
      {/* Image container */}
      <div className="relative h-64 bg-slate-100 overflow-hidden border-b border-slate-100">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.brand || item.category}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <Recycle className="w-10 h-10 opacity-40" />
            <span className="text-xs opacity-50 capitalize">{item.category}</span>
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <span className={`${badge} flex items-center gap-1 shadow-sm backdrop-blur-md bg-white/90`}>
            <DecisionIcon className="w-3 h-3" />
            {label}
          </span>
          {item.base_price > item.price && item.price > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm">
              {Math.round((1 - item.price / item.base_price) * 100)}% OFF
            </span>
          )}
        </div>

        {added && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <span className="text-slate-800 font-bold text-lg px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> In Cart
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2.5 bg-white">
        {/* Brand and Title */}
        <div>
          <h3 className="font-display font-bold text-slate-900 capitalize text-base leading-tight truncate">
            {item.brand || item.category}
          </h3>
          <p className="text-slate-500 text-xs mt-1 truncate">
            {item.description} {item.color ? `· ${item.color}` : ''}
          </p>
        </div>

        {/* Reviews */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-green-50 px-1.5 py-0.5 rounded text-[10px] font-bold text-green-700 border border-green-200/50">
            {reviews} <Star className="w-2.5 h-2.5 ml-0.5 fill-green-700" />
          </div>
          <span className="text-[10px] text-slate-400 font-medium">({reviewCount})</span>
        </div>

        {/* Condition & CO2 */}
        <div className="flex items-center gap-3 text-[11px] font-medium mt-1">
          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
            <span className="text-slate-500">Condition:</span>
            <span className={`capitalize ${conditionColor}`}>
              {item.condition_label}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
            <span className="text-emerald-700">🌱 {item.co2_saved}kg CO₂</span>
          </div>
        </div>

        {/* Pricing & Action */}
        <div className="flex items-end justify-between mt-auto pt-3">
          <div className="flex flex-col">
            {item.decision === 'donate' ? (
              <span className="text-emerald-600 font-black text-xl leading-none">FREE</span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-slate-900 font-black text-lg leading-none">₹{item.price.toLocaleString()}</span>
                {item.base_price > item.price && (
                  <span className="text-slate-400 text-xs line-through font-medium">₹{item.base_price.toLocaleString()}</span>
                )}
              </div>
            )}
          </div>

          {item.decision !== 'donate' && (
            <div className="flex items-center gap-2 relative z-20">
              <button
                onClick={(e) => { e.stopPropagation(); setShowTryOn(true); }}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-violet-100 hover:bg-violet-600 text-violet-600 hover:text-white transition-all duration-200 shadow-sm"
                title="Virtual Try-On"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={handleAddToCart}
                disabled={added || buying}
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200
                  ${added
                    ? 'bg-emerald-100 text-emerald-600 cursor-default border border-emerald-200'
                    : 'bg-slate-900 hover:bg-cyan-600 text-white shadow-md hover:shadow-lg active:scale-95'
                  }`}
              >
                {added ? <CheckCircle2 className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
              </button>
            </div>
          )}
          {item.decision === 'donate' && (
            <button
              onClick={handleAddToCart}
              disabled={added || buying}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-200 relative z-20
                ${added
                  ? 'bg-slate-100 text-slate-400 cursor-default border border-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95'
                }`}
            >
              {added ? 'Claimed' : 'Claim'}
            </button>
          )}
        </div>

        {error && <p className="text-rose-500 text-[10px] font-medium mt-1">{error}</p>}
      </div>
    </div>

    {/* Product Details Modal */}
    {showDetails && (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative animate-scale-up shadow-2xl flex flex-col md:flex-row">
          <button 
            onClick={() => setShowDetails(false)}
            className="absolute top-4 right-4 z-50 text-slate-400 hover:text-slate-900 bg-white/80 backdrop-blur-sm hover:bg-slate-100 p-2 rounded-full transition-colors shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left: Image */}
          <div className="w-full md:w-1/2 h-64 md:h-auto bg-slate-100 relative">
            {imageSrc ? (
              <img src={imageSrc} alt={item.brand} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Recycle className="w-16 h-16 text-slate-300" /></div>
            )}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <span className={`${badge} flex items-center gap-1 shadow-md backdrop-blur-md bg-white/90 px-3 py-1.5 rounded-full text-xs font-bold`}>
                <DecisionIcon className="w-4 h-4" /> {label}
              </span>
            </div>
          </div>

          {/* Right: Details */}
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
            <div className="mb-6">
              <h2 className="font-display font-black text-3xl text-slate-900 mb-2 capitalize">{item.brand || item.category}</h2>
              <p className="text-slate-500 text-lg">{item.description}</p>
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg text-sm font-bold text-green-700 border border-green-200">
                {reviews} <Star className="w-4 h-4 fill-green-700" /> <span className="text-xs text-green-600/70 font-medium ml-1">({reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-bold text-emerald-700 border border-emerald-200">
                🌱 {item.co2_saved}kg CO₂ Saved
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Condition</span>
                <span className={`font-bold capitalize ${conditionColor}`}>{item.condition_label}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Color</span>
                <span className="font-medium text-slate-900">{item.color || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">Material Quality</span>
                <span className="font-medium text-slate-900">{Math.round(item.condition_score * 100)}% Grade</span>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-100">
              <div className="flex items-baseline gap-3 mb-6">
                {item.decision === 'donate' ? (
                  <span className="text-emerald-600 font-black text-4xl">FREE</span>
                ) : (
                  <>
                    <span className="text-slate-900 font-black text-4xl">₹{item.price.toLocaleString()}</span>
                    {item.base_price > item.price && (
                      <span className="text-slate-400 text-lg line-through font-medium">₹{item.base_price.toLocaleString()}</span>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={(e) => handleAddToCart(e)}
                  disabled={added || buying}
                  className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg text-lg
                    ${added 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                      : 'bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-1'
                    }`}
                >
                  {added ? <><CheckCircle2 className="w-6 h-6" /> Added to Cart</> : <><ShoppingCart className="w-6 h-6" /> Add to Cart</>}
                </button>

                {item.decision !== 'donate' && (
                  <button
                    onClick={() => { setShowDetails(false); setShowTryOn(true); }}
                    className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 bg-violet-50 text-violet-600 hover:bg-violet-100 transition-all border border-violet-100"
                  >
                    <Sparkles className="w-5 h-5" /> Try this on virtually
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Virtual Try-On Modal */}
    {showTryOn && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-scale-up shadow-2xl">
          <button 
            onClick={() => { setShowTryOn(false); setTryOnResult(null); setUserImage(null); setUserImagePreview(null); }}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="font-display font-black text-2xl text-slate-900 mb-2 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-500" /> Virtual Try-On
          </h2>
          <p className="text-slate-500 text-sm mb-6">See how this looks on you before you buy! Upload a photo of yourself facing forward.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Input Section */}
            <div className="flex flex-col gap-4">
              <div className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden group min-h-[250px]">
                {userImagePreview ? (
                  <img src={userImagePreview} alt="You" className="absolute inset-0 w-full h-full object-cover z-0" />
                ) : (
                  <>
                    <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                    <span className="text-sm font-bold text-slate-600">Upload Your Photo</span>
                    <span className="text-xs text-slate-400 text-center mt-1">JPEG or PNG format</span>
                  </>
                )}
                <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity z-10 ${userImagePreview ? 'opacity-0 group-hover:opacity-100' : 'opacity-100 bg-transparent'}`}>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition-transform"
                  >
                    {userImagePreview ? 'Change Photo' : 'Select Photo'}
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleUserImageChange} 
                  accept="image/jpeg, image/png" 
                  className="hidden" 
                />
              </div>

              <button
                onClick={handleTryOnSubmit}
                disabled={!userImage || isTryingOn}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  !userImage ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                  isTryingOn ? 'bg-violet-400 text-white cursor-wait' : 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {isTryingOn ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Processing AI...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Generate Try-On</>
                )}
              </button>
            </div>

            {/* Output Section */}
            <div className="flex flex-col gap-4">
              <div className="flex-1 bg-slate-100 rounded-2xl flex flex-col items-center justify-center overflow-hidden border border-slate-200 min-h-[250px] relative">
                {tryOnResult ? (
                  <img src={tryOnResult} alt="Try-On Result" className="absolute inset-0 w-full h-full object-cover" />
                ) : isTryingOn ? (
                  <div className="flex flex-col items-center justify-center text-violet-500 animate-pulse">
                    <Sparkles className="w-10 h-10 mb-2" />
                    <span className="font-bold">Our AI is stitching your new look...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 px-6 text-center">
                    <img src={imageSrc} alt="Item" className="w-20 h-20 object-cover rounded-lg shadow-sm mb-3 opacity-50" />
                    <span className="text-sm font-medium">Your customized preview will appear here.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
