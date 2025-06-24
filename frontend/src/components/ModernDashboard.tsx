'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EconomicIndicator } from '@/types/indicator';
import PremiumIndicatorCard from './PremiumIndicatorCard';
import PremiumAccessControl from './PremiumAccessControl';
import { useAccessControl } from './AccessControl';
import { RefreshCw, Sparkles, TrendingUp, DollarSign, BarChart3, Crown, Shield, Zap } from 'lucide-react';
import AuthButton from './AuthButton';
import PremiumSubscriptionBanner from './PremiumSubscriptionBanner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ModernDashboard() {
  const [indicators, setIndicators] = useState<EconomicIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  
  const { isProUser, maxIndicators, session } = useAccessControl();

  const fetchIndicators = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/indicators`);
      const data = await response.json();
      
      if (data.success) {
        setIndicators(data.data);
        setError(null);
      } else {
        setError('Failed to fetch indicators');
      }
    } catch (err) {
      setError('Unable to connect to the API');
      console.error('Error fetching indicators:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncIndicators = async () => {
    try {
      setSyncing(true);
      const response = await fetch(`${API_BASE_URL}/api/indicators/sync`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchIndicators();
      } else {
        setError('Failed to sync indicators');
      }
    } catch (err) {
      setError('Unable to sync indicators');
      console.error('Error syncing indicators:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchIndicators();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-8"
        >
          {/* Premium Loading Animation */}
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 mx-auto"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-700 p-1">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </motion.div>
            
            {/* Floating Elements */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-blue-400 rounded-full"
                animate={{
                  y: [-20, -40, -20],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
                style={{
                  left: `${30 + i * 20}%`,
                  top: '50%'
                }}
              />
            ))}
          </div>
          
          <div className="space-y-3">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              LOADING ECONOMIC DATA
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-gray-600 font-medium"
            >
              Fetching the latest market insights...
            </motion.p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <PremiumSubscriptionBanner />
      
      {/* Premium Header */}
      <header className="relative bg-white/80 backdrop-blur-xl shadow-2xl border-b border-white/20">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-600/5"></div>
        
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-xl"
          />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-4">
                {/* Premium Logo */}
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <span className="text-3xl">📊</span>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full shadow-lg"
                  />
                </div>
                
                <div>
                  <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                    ECON INDICATOR
                  </h1>
                  <p className="text-xl font-bold text-gray-700 tracking-wide">
                    DAILY MARKET INTELLIGENCE
                  </p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              {/* Sync Button */}
              <motion.button
                onClick={syncIndicators}
                disabled={syncing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-600 text-white font-black rounded-2xl shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
              >
                {/* Metallic Shine */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <motion.div
                  animate={syncing ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: syncing ? Infinity : 0, ease: "linear" }}
                >
                  <RefreshCw className="relative w-6 h-6 mr-3" />
                </motion.div>
                <span className="relative text-lg tracking-wider">
                  {syncing ? 'SYNCING...' : 'SYNC DATA'}
                </span>
              </motion.button>
              
              <AuthButton />
            </motion.div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Premium Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12"
        >
          {/* Total Indicators */}
          <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all"></div>
            <div className="relative text-center space-y-2">
              <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-3xl font-black text-gray-900">{indicators.length}</div>
              <div className="text-sm font-bold text-gray-600 uppercase tracking-wider">Indicators</div>
            </div>
          </div>

          {/* Live Data */}
          <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 group-hover:from-emerald-500/10 group-hover:to-teal-500/10 transition-all"></div>
            <div className="relative text-center space-y-2">
              <TrendingUp className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-3xl font-black text-gray-900">
                {indicators.filter(i => i.latestValue !== null).length}
              </div>
              <div className="text-sm font-bold text-gray-600 uppercase tracking-wider">Live Data</div>
            </div>
          </div>

          {/* Update Status */}
          <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 group-hover:from-indigo-500/10 group-hover:to-blue-500/10 transition-all"></div>
            <div className="relative text-center space-y-2">
              <Zap className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <div className="text-3xl font-black text-gray-900">REAL-TIME</div>
              <div className="text-sm font-bold text-gray-600 uppercase tracking-wider">Updates</div>
            </div>
          </div>

          {/* Data Source */}
          <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all"></div>
            <div className="relative text-center space-y-2">
              <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-3xl font-black text-gray-900">FRED</div>
              <div className="text-sm font-bold text-gray-600 uppercase tracking-wider">Source</div>
            </div>
          </div>

          {/* User Status */}
          {session && (
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-300">
              <div className={`absolute inset-0 bg-gradient-to-br ${isProUser ? 'from-yellow-500/5 to-orange-500/5 group-hover:from-yellow-500/10 group-hover:to-orange-500/10' : 'from-blue-500/5 to-cyan-500/5 group-hover:from-blue-500/10 group-hover:to-cyan-500/10'} transition-all`}></div>
              <div className="relative text-center space-y-2">
                {isProUser ? (
                  <Crown className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                ) : (
                  <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                )}
                <div className="text-3xl font-black text-gray-900">
                  {isProUser ? '∞' : maxIndicators}
                </div>
                <div className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                  {isProUser ? 'Pro Access' : 'Free Access'}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative mb-8 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mr-4">
                  <span className="text-red-600 font-bold text-xl">!</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-red-800">SYSTEM ERROR</h3>
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicators Grid */}
        {indicators.length === 0 && !error ? (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative text-center py-20"
          >
            <div className="max-w-md mx-auto space-y-8">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                <span className="text-6xl">📈</span>
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black text-gray-900">NO DATA YET</h2>
                <p className="text-gray-600 font-medium text-lg">Let&apos;s sync some fresh economic intelligence!</p>
              </div>
              <motion.button
                onClick={syncIndicators}
                disabled={syncing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative inline-flex items-center px-10 py-5 bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-600 text-white font-black rounded-2xl shadow-2xl hover:shadow-3xl disabled:opacity-50 transition-all duration-300"
              >
                <motion.div
                  animate={syncing ? { rotate: 360 } : {}}
                  transition={{ duration: 1, repeat: syncing ? Infinity : 0, ease: "linear" }}
                >
                  <RefreshCw className="w-7 h-7 mr-4" />
                </motion.div>
                <span className="text-xl tracking-wider">
                  {syncing ? 'SYNCING DATA...' : 'SYNC INITIAL DATA'}
                </span>
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {indicators.map((indicator, index) => (
              <PremiumAccessControl
                key={indicator.id}
                requiredIndicatorCount={index + 1}
                showUpgrade={true}
              >
                <PremiumIndicatorCard indicator={indicator} index={index} />
              </PremiumAccessControl>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}