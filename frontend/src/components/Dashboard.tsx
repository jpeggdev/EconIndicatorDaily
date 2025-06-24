'use client';

import { useState, useEffect } from 'react';
import { EconomicIndicator } from '@/types/indicator';
import IndicatorCard from './IndicatorCard';
import AccessControl, { useAccessControl } from './AccessControl';
import { RefreshCw, Crown, Shield } from 'lucide-react';
import AuthButton from './AuthButton';
import SubscriptionBanner from './SubscriptionBanner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Dashboard() {
  const [indicators, setIndicators] = useState<EconomicIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  
  const { checkAccess, isProUser, maxIndicators, session } = useAccessControl();

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
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-4 border-transparent bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-padding mx-auto"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse"></div>
          </div>
          <div className="mt-8 space-y-2">
            <p className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Loading economic indicators...
            </p>
            <p className="text-gray-600">Fetching the latest market data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <SubscriptionBanner />
      
      {/* Animated header */}
      <header className="relative bg-white/70 backdrop-blur-md shadow-xl border-b border-white/20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    EconIndicatorDaily
                  </h1>
                  <p className="text-gray-700 font-medium">Key economic indicators in plain English</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={syncIndicators}
                disabled={syncing}
                className="group relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <RefreshCw className={`relative w-5 h-5 mr-2 ${syncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                <span className="relative">{syncing ? 'Syncing...' : 'Sync Data'}</span>
              </button>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-emerald-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        {error && (
          <div className="relative mb-8 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-red-600 font-bold">!</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Something went wrong</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {indicators.length === 0 && !error ? (
          <div className="relative text-center py-20">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">📈</span>
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-gray-700">No indicators available yet</p>
                <p className="text-gray-600">Let&apos;s sync some fresh economic data to get started!</p>
              </div>
              <button
                onClick={syncIndicators}
                disabled={syncing}
                className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl disabled:opacity-50 transition-all duration-300 hover:scale-105"
              >
                <RefreshCw className={`w-6 h-6 mr-3 ${syncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                {syncing ? 'Syncing Data...' : 'Sync Initial Data'}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative space-y-8">
            {/* Stats summary */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{indicators.length}</div>
                  <div className="text-sm text-gray-600">Total Indicators</div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {indicators.filter(i => i.latestValue !== null).length}
                  </div>
                  <div className="text-sm text-gray-600">Live Data</div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">Real-time</div>
                  <div className="text-sm text-gray-600">Updates</div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">FRED</div>
                  <div className="text-sm text-gray-600">Data Source</div>
                </div>
              </div>
              {session && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      {isProUser ? (
                        <Crown className="w-5 h-5 text-yellow-500 mr-1" />
                      ) : (
                        <Shield className="w-5 h-5 text-blue-500 mr-1" />
                      )}
                      <div className="text-2xl font-bold text-gray-900">
                        {isProUser ? '∞' : maxIndicators}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {isProUser ? 'Pro Access' : 'Free Access'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Indicators grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {indicators.map((indicator, index) => (
                  <div
                    key={indicator.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <AccessControl
                      requiredIndicatorCount={index + 1}
                      showUpgrade={true}
                    >
                      <IndicatorCard indicator={indicator} />
                    </AccessControl>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}