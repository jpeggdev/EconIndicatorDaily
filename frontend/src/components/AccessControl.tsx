'use client';

import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import { Lock, Crown, AlertTriangle } from 'lucide-react';

interface AccessControlProps {
  children: ReactNode;
  requiredIndicatorCount?: number;
  requiresPro?: boolean;
  showUpgrade?: boolean;
}

export default function AccessControl({ 
  children, 
  requiredIndicatorCount = 1, 
  requiresPro = false,
  showUpgrade = true 
}: AccessControlProps) {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
        <div className="text-center">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please sign in to access this content.</p>
        </div>
      </div>
    );
  }

  const user = session.user;
  const isProUser = user.subscriptionStatus === 'pro' || user.subscriptionStatus === 'enterprise';
  const maxIndicators = user.maxIndicators || 5;

  // Check if pro subscription is required
  if (requiresPro && !isProUser) {
    return (
      <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-orange-200">
        <div className="text-center">
          <Crown className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-orange-800 mb-2">Pro Subscription Required</h3>
          <p className="text-orange-700 mb-4">
            This feature is only available for Pro subscribers.
          </p>
          {showUpgrade && (
            <button 
              onClick={() => window.open('/upgrade', '_blank')}
              className="px-6 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>
    );
  }

  // Check indicator count limits for free users
  if (!isProUser && requiredIndicatorCount > maxIndicators) {
    return (
      <div className="p-6 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-200">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-800 mb-2">Limit Reached</h3>
          <p className="text-red-700 mb-2">
            You&apos;ve reached your limit of {maxIndicators} indicators on the free plan.
          </p>
          <p className="text-sm text-red-600 mb-4">
            Upgrade to Pro to access 50+ indicators and unlimited insights!
          </p>
          {showUpgrade && (
            <button 
              onClick={() => window.open('/upgrade', '_blank')}
              className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>
    );
  }

  // User has access - render the children
  return <>{children}</>;
}

// Hook for checking access programmatically
export function useAccessControl() {
  const { data: session } = useSession();

  const checkAccess = (requiredIndicatorCount: number = 1, requiresPro: boolean = false) => {
    if (!session) return { hasAccess: false, reason: 'not_authenticated' };

    const user = session.user;
    const isProUser = user.subscriptionStatus === 'pro' || user.subscriptionStatus === 'enterprise';
    const maxIndicators = user.maxIndicators || 5;

    if (requiresPro && !isProUser) {
      return { hasAccess: false, reason: 'requires_pro' };
    }

    if (!isProUser && requiredIndicatorCount > maxIndicators) {
      return { hasAccess: false, reason: 'limit_exceeded' };
    }

    return { hasAccess: true, reason: 'allowed' };
  };

  return {
    checkAccess,
    session,
    isProUser: session?.user?.subscriptionStatus === 'pro' || session?.user?.subscriptionStatus === 'enterprise',
    maxIndicators: session?.user?.maxIndicators || 5,
  };
}