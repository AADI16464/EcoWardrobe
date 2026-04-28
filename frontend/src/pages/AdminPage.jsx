import React, { useState, useEffect } from 'react';
import { getAdminStats } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Package, ShoppingBag, DollarSign, Heart } from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await getAdminStats();
      setStats(res.data);
    } catch (err) {
      setError('Failed to load admin stats. Ensure you are logged in as admin.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-xl font-bold">Loading Admin Dashboard...</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-xl text-rose-500 font-bold">{error}</div>;
  if (!stats) return null;

  return (
    <div className="pt-24 pb-16 min-h-screen bg-[#fafafa]">
      <div className="section-container max-w-7xl mx-auto px-4">
        
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-4xl text-slate-900 leading-tight">Admin Dashboard</h1>
            <p className="text-slate-500">Track your profit, orders, and platform impact</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <h3 className="font-black text-2xl text-slate-900">₹{stats.totalRevenue?.toLocaleString()}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Platform Profit</p>
              <h3 className="font-black text-2xl text-slate-900">₹{stats.platformProfit?.toLocaleString()}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-100 flex items-center justify-center text-cyan-600">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
              <h3 className="font-black text-2xl text-slate-900">{stats.totalOrders}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
              <Heart className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Donations</p>
              <h3 className="font-black text-2xl text-slate-900">{stats.totalDonations}</h3>
            </div>
          </div>

        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-xl text-slate-900 mb-6">Revenue Overview</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="sales" name="Revenue (₹)" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-xl text-slate-900 mb-6">Donations Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip cursor={{stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Line type="monotone" dataKey="donations" name="Items Donated" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
