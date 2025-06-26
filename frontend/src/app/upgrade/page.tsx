'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Crown, Check, ArrowLeft, Zap, TrendingUp, Bell, Shield } from 'lucide-react';
import Link from 'next/link';

export default function UpgradePage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/health`);
      const data = await response.json();
      alert(`Backend connection test: ${JSON.stringify(data)}`);
    } catch (error) {
      alert(`Backend connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpgrade = async () => {
    console.log('Session data:', session);
    console.log('Session user:', session?.user);
    console.log('Session user ID:', session?.user?.id);
    
    if (!session) {
      alert('No session found. Please sign in first.');
      return;
    }
    
    if (!session?.user?.id) {
      alert(`User ID not found in session. Session user: ${JSON.stringify(session?.user, null, 2)}`);
      return;
    }

    setLoading(true);
    
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users/upgrade/${session.user.id}`;
      console.log('Calling upgrade endpoint:', apiUrl);
      console.log('User ID being used:', session.user.id);
      
      // Call the backend upgrade endpoint
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stripeData: {
            // For now, simulate successful payment
            // In production, this would contain Stripe payment data
            paymentMethodId: 'sim_payment_method',
            subscriptionType: 'pro'
          }
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        alert(`HTTP Error ${response.status}: ${errorText}`);
        return;
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        alert('Successfully upgraded to Pro! Refreshing session...');
        // Update the session to reflect new subscription status
        await update();
        // Small delay to let session update, then redirect
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        alert(`Upgrade failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Network/Parse error:', error);
      alert(`Network error: ${error.message}. Check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
      title: "50+ Economic Indicators",
      description: "Access our complete suite of economic data including GDP, employment, inflation, and market indicators"
    },
    {
      icon: <Zap className="w-6 h-6 text-yellow-600" />,
      title: "Real-time Market Data",
      description: "Live stock market data from Alpha Vantage including S&P 500, Nasdaq, Dow Jones, and volatility indices"
    },
    {
      icon: <Bell className="w-6 h-6 text-green-600" />,
      title: "Daily Email Alerts",
      description: "Get personalized daily insights and alerts when key indicators change significantly"
    },
    {
      icon: <Shield className="w-6 h-6 text-purple-600" />,
      title: "Priority Support",
      description: "Get help when you need it with priority customer support and advanced analytics"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Link 
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="space-y-4">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Upgrade to Pro
            </h1>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Unlock the full power of economic intelligence with premium features and unlimited access
            </p>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-12">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">EconIndicatorDaily Pro</h2>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-4xl font-black">$9.99</span>
                <span className="text-blue-100">/month</span>
              </div>
              <p className="text-blue-100">Everything you need for economic intelligence</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-800">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">7-day free trial</span>
              </div>
              <div className="flex items-center space-x-3 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">Cancel anytime</span>
              </div>
              <div className="flex items-center space-x-3 text-green-600">
                <Check className="w-5 h-5" />
                <span className="font-medium">Secure payment processing</span>
              </div>
            </div>

            <button
              onClick={testConnection}
              className="w-full mt-4 px-4 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
            >
              Test Backend Connection
            </button>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full mt-4 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Crown className="w-5 h-5" />
                  <span>Start 7-Day Free Trial</span>
                </div>
              )}
            </button>

            {session && (
              <div className="text-center text-sm text-gray-600 mt-4 space-y-2">
                <p>Logged in as {session.user?.email}</p>
                <div className="text-xs bg-gray-50 p-3 rounded">
                  <p><strong>Debug Info:</strong></p>
                  <p>User ID: {session.user?.id || 'MISSING'}</p>
                  <p>Subscription: {session.user?.subscriptionStatus || 'MISSING'}</p>
                  <p>Max Indicators: {session.user?.maxIndicators || 'MISSING'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-8 border border-white/20">
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">What data sources do you use?</h4>
              <p className="text-gray-600 text-sm">
                We aggregate data from trusted sources including the Federal Reserve Economic Data (FRED) 
                and Alpha Vantage for real-time market information.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-600 text-sm">
                Yes, you can cancel your subscription at any time. You'll continue to have access 
                until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Is my payment information secure?</h4>
              <p className="text-gray-600 text-sm">
                Absolutely. We use Stripe for secure payment processing and never store your payment 
                information on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}