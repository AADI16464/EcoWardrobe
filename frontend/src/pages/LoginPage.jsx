import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import logoSrc from '../assets/logo.png';

function useParallax(speed = 0.15) {
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

export default function LoginPage() {
  const parallaxY = useParallax(0.15);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      // Save token and user info (for basic MVP integration)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      navigate('/dashboard');
    } catch (err) {
      console.error('Login Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#fafafa] pt-16">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-[500px] h-[500px] rounded-full bg-cyan-100/50 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-violet-100/50 blur-3xl" />
      </div>

      {/* Parallax watermark logo */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5"
        style={{ transform: `translateY(${parallaxY}px)` }}
      >
        <img src={logoSrc} alt="" aria-hidden="true" className="w-[min(80vw,800px)] h-auto object-contain" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 mt-8 mb-12">
        {/* Logo and Name Above Box */}
        <div className="flex flex-col items-center mb-8">
          <img src={logoSrc} alt="EchoWardrobe Logo" className="w-20 h-20 object-contain mb-4 animate-fade-in" />
          <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 text-center animate-slide-up">
            Echo<span className="gradient-text">Wardrobe</span>
          </h1>
        </div>

        {/* Login Box */}
        <div className="glass-card p-8 sm:p-10 bg-white shadow-md animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
          <p className="text-slate-600 text-sm mb-8">Please sign in to your account.</p>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-slate-700 text-sm font-semibold mb-2 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="eco-input pl-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-700 text-sm font-semibold">Password</label>
                <a href="#" className="text-xs text-cyan-600 hover:text-cyan-700 font-medium">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="eco-input pl-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-brand w-full py-3.5 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-violet-600 hover:text-violet-700 font-semibold transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
