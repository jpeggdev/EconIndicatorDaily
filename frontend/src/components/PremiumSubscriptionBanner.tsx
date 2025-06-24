'use client';

import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, ArrowRight, Sparkles, Zap, Star, TrendingUp } from 'lucide-react';
import { useState } from 'react';

export default function PremiumSubscriptionBanner() {
  const { data: session, update } = useSession();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (!session || session.user?.subscriptionStatus === 'pro') {
    return null;
  }

  const handleUpgradeClick = async () => {
    if (!session?.user?.id) return;
    
    setIsUpgrading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/upgrade/${session.user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stripeData: {
            customerId: `stripe_${session.user.id}`,
            subscriptionId: `sub_${Date.now()}`,
          },
        }),
      });

      if (response.ok) {
        await update();
        alert('Successfully upgraded to Pro! (Demo)');
      } else {
        throw new Error('Failed to upgrade');
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      alert('Failed to upgrade subscription');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden"
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <motion.div
          animate={{ 
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{
            backgroundSize: '200% 200%'
          }}
        />
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full"
            animate={{
              x: ['-10%', '110%'],
              y: [
                Math.random() * 100 + '%',
                Math.random() * 100 + '%'
              ],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
            style={{
              left: '-10%',
              top: Math.random() * 100 + '%'
            }}
          />
        ))}
      </div>

      {/* Metallic Accent Strip */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-6"
          >
            {/* Premium Status Indicator */}
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <Crown className="w-8 h-8 text-yellow-300" />
              </motion.div>
              
              {/* Floating sparkles */}
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-5 h-5 text-yellow-200" />
              </motion.div>
            </div>
            
            <div className="space-y-2">
              {/* Bold Status Text */}
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ pulse: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="px-4 py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/30"
                >
                  <span className="text-sm font-black uppercase tracking-wider">FREE PLAN</span>
                </motion.div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-300" />
                  <span className="text-sm font-bold">Limited Access</span>
                </div>
              </div>
              
              {/* Features List */}
              <p className="text-sm font-medium text-white/90 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Unlock 50+ indicators, daily alerts & AI insights with</span>
                <span className="font-black text-yellow-300">PRO</span>
                <Zap className="w-4 h-4 text-yellow-300" />
              </p>
            </div>
          </motion.div>
          
          {/* Premium Upgrade Button */}
          <motion.button
            onClick={handleUpgradeClick}
            disabled={isUpgrading}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative inline-flex items-center px-8 py-4 bg-white text-blue-600 font-black rounded-2xl shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
          >
            {/* Metallic Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-gray-50 to-white"></div>
            
            {/* Animated Background on Hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-yellow-100 via-orange-100 to-yellow-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />
            
            {/* Content */}
            <div className="relative flex items-center gap-3">
              <motion.div
                animate={isUpgrading ? { rotate: 360 } : {}}
                transition={{ duration: 1, repeat: isUpgrading ? Infinity : 0, ease: "linear" }}
              >
                <Zap className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </motion.div>
              
              <span className="text-lg tracking-wider">
                {isUpgrading ? 'UPGRADING...' : 'UPGRADE TO PRO'}
              </span>
              
              <AnimatePresence>
                {!isUpgrading && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Premium Shine Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
              animate={{
                x: isHovered ? ['0%', '200%'] : '-100%'
              }}
              transition={{
                duration: 0.8,
                repeat: isHovered ? Infinity : 0,
                repeatDelay: 1
              }}
            />
          </motion.button>
        </div>
      </div>
      
      {/* Bottom Accent */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
    </motion.div>
  );
}