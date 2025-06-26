'use client';

import { useState, useEffect } from 'react';
import { EconomicIndicator } from '@/types/indicator';
import IndicatorCard from './IndicatorCard';
import IndicatorDetailModal from './IndicatorDetailModal';
import AccessControl, { useAccessControl } from './AccessControl';
import { RefreshCw, Crown, Shield, Filter, X } from 'lucide-react';
import AuthButton from './AuthButton';
import SubscriptionBanner from './SubscriptionBanner';
import FilterPanel from './FilterPanel';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FilterState {
  categories: string[]
  sources: string[]
  frequencies: string[]
  showFavoritesOnly: boolean
}

export default function Dashboard() {
  const [indicators, setIndicators] = useState<EconomicIndicator[]>([]);
  const [filteredIndicators, setFilteredIndicators] = useState<EconomicIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<EconomicIndicator | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    categories: [],
    sources: [],
    frequencies: [],
    showFavoritesOnly: false
  });
  
  const { checkAccess, isProUser, maxIndicators, session } = useAccessControl();

  const fetchIndicators = async (filters?: FilterState) => {
    try {
      setLoading(true);
      
      // Build query parameters for filtering
      const params = new URLSearchParams();
      const currentFilters = filters || activeFilters;
      
      if (currentFilters.categories.length > 0) {
        params.append('categories', currentFilters.categories.join(','));
      }
      if (currentFilters.sources.length > 0) {
        params.append('sources', currentFilters.sources.join(','));
      }
      if (currentFilters.frequencies.length > 0) {
        params.append('frequencies', currentFilters.frequencies.join(','));
      }
      if (currentFilters.showFavoritesOnly) {
        params.append('favoritesOnly', 'true');
      }
      
      const queryString = params.toString();
      const url = `${API_BASE_URL}/api/indicators${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setIndicators(data.data);
        setFilteredIndicators(data.data);
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

  const handleCardClick = (indicator: EconomicIndicator) => {
    setSelectedIndicator(indicator);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIndicator(null);
  };

  const handleFiltersChange = (filters: FilterState) => {
    setActiveFilters(filters);
    fetchIndicators(filters);
  };

  const handleFavoriteChange = (indicatorId: string, isFavorite: boolean) => {
    // Update local state immediately for optimistic UI
    setIndicators(prev => prev.map(indicator => 
      indicator.id === indicatorId 
        ? { ...indicator, isFavorite }
        : indicator
    ));
    setFilteredIndicators(prev => prev.map(indicator => 
      indicator.id === indicatorId 
        ? { ...indicator, isFavorite }
        : indicator
    ));
  };

  const hasActiveFilters = activeFilters.categories.length > 0 || 
                          activeFilters.sources.length > 0 || 
                          activeFilters.frequencies.length > 0 || 
                          activeFilters.showFavoritesOnly;

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
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className={`group relative inline-flex items-center px-4 py-3 ${
                  hasActiveFilters 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                    : 'bg-white/80 text-gray-700 hover:bg-white'
                } ${hasActiveFilters ? 'text-white' : ''} font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
              >
                <Filter className="w-5 h-5 mr-2" />
                <span>Filter</span>
                {hasActiveFilters && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">
                      {[activeFilters.categories, activeFilters.sources, activeFilters.frequencies].flat().length + (activeFilters.showFavoritesOnly ? 1 : 0)}
                    </span>
                  </div>
                )}
              </button>
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

      <div className="flex">
        {/* Filter Panel */}
        <FilterPanel 
          isOpen={isFilterPanelOpen}
          onClose={() => setIsFilterPanelOpen(false)}
          onFiltersChange={handleFiltersChange}
        />

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${isFilterPanelOpen ? 'lg:ml-0' : ''}`}>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                  <div className="text-2xl font-bold text-gray-900">{filteredIndicators.length}</div>
                  <div className="text-sm text-gray-600">
                    {hasActiveFilters ? 'Filtered' : 'Total'} Indicators
                  </div>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredIndicators.filter(i => i.latestValue !== null).length}
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
              {filteredIndicators.slice(0, maxIndicators).map((indicator, index) => (
                  <div
                    key={indicator.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <IndicatorCard 
                      indicator={indicator} 
                      onCardClick={handleCardClick}
                      onFavoriteChange={handleFavoriteChange}
                    />
                  </div>
                )
              )}
              
              {/* Show subtle upgrade card only for free users who have more indicators available */}
              {!isProUser && indicators.length > maxIndicators && (
                <div 
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${maxIndicators * 100}ms` }}
                >
                  <div className="group relative h-full p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 hover:border-blue-300/70 transition-all duration-300 hover:shadow-lg">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                        <Crown className="w-8 h-8 text-white" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Unlock {indicators.length - maxIndicators} More Indicators
                        </h3>
                        <p className="text-sm text-gray-600">
                          Get access to market data, advanced analytics, and daily insights
                        </p>
                      </div>
                      <button 
                        onClick={() => window.open('/upgrade', '_blank')}
                        className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 hover:scale-105"
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        </main>
      </div>

      {/* Detail Modal */}
      <IndicatorDetailModal
        indicator={selectedIndicator}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}