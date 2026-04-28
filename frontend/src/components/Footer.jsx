import { Link } from 'react-router-dom';
import { Leaf, Github, Twitter, Instagram, Mail } from 'lucide-react';
import logoSrc from '../assets/logo.png';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-20">
      <div className="section-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img src={logoSrc} alt="EchoWardrobe" className="h-8 w-auto object-contain" />
              <span className="font-display font-bold text-xl text-slate-800">
                Echo<span className="gradient-text">Wardrobe</span>
              </span>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed max-w-xs">
              Circular fashion & electronics marketplace powered by AI. Every item you list
              reduces CO₂ emissions and helps communities in need.
            </p>
            <div className="flex gap-3 mt-6">
              {[Twitter, Instagram, Github, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center
                             text-slate-500 hover:text-cyan-600 hover:border-cyan-300 hover:bg-cyan-50 transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-slate-900 font-semibold mb-4 text-sm uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2.5">
              {[
                { to: '/shop', label: 'Shop' },
                { to: '/upload', label: 'Sell / Donate' },
                { to: '/dashboard', label: 'Dashboard' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-slate-600 hover:text-cyan-600 text-sm transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-slate-900 font-semibold mb-4 text-sm uppercase tracking-wider">Impact</h4>
            <ul className="space-y-2.5">
              {['Schools Program', 'Orphanage Support', 'CO₂ Tracker', 'Certificates'].map(label => (
                <li key={label}>
                  <span className="text-slate-600 text-sm cursor-default">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} EchoWardrobe. All rights reserved.
          </p>
          <p className="text-slate-500 text-xs flex items-center gap-1">
            <Leaf className="w-3 h-3 text-emerald-500" />
            Carbon-neutral infrastructure
          </p>
        </div>
      </div>
    </footer>
  );
}
