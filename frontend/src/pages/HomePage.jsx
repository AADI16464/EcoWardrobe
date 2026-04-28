import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import {
  ArrowRight, Recycle, Tag, Heart, School, Home,
  TrendingUp, Shield, Zap, ChevronDown, Leaf,
  Cpu, Package, Award, Sparkles,
} from 'lucide-react';
import { getStats } from '../api';
import logoSrc from '../assets/logo.png';

/* ════════════════════════════════════════════
   Parallax logo watermark hook
════════════════════════════════════════════ */
function useParallax(speed = 0.35) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let raf;
    const onScroll = () => {
      raf = requestAnimationFrame(() => setOffset(window.scrollY * speed));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [speed]);
  return offset;
}

function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        let start = 0;
        const step = (ts) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / 1800, 1);
          setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref} className="tabular-nums">{count.toLocaleString()}{suffix}</span>;
}

/* ════════════════════════════════════════════
   Service cards data
════════════════════════════════════════════ */
const services = [
  {
    icon: Tag,
    title: 'Resell',
    gradient: 'from-cyan-50 via-cyan-50/50 to-transparent',
    border: 'border-cyan-200/60',
    glow: 'group-hover:shadow-md',
    iconGrad: 'from-cyan-500 to-cyan-600',
    threshold: 'Score > 70%',
    description: 'Items in great condition get a second life on our marketplace. AI scores condition and sets a fair price instantly.',
  },
  {
    icon: Recycle,
    title: 'Refurbish',
    gradient: 'from-violet-50 via-violet-50/50 to-transparent',
    border: 'border-violet-200/60',
    glow: 'group-hover:shadow-md',
    iconGrad: 'from-violet-500 to-purple-600',
    threshold: 'Score 40–70%',
    description: 'Worn but salvageable items are professionally refurbished, extending their lifespan and reducing waste.',
  },
  {
    icon: Heart,
    title: 'Donate',
    gradient: 'from-emerald-50 via-emerald-50/50 to-transparent',
    border: 'border-emerald-200/60',
    glow: 'group-hover:shadow-md',
    iconGrad: 'from-emerald-500 to-emerald-600',
    threshold: 'Score < 40%',
    description: 'End-of-life items are donated to schools and orphanages, creating real community impact with every contribution.',
  },
];

/* ════════════════════════════════════════════
   AI pipeline steps
════════════════════════════════════════════ */
const pipeline = [
  { icon: Package, label: 'Item Input', sub: 'Images + Metadata', color: 'text-cyan-600', bg: 'bg-white border-cyan-200 shadow-sm' },
  { icon: Cpu,     label: 'AI Engine',  sub: 'CNN + XGBoost',    color: 'text-violet-600', bg: 'bg-white border-violet-200 shadow-sm' },
  { icon: Sparkles,label: 'Routing',    sub: 'Multi-objective',  color: 'text-purple-600', bg: 'bg-white border-purple-200 shadow-sm' },
  { icon: Award,   label: 'DPP',        sub: 'Blockchain stamp', color: 'text-emerald-600',bg: 'bg-white border-emerald-200 shadow-sm' },
];

/* ════════════════════════════════════════════
   Beneficiaries
════════════════════════════════════════════ */
const beneficiaries = [
  { icon: School, title: 'Schools',    description: 'Refurbished electronics deployed to government schools, with intern-led installation & training.', stat: '120+', statLabel: 'Schools digitised' },
  { icon: Home,   title: 'Orphanages', description: 'Clothing donations provide warmth and dignity to children in care homes and old-age homes.',       stat: '45+',  statLabel: 'Homes supported' },
];

