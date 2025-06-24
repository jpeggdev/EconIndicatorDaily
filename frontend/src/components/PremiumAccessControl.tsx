'use client';

import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Lock, Crown, AlertTriangle, Zap, Star, TrendingUp, Shield } from 'lucide-react';

interface PremiumAccessControlProps {
  children: ReactNode;
  requiredIndicatorCount?: number;
  requiresPro?: boolean;
  showUpgrade?: boolean;
}

export default function PremiumAccessControl({ 
  children, 
  requiredIndicatorCount = 1, 
  requiresPro = false,
  showUpgrade = true 
}: PremiumAccessControlProps) {
  const { data: session } = useSession();

  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-gradient-to-br from-slate-100 to-gray-200 rounded-3xl border border-gray-300 shadow-2xl overflow-hidden"
      >
        {/* Metallic Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-gray-100 to-slate-200 opacity-80"></div>
        
        {/* 3D Lock Icon */}
        <div className="relative p-8 text-center space-y-6">
          <motion.div
            animate={{ 
              rotateY: [0, 10, -10, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center shadow-xl"
          >
            <Lock className="w-10 h-10 text-white" />
          </motion.div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-black text-gray-800 tracking-tight">
              AUTHENTICATION REQUIRED
            </h3>
            <p className="text-gray-600 font-medium">
              Please sign in to access premium economic data
            </p>
          </div>
          
          {/* Metallic Shine */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 opacity-0 animate-pulse"></div>
        </div>
      </motion.div>
    );
  }

  const user = session.user;
  const isProUser = user.subscriptionStatus === 'pro' || user.subscriptionStatus === 'enterprise';
  const maxIndicators = user.maxIndicators || 5;

  // Check if pro subscription is required
  if (requiresPro && !isProUser) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        className="relative bg-gradient-to-br from-orange-100 to-yellow-200 rounded-3xl border border-orange-300 shadow-2xl overflow-hidden group"
      >
        {/* Premium Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-200 via-orange-100 to-yellow-200 opacity-90"></div>
        
        {/* Floating Crown */}
        <div className="absolute top-4 right-4 opacity-20">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Crown className="w-16 h-16 text-orange-600" />
          </motion.div>
        </div>
        
        <div className="relative p-8 text-center space-y-6">
          <motion.div
            animate={{ 
              rotateY: [0, 15, -15, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl"
          >
            <Crown className="w-10 h-10 text-white" />
          </motion.div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-black text-orange-800 tracking-tight">
              PRO SUBSCRIPTION REQUIRED
            </h3>
            <p className="text-orange-700 font-medium leading-relaxed">
              This premium feature is exclusive to Pro subscribers
            </p>
          </div>
          
          {showUpgrade && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-black rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Zap className="relative w-6 h-6 mr-3" />
              <span className="relative text-lg tracking-wider">UPGRADE TO PRO</span>
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  // Check indicator count limits for free users
  if (!isProUser && requiredIndicatorCount > maxIndicators) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        className="relative bg-gradient-to-br from-red-100 to-pink-200 rounded-3xl border border-red-300 shadow-2xl overflow-hidden group"
      >
        {/* Alert Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <motion.div
            animate={{ 
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="w-full h-full bg-gradient-to-r from-transparent via-red-300/30 to-transparent"
            style={{ backgroundSize: '200% 200%' }}
          />
        </div>
        
        {/* Warning Icon */}
        <div className="absolute top-4 right-4 opacity-20">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AlertTriangle className="w-16 h-16 text-red-600" />
          </motion.div>
        </div>
        
        <div className="relative p-8 text-center space-y-6">
          <motion.div
            animate={{ 
              rotateZ: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-20 h-20 mx-auto bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl"
          >
            <AlertTriangle className="w-10 h-10 text-white" />
          </motion.div>
          
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-red-800 tracking-tight">
              LIMIT REACHED
            </h3>
            <div className="space-y-2">
              <p className="text-red-700 font-bold">
                You&apos;ve reached your limit of <span className="text-xl font-black">{maxIndicators}</span> indicators
              </p>
              <div className="flex items-center justify-center gap-2 text-red-600">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-wider">FREE PLAN</span>
              </div>
            </div>
            <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
              <div className="flex items-center justify-center gap-2 text-red-700 mb-2">
                <TrendingUp className="w-5 h-5" />
                <Star className="w-5 h-5" />
                <Zap className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-red-700">
                Upgrade to PRO for 50+ indicators & unlimited insights!
              </p>
            </div>
          </div>
          
          {showUpgrade && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white font-black rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Crown className="relative w-6 h-6 mr-3" />
              <span className="relative text-lg tracking-wider">UPGRADE NOW</span>
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  // User has access - render the children with a premium glow effect
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group"
    >
      {/* Premium Access Glow */}
      {isProUser && (
        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
      )}
      <div className="relative">
        {children}
      </div>
    </motion.div>
  );
}