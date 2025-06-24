'use client';

import { useSession } from 'next-auth/react';
import { Crown, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { useState } from 'react';

export default function SubscriptionBanner() {
  const { data: session, update } = useSession();
  const [isUpgrading, setIsUpgrading] = useState(false);

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
            // This would normally come from Stripe
            customerId: `stripe_${session.user.id}`,
            subscriptionId: `sub_${Date.now()}`,
          },
        }),
      });

      if (response.ok) {
        // Refresh the session to get updated subscription status
        await update();
        // For demo purposes, we'll just show success
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
    <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-orange-400/20 to-pink-400/20 animate-gradient-shift"></div>
      <div className="absolute -top-8 -left-8 w-16 h-16 bg-white/10 rounded-full animate-float"></div>
      <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white/10 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-2 right-1/4 w-8 h-8 bg-white/10 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Crown className="w-6 h-6 text-yellow-200" />
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-100 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold flex items-center gap-2">
                <span>You&apos;re on the</span>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-black">FREE</span>
                <span>plan</span>
              </p>
              <p className="text-xs text-white/90">
                Unlock daily alerts, 50+ indicators & AI insights with Pro! 🚀
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleUpgradeClick}
            disabled={isUpgrading}
            className="group relative inline-flex items-center px-6 py-2.5 bg-white text-orange-600 font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Button background animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-100 to-orange-100 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative flex items-center gap-2">
              <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>{isUpgrading ? 'Upgrading...' : 'Upgrade to Pro'}</span>
              {!isUpgrading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </div>
            
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          </button>
        </div>
      </div>
    </div>
  );
}