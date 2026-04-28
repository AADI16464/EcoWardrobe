import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Upload, LayoutDashboard, Menu, X, LogOut, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import logoSrc from '../assets/logo.png';
import { isLoggedIn, getUser, logout } from '../api';

const navLinks = [
  { to: '/',         label: 'Home',         exact: true },
  { to: '/shop',     label: 'Shop',         icon: ShoppingBag },
  { to: '/upload',   label: 'Sell / Donate',icon: Upload },
  { to: '/dashboard',label: 'Dashboard',    icon: LayoutDashboard },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const location = useLocation();
  const user = getUser();

  useEffect(() => { setMobileOpen(false); setLoggedIn(isLoggedIn()); }, [location]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = () => { logout(); setLoggedIn(false); };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm' : 'bg-transparent'
    }`}>
      <div className="section-container">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logoSrc} alt="EcoWardrobe" className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-200" />
            <span className="font-display font-bold text-xl hidden sm:inline text-slate-800">
              Eco<span className="gradient-text">Wardrobe</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, exact }) => (
              <NavLink key={to} to={to} end={exact}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive ? 'bg-slate-100 text-slate-900 border border-slate-200'
                             : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >{label}</NavLink>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {loggedIn ? (
              <>
                <span className="text-sm text-slate-500 font-medium">Hi, <strong>{user?.name?.split(' ')[0]}</strong></span>
                <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-rose-600 transition-colors">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-cyan-600 transition-colors">
                <LogIn className="w-4 h-4" /> Sign In
              </Link>
            )}
            <Link to="/upload" className="btn-brand text-sm py-2 px-5">+ List Item</Link>
          </div>

          <button className="md:hidden text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-md">
          <div className="section-container py-4 flex flex-col gap-1">
            {navLinks.map(({ to, label, exact }) => (
              <NavLink key={to} to={to} end={exact}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >{label}</NavLink>
            ))}
            <div className="h-px bg-slate-100 my-2 mx-2" />
            {loggedIn ? (
              <button onClick={handleLogout} className="px-4 py-3 text-left rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50">
                Sign Out
              </button>
            ) : (
              <Link to="/login" className="px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Sign In</Link>
            )}
            <Link to="/upload" className="btn-brand text-sm py-2 mt-2 text-center mx-2">+ List Item</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
