import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDashboardSummary, getDashboardItems, getOrders,
  getImpact, getCertificates, getPassport, isLoggedIn, getUser
} from '../api';
import {
  Package, CheckCircle, Gift, Recycle, TrendingUp, Award, RefreshCw,
  Leaf, ShoppingBag, Globe, Activity, FileText, Download, Camera,
  MapPin, Clock, ShieldCheck, QrCode, Truck, Heart, ArrowRight, Sparkles
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'cyan' }) {
  const colorMap = {
    cyan:    'text-cyan-600 bg-cyan-50 border-cyan-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber:   'text-amber-600 bg-amber-50 border-amber-100',
    violet:  'text-violet-600 bg-violet-50 border-violet-100',
    rose:    'text-rose-600 bg-rose-50 border-rose-100',
  };
  return (
    <div className="glass-card p-5 flex gap-4 items-start hover:border-slate-300 transition-all duration-200 bg-white shadow-sm hover:shadow-md">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-slate-500 text-xs mb-1 font-bold uppercase tracking-wider">{label}</div>
        <div className="text-slate-900 font-black text-2xl leading-none">{value}</div>
        {sub && <div className="text-slate-400 text-xs mt-2 font-medium">{sub}</div>}
      </div>
    </div>
  );
}

function PassportModal({ item, onClose }) {
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getPassport(item._id)
      .then(res => { setPassport(res.data.passport); setLoading(false); })
      .catch(() => setLoading(false));
  }, [item]);
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl text-slate-900">Digital Product Passport</h3>
              <p className="text-xs font-bold text-slate-500 font-mono tracking-widest">ID: {item._id.substring(0,12).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 bg-white rounded-full shadow-sm">
            <CheckCircle className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-10"><RefreshCw className="w-8 h-8 animate-spin text-cyan-500" /></div>
          ) : !passport ? (
            <p className="text-center text-slate-500">No passport data available.</p>
          ) : (
            <div className="space-y-8">
              <div className="flex gap-6 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <img src={item.images?.[0] || 'https://via.placeholder.com/150'} alt="item" className="w-24 h-24 rounded-xl object-cover shadow-sm" />
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-slate-900">{item.brand || item.name}</h4>
                  <p className="text-sm text-slate-500 capitalize">{item.category} • {item.condition_label} Condition</p>
                  <div className="mt-2 flex gap-3">
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md flex items-center gap-1">
                      <Leaf className="w-3 h-3" /> {passport.impact.co2_saved} kg CO₂ Saved
                    </span>
                    {passport.impact.beneficiaries > 0 && (
                      <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-1 rounded-md flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {passport.impact.beneficiaries} Lives Impacted
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Lifecycle Timeline
                </h4>
                <div className="space-y-3">
                  {passport.events.map((evt, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-slate-900 text-sm">{evt.stage}</div>
                        <time className="font-mono text-xs text-slate-400">{new Date(evt.timestamp).toLocaleDateString()}</time>
                      </div>
                      <div className="text-slate-500 text-xs">{evt.metadata}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState({});
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [impact, setImpact] = useState({});
  const [certificates, setCertificates] = useState([]);
  const [itemFilter, setItemFilter] = useState('all');
  const [selectedPassportItem, setSelectedPassportItem] = useState(null);

  const user = getUser();

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sumRes, itemRes, ordRes, impRes, certRes] = await Promise.all([
        getDashboardSummary(),
        getDashboardItems(),
        getOrders(),
        getImpact(),
        getCertificates(),
      ]);
      setSummary(sumRes.data.summary || {});
      setItems(itemRes.data.items || []);
      setOrders(ordRes.data.orders || []);
      setImpact(impRes.data.impact || {});
      setCertificates(certRes.data.certificates || []);
    } catch (err) {
      console.error('Dashboard Load Error:', err);
      setError('Failed to load dashboard data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-24 pb-16 min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-cyan-600" />
          <p className="font-bold text-slate-500 tracking-widest uppercase text-sm">Syncing Data...</p>
        </div>
      </div>
    );
  }

  const filteredItems = itemFilter === 'all' ? items : items.filter(i => i.status === itemFilter);

  return (
    <div className="pt-24 pb-16 min-h-screen bg-[#fafafa]">
      <div className="section-container">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-display font-black text-4xl sm:text-5xl text-slate-900 mb-2">
              My <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-slate-600 font-medium text-lg">
              Welcome back, <strong>{user?.name || 'User'}</strong>. Track your inventory and environmental impact.
            </p>
          </div>
          <button onClick={fetchDashboardData} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-cyan-300 text-slate-700 font-bold rounded-xl shadow-sm hover:shadow-md transition-all self-start md:self-auto">
            <RefreshCw className="w-4 h-4 text-cyan-500" /> Refresh Data
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl font-semibold text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="flex overflow-x-auto hide-scrollbar mb-8 gap-2 bg-slate-200/60 p-1.5 rounded-2xl w-max shadow-inner">
          {[
            { id: 'overview', icon: Activity, label: 'Overview' },
            { id: 'items',    icon: Package,  label: 'My Inventory' },
            { id: 'orders',   icon: ShoppingBag, label: 'My Purchases' },
            { id: 'impact',   icon: Globe,    label: 'Impact Tracker' },
            { id: 'certs',    icon: Award,    label: 'Certificates' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300
                ${activeTab === tab.id ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-cyan-500' : ''}`} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon={TrendingUp} label="Total Earnings"  value={`₹${(summary.total_earnings || 0).toLocaleString()}`} color="emerald" sub="From Resale" />
              <StatCard icon={Leaf}       label="CO₂ Saved"       value={`${summary.co2_saved ?? 0} kg`}   color="cyan"    sub="Overall Impact" />
              <StatCard icon={Gift}       label="Items Donated"   value={summary.items_donated ?? 0}        color="violet"  sub="To Partner NGOs" />
              <StatCard icon={Package}    label="Items Sold"      value={summary.items_sold ?? 0}           color="amber"   sub="Circular Economy" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-card p-6 bg-white">
                <h2 className="font-display font-black text-xl text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                  <Activity className="w-5 h-5 text-cyan-500"/> Smart Insights
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-4 items-center">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><Leaf className="w-5 h-5"/></div>
                    <div>
                      <h4 className="font-bold text-emerald-900">Environmental Impact!</h4>
                      <p className="text-sm text-emerald-700">You saved {summary.co2_saved ?? 0} kg CO₂ — equivalent to planting {Math.max(0, Math.floor((summary.co2_saved || 0) / 10))} trees.</p>
                    </div>
                  </div>
                  <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100 flex gap-4 items-center">
                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-600"><Heart className="w-5 h-5"/></div>
                    <div>
                      <h4 className="font-bold text-violet-900">Your donations reach far.</h4>
                      <p className="text-sm text-violet-700">Your items supported {impact.beneficiaries || 0} beneficiaries across {impact.schools_supported || 0} NGOs.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="glass-card p-6 bg-white">
                <h2 className="font-display font-black text-xl text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                  <Clock className="w-5 h-5 text-amber-500"/> Recent Activity
                </h2>
                <div className="space-y-4">
                  {items.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">No items yet. <a href="/upload" className="text-cyan-600 font-bold">Upload your first item →</a></p>
                  ) : items.slice(0,5).map(i => (
                    <div key={i._id} className="flex gap-3 items-start">
                      <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${i.status==='sold'?'bg-emerald-500':i.status==='donated'?'bg-violet-500':'bg-cyan-500'}`} />
                      <div>
                        <p className="text-sm font-bold text-slate-900 capitalize">{i.brand || i.name} — {i.status}</p>
                        <p className="text-xs text-slate-500">{i.category} • {new Date(i.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Items */}
        {activeTab === 'items' && (
          <div className="glass-card p-6 bg-white animate-fade-in min-h-[60vh]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h2 className="font-display font-black text-2xl text-slate-900 flex items-center gap-2"><Package className="w-6 h-6 text-cyan-500"/> My Inventory</h2>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {['all','listed','sold','donated','refurbishing'].map(f => (
                  <button key={f} onClick={() => setItemFilter(f)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${itemFilter===f?'bg-white shadow-sm text-slate-900':'text-slate-500 hover:text-slate-700'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No items found. <a href="/upload" className="text-cyan-600 font-bold">Upload your first item →</a></p>
                </div>
              ) : filteredItems.map(item => (
                <div key={item._id} className="border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all group bg-white">
                  <div className="h-48 bg-slate-100 relative overflow-hidden">
                    <img src={item.images?.[0] || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80'} alt={item.brand||item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-widest text-slate-700">{item.category}</div>
                    <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-widest text-white ${item.status==='sold'?'bg-emerald-500':item.status==='donated'?'bg-violet-500':item.status==='refurbishing'?'bg-amber-500':'bg-cyan-500'}`}>{item.status}</div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-slate-900 truncate mb-1">{item.brand || item.name}</h3>
                    <div className="flex justify-between items-center text-sm mb-4">
                      <span className="text-slate-500">Cond: <span className="text-slate-800 font-bold capitalize">{item.condition_label}</span></span>
                      <span className="font-black text-slate-900">{item.decision==='donate'?'Donation':`₹${item.price?.toLocaleString()}`}</span>
                    </div>
                    <button onClick={() => setSelectedPassportItem(item)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-cyan-50 text-cyan-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-cyan-200">
                      <ShieldCheck className="w-4 h-4" /> View Digital Passport
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <div className="glass-card p-6 bg-white animate-fade-in min-h-[60vh]">
            <h2 className="font-display font-black text-2xl text-slate-900 flex items-center gap-2 mb-8"><ShoppingBag className="w-6 h-6 text-emerald-500"/> My Purchases</h2>
            {orders.length === 0 ? (
              <div className="text-center py-20">
                <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900">No Orders Yet</h3>
                <p className="text-slate-500">Explore the <a href="/shop" className="text-cyan-600 font-bold">marketplace</a> to find sustainable gems.</p>
              </div>
            ) : orders.map(order => (
              <div key={order._id} className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 flex flex-col md:flex-row gap-6 hover:bg-white hover:shadow-md transition-all mb-4">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-black text-lg text-slate-900">Order #{order._id.substring(0,8).toUpperCase()}</h3>
                      <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()} • {order.items?.length} Item(s)</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-xl text-slate-900">₹{order.total_amount?.toLocaleString()}</span>
                      <p className={`text-xs font-bold uppercase mt-1 ${order.status==='Delivered'?'text-emerald-500':'text-amber-500'}`}>{order.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mt-3">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span>Tracking: {order.tracking_id || 'Pending'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Impact */}
        {activeTab === 'impact' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon={Globe}   label="Total CO₂ Saved"   value={`${impact.co2_saved || 0} kg`}         color="emerald" sub="Emissions Prevented" />
              <StatCard icon={Recycle} label="Waste Diverted"    value={`${impact.waste_diverted_kg || 0} kg`}  color="amber"   sub="Kept from landfills" />
              <StatCard icon={Heart}   label="Beneficiaries"     value={impact.beneficiaries || 0}              color="violet"  sub="Lives improved" />
              <StatCard icon={MapPin}  label="NGOs Supported"    value={impact.schools_supported || 0}          color="cyan"    sub="Verified institutions" />
            </div>
            <div className="glass-card p-6 bg-white">
              <h2 className="font-display font-black text-2xl text-slate-900 flex items-center gap-2 mb-8 border-b border-slate-100 pb-4">
                <Camera className="w-6 h-6 text-violet-500"/> Visual Proof of Impact
              </h2>
              {!impact.proofs?.length ? (
                <p className="text-center text-slate-500 py-10">Donate items to see real-world impact photos from beneficiaries.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {impact.proofs.map((proof, idx) => (
                    <div key={idx} className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all group">
                      <div className="h-64 bg-slate-200 relative overflow-hidden">
                        <img src={proof.media_url} alt="Impact" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4 text-white">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-violet-500/80 backdrop-blur px-2 py-1 rounded flex items-center gap-1 w-max mb-2">
                            <MapPin className="w-3 h-3" /> {proof.location}
                          </span>
                          <h3 className="font-bold text-lg">{proof.brand}</h3>
                        </div>
                      </div>
                      <div className="p-5 bg-white">
                        <p className="text-slate-600 text-sm italic mb-3">"{proof.description}"</p>
                        <div className="text-xs font-bold text-slate-400 uppercase">{new Date(proof.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Certificates */}
        {activeTab === 'certs' && (
          <div className="glass-card p-6 bg-white animate-fade-in min-h-[60vh]">
            <h2 className="font-display font-black text-2xl text-slate-900 flex items-center gap-2 mb-8 border-b border-slate-100 pb-4">
              <Award className="w-6 h-6 text-amber-500"/> Impact Certificates
            </h2>
            {certificates.length === 0 ? (
              <div className="text-center py-20">
                <Award className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900">No Certificates Yet</h3>
                <p className="text-slate-500">Donate items to verified NGOs to earn impact certificates.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map(cert => (
                  <div key={cert._id} className="relative bg-gradient-to-br from-slate-50 to-white border-2 border-slate-100 rounded-3xl p-8 hover:shadow-xl hover:border-amber-200 transition-all overflow-hidden">
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-6">
                      <Award className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-xl text-slate-900 mb-1">Donation Certificate</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Issued by {cert.ngo_name}</p>
                    <div className="space-y-3 mb-6">
                      <div className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between shadow-sm">
                        <span className="text-xs text-slate-500 font-bold">Item</span>
                        <span className="text-sm font-black text-slate-900">{cert.item_id?.brand || cert.item_id?.name || 'Donation'}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between shadow-sm">
                        <span className="text-xs text-slate-500 font-bold">CO₂ Saved</span>
                        <span className="text-sm font-black text-emerald-600">{cert.impact_metrics?.co2_saved} kg</span>
                      </div>
                    </div>
                    <button className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedPassportItem && (
        <PassportModal item={selectedPassportItem} onClose={() => setSelectedPassportItem(null)} />
      )}
    </div>
  );
}