export default function HomePage() {
  const [stats, setStats] = useState(null);
  const parallaxY = useParallax(0.28);

  useEffect(() => {
    getStats()
      .then(r => setStats(r.data.stats))
      .catch(() => setStats({
        total_items: 1240, items_sold: 890,
        items_donated: 350, co2_saved: 4320,
      }));
  }, []);

  return (
    <div className="relative overflow-x-hidden bg-[#fafafa]">
      
      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        
        {/* ── Background blobs ── */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-60 -left-60 w-[700px] h-[700px] rounded-full
                          bg-cyan-100/50 blur-3xl" />
          <div className="absolute top-1/4 -right-40 w-[500px] h-[500px] rounded-full
                          bg-violet-100/50 blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 w-[600px] h-[400px] rounded-full
                          bg-emerald-100/40 blur-3xl" />
        </div>

        {/* ── Parallax watermark logo ── */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5"
          style={{ transform: `translateY(${parallaxY}px)` }}
        >
          <img
            src={logoSrc}
            alt=""
            aria-hidden="true"
            className="w-[min(80vw,800px)] h-auto object-contain"
          />
        </div>

        {/* ── Hero content ── */}
        <div className="section-container relative z-10 text-center py-24">
          <div className="mb-6 animate-fade-in">
             <img src={logoSrc} alt="Logo" className="w-32 h-32 mx-auto object-contain" />
          </div>

          <h1 className="font-display font-black leading-[1.04] tracking-tight mb-6 animate-slide-up
                         text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-slate-900">
            Echo<span className="gradient-text">Wardrobe</span>
          </h1>

          <p className="text-slate-600 text-lg sm:text-xl max-w-3xl mx-auto mb-12 leading-relaxed animate-slide-up">
            Sell your stylish clothes, donate with purpose, and shop sustainably. <br className="hidden sm:block" />
            Combining fashion, affordability, and social impact.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up mb-16">
            <Link
              to="/upload"
              className="btn-brand text-base px-8 py-4 flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              Get Started
            </Link>
            <Link
              to="/shop"
              className="flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
            >
              Browse Items
            </Link>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-slate-400">
            <ChevronDown className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          STATS BELT
      ══════════════════════════════════════ */}
      {stats && (
        <section className="relative py-12 border-y border-slate-200 bg-white">
          <div className="section-container relative">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: stats.total_items,   label: 'Items Listed',  suffix: '+',  col: 'from-cyan-500 to-cyan-600' },
                { value: stats.items_sold,    label: 'Items Resold',  suffix: '+',  col: 'from-violet-500 to-purple-600' },
                { value: stats.items_donated, label: 'Items Donated', suffix: '+',  col: 'from-emerald-500 to-emerald-600' },
                { value: stats.co2_saved,     label: 'kg CO₂ Saved',  suffix: ' kg', col: 'from-cyan-500 to-emerald-500' },
              ].map(({ value, label, suffix, col }) => (
                <div key={label} className="text-center group">
                  <div className={`font-display font-black text-3xl sm:text-4xl
                                  bg-gradient-to-r ${col} bg-clip-text text-transparent`}>
                    <Counter target={value} suffix={suffix} />
                  </div>
                  <div className="text-slate-500 text-sm mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════ */}
      <section className="py-28 relative">
        <div
          className="absolute inset-0 flex items-center justify-end pr-0 pointer-events-none opacity-[0.02]"
          style={{ transform: `translateY(${-parallaxY * 0.5}px)` }}
        >
          <img
            src={logoSrc}
            alt=""
            aria-hidden="true"
            className="w-[min(60vw,500px)] h-auto object-contain"
          />
        </div>

        <div className="section-container relative z-10">
          <div className="text-center mb-16">
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-slate-900 mb-4">
              How EchoWardrobe Works
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              Our AI engine analyses each item's condition and routes it to the best outcome automatically.
            </p>
          </div>

          {/* AI Pipeline strip */}
          <div className="flex flex-wrap justify-center items-center gap-3 mb-14">
            {pipeline.map(({ icon: Icon, label, sub, color, bg }, i) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`flex flex-col items-center p-4 rounded-2xl border ${bg} w-32`}>
                  <Icon className={`w-6 h-6 ${color} mb-1`} />
                  <span className="text-slate-800 text-xs font-semibold">{label}</span>
                  <span className="text-slate-500 text-[10px] text-center leading-tight">{sub}</span>
                </div>
                {i < pipeline.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-slate-300 shrink-0 hidden sm:block" />
                )}
              </div>
            ))}
          </div>

          {/* Service cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {services.map(({ icon: Icon, title, gradient, border, glow, iconGrad, threshold, description }) => (
              <div
                key={title}
                className={`group relative glass-card p-8 bg-gradient-to-br ${gradient} border ${border}
                            hover:-translate-y-1 transition-all duration-300 ${glow} overflow-hidden bg-white`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconGrad} flex items-center justify-center mb-6 shadow-sm`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-bold text-2xl text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm mb-6">{description}</p>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">AI Threshold</span>
                  <span className="font-mono text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md">{threshold}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DIGITAL IMPACT
      ══════════════════════════════════════ */}
      <section className="py-28 relative overflow-hidden bg-white border-t border-slate-200">
        <div className="section-container relative">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-3 block">
              Community Impact
            </span>
            <h2 className="font-display font-bold text-4xl sm:text-5xl text-slate-900 mb-4">
              Digital <span className="gradient-text">Impact</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              Every donation creates a verifiable digital impact trail.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            {beneficiaries.map(({ icon: Icon, title, description, stat, statLabel }) => (
              <div key={title}
                className="glass-card p-8 flex gap-6 hover:shadow-md transition-all duration-300 group bg-white"
              >
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-7 h-7 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">{description}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-3xl font-display text-slate-900">
                      {stat}
                    </span>
                    <span className="text-slate-500 text-sm">{statLabel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-4xl mx-auto glass-card p-8 hover:shadow-md transition-all duration-300 bg-white">
            <div className="flex flex-col md:flex-row items-center gap-8 relative">
              <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-cyan-100/50 animate-pulse-slow" />
                <div className="absolute inset-4 rounded-full bg-violet-100/50 animate-spin-slow" />
                <img src={logoSrc} alt="" className="relative w-16 h-16 object-contain animate-float" />
              </div>
              <div>
                <h3 className="font-display font-bold text-2xl text-slate-900 mb-3">Carbon Impact Tracker</h3>
                <p className="text-slate-600 leading-relaxed mb-5 text-sm">
                  Each item you list generates a digital carbon certificate anchored on blockchain.
                  Our AI calculates the exact CO₂ saved — on average{' '}
                  <span className="text-emerald-600 font-semibold">3.5 kg per clothing item</span> and{' '}
                  <span className="text-cyan-600 font-semibold">5.2 kg per electronic</span>.
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  {[
                    { label: 'Blockchain-anchored', color: 'text-violet-600', dot: 'bg-violet-500' },
                    { label: 'CO₂ certified',       color: 'text-emerald-600',    dot: 'bg-emerald-500' },
                    { label: 'SDG-aligned', color: 'text-cyan-600',   dot: 'bg-cyan-500' },
                  ].map(({ label, color, dot }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                      <span className={`${color} font-medium`}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════ */}
      <section className="py-24 bg-[#fafafa]">
        <div className="section-container">
          <div className="relative rounded-3xl bg-slate-900 px-8 py-16 text-center overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ transform: `translateY(${parallaxY * 0.1}px)` }}
            >
              <img src={logoSrc} alt="" aria-hidden
                   className="w-72 h-auto object-contain opacity-5" />
            </div>

            <div className="relative z-10">
              <h2 className="font-display font-black text-4xl sm:text-5xl text-white mb-4">
                Ready to make a{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                  difference?
                </span>
              </h2>
              <p className="text-slate-300 text-lg mb-10 max-w-lg mx-auto">
                Join thousands of eco-conscious people reducing textile waste one item at a time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/upload" className="btn-brand text-base px-8 py-4">
                  Get Started
                </Link>
                <Link
                  to="/shop"
                  className="px-8 py-4 rounded-xl font-semibold text-white border border-white/20 hover:bg-white/10 transition-all duration-200"
                >
                  Browse Items
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
