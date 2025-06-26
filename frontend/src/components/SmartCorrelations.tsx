'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowUpDown, BarChart3, AlertCircle, RefreshCw, Network, Target } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface CorrelationAnalysis {
  id: string;
  indicator1Id: string;
  indicator2Id: string;
  indicator1Name: string;
  indicator2Name: string;
  correlationCoeff: number;
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  direction: 'positive' | 'negative';
  lagDays: number;
  confidence: number;
  narrative: string;
  lastUpdated: string;
}

export default function SmartCorrelations() {
  const [correlations, setCorrelations] = useState<CorrelationAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCorrelation, setSelectedCorrelation] = useState<CorrelationAnalysis | null>(null);
  const [filter, setFilter] = useState<'all' | 'strong' | 'moderate' | 'weak'>('all');

  useEffect(() => {
    fetchCorrelations();
  }, []);

  const fetchCorrelations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/analysis/correlations`);
      const data = await response.json();
      
      if (data.success) {
        setCorrelations(data.data);
        setError(null);
      } else {
        setError('Failed to fetch correlation analysis');
      }
    } catch (err) {
      setError('Unable to connect to analysis service');
      console.error('Error fetching correlations:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'very_strong': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'strong': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'weak': return 'text-gray-600 bg-gray-100 border-gray-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getDirectionIcon = (direction: string, correlation: number) => {
    if (direction === 'positive') {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
  };

  const getCorrelationBar = (correlation: number) => {
    const absCorr = Math.abs(correlation);
    const width = absCorr * 100;
    const color = correlation >= 0 ? 'bg-green-500' : 'bg-red-500';
    
    return (
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500 w-8">-1</span>
        <div className="relative w-24 h-2 bg-gray-200 rounded-full">
          <div 
            className={`absolute top-0 left-1/2 h-full ${color} rounded-full transform -translate-x-1/2`}
            style={{ 
              width: `${width}%`,
              transformOrigin: correlation >= 0 ? 'left' : 'right'
            }}
          />
          <div className="absolute top-0 left-1/2 w-0.5 h-full bg-gray-400 transform -translate-x-1/2" />
        </div>
        <span className="text-xs text-gray-500 w-6">1</span>
      </div>
    );
  };

  const filteredCorrelations = correlations.filter(corr => {
    if (filter === 'all') return true;
    if (filter === 'strong') return corr.strength === 'very_strong' || corr.strength === 'strong';
    if (filter === 'moderate') return corr.strength === 'moderate';
    if (filter === 'weak') return corr.strength === 'weak';
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Network className="w-8 h-8 text-indigo-600 animate-pulse" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Smart Correlations</h2>
            <p className="text-gray-600">Analyzing economic indicator relationships...</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/40 shadow-lg animate-pulse">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="h-4 bg-gray-200 rounded w-40"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="flex items-center space-x-4">
                  <div className="h-2 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-red-200 shadow-lg">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Correlation Analysis Unavailable</h3>
            <p className="text-red-600">{error}</p>
          </div>
          <button
            onClick={fetchCorrelations}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Analysis</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Network className="w-8 h-8 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Smart Correlations</h2>
            <p className="text-gray-600">Discover relationships between economic indicators</p>
          </div>
        </div>
        
        <button
          onClick={fetchCorrelations}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-xl p-2 border border-white/40">
        <span className="text-sm font-medium text-gray-700 px-2">Filter by strength:</span>
        {['all', 'strong', 'moderate', 'weak'].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption as any)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === filterOption
                ? 'bg-indigo-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
          </button>
        ))}
        <span className="text-sm text-gray-500 ml-auto">
          {filteredCorrelations.length} correlation{filteredCorrelations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Correlations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredCorrelations.map((correlation, index) => (
          <motion.div
            key={correlation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={() => setSelectedCorrelation(correlation)}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {correlation.indicator1Name}
                  </h3>
                  <ArrowUpDown className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {correlation.indicator2Name}
                  </h3>
                </div>
              </div>
              
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStrengthColor(correlation.strength)}`}>
                {correlation.strength.replace('_', ' ')}
              </span>
            </div>

            {/* Correlation Visualization */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getDirectionIcon(correlation.direction, correlation.correlationCoeff)}
                  <span className={`text-sm font-bold ${correlation.correlationCoeff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {correlation.correlationCoeff > 0 ? '+' : ''}{correlation.correlationCoeff.toFixed(3)}
                  </span>
                </div>
                <span className="text-xs text-gray-500 capitalize">
                  {correlation.direction}
                </span>
              </div>
              
              {getCorrelationBar(correlation.correlationCoeff)}
            </div>

            {/* Confidence */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-500">Confidence</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, correlation.confidence)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {Math.round(correlation.confidence)}%
                </span>
              </div>
            </div>

            {/* Narrative Preview */}
            <p className="text-gray-700 text-sm leading-relaxed line-clamp-2 mb-4">
              {correlation.narrative}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {new Date(correlation.lastUpdated).toLocaleDateString()}
                </span>
              </div>
              <span className="text-xs text-indigo-600 font-medium group-hover:text-indigo-700">
                View Details →
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detailed Correlation Modal */}
      <AnimatePresence>
        {selectedCorrelation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCorrelation(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-xl font-bold text-gray-900">{selectedCorrelation.indicator1Name}</h2>
                    <ArrowUpDown className="w-5 h-5 text-gray-400" />
                    <h2 className="text-xl font-bold text-gray-900">{selectedCorrelation.indicator2Name}</h2>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getDirectionIcon(selectedCorrelation.direction, selectedCorrelation.correlationCoeff)}
                    <span className={`text-lg font-bold ${selectedCorrelation.correlationCoeff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedCorrelation.correlationCoeff > 0 ? '+' : ''}{selectedCorrelation.correlationCoeff.toFixed(3)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStrengthColor(selectedCorrelation.strength)}`}>
                      {selectedCorrelation.strength.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCorrelation(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Correlation Visualization */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Correlation Strength</h3>
                  <div className="space-y-4">
                    {getCorrelationBar(selectedCorrelation.correlationCoeff)}
                    <div className="text-center">
                      <span className={`text-2xl font-bold ${selectedCorrelation.correlationCoeff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedCorrelation.correlationCoeff > 0 ? '+' : ''}{selectedCorrelation.correlationCoeff.toFixed(3)}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedCorrelation.direction.charAt(0).toUpperCase() + selectedCorrelation.direction.slice(1)} correlation
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Reliability</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Confidence</span>
                        <span className="text-sm font-bold text-gray-900">{Math.round(selectedCorrelation.confidence)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, selectedCorrelation.confidence)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <span className={`text-sm font-bold ${getStrengthColor(selectedCorrelation.strength).split(' ')[0]}`}>
                        {selectedCorrelation.strength.replace('_', ' ').toUpperCase()}
                      </span>
                      <p className="text-xs text-gray-600 mt-1">relationship strength</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis */}
              <div className="space-y-6">
                <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-200">
                  <h3 className="text-lg font-bold text-indigo-800 mb-3 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Correlation Analysis
                  </h3>
                  <p className="text-indigo-700 leading-relaxed">{selectedCorrelation.narrative}</p>
                </div>

                {/* Technical Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="text-sm font-bold text-gray-800 mb-2">Technical Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pearson Coefficient:</span>
                        <span className="font-medium">{selectedCorrelation.correlationCoeff.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time Lag:</span>
                        <span className="font-medium">{selectedCorrelation.lagDays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Direction:</span>
                        <span className="font-medium capitalize">{selectedCorrelation.direction}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="text-sm font-bold text-gray-800 mb-2">Interpretation</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      {Math.abs(selectedCorrelation.correlationCoeff) > 0.7 && (
                        <p>• Strong predictive relationship</p>
                      )}
                      {Math.abs(selectedCorrelation.correlationCoeff) > 0.5 && Math.abs(selectedCorrelation.correlationCoeff) <= 0.7 && (
                        <p>• Moderate predictive value</p>
                      )}
                      {Math.abs(selectedCorrelation.correlationCoeff) <= 0.5 && (
                        <p>• Limited predictive value</p>
                      )}
                      <p>• {selectedCorrelation.direction === 'positive' ? 'Move in same direction' : 'Move in opposite directions'}</p>
                      <p>• {Math.round(selectedCorrelation.confidence)}% statistical confidence</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  Analysis updated on {new Date(selectedCorrelation.lastUpdated).toLocaleString()}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredCorrelations.length === 0 && !loading && (
        <div className="text-center py-12">
          <Network className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Correlations Found</h3>
          <p className="text-gray-500 mb-4">
            {filter === 'all' 
              ? 'Correlation analysis is processing. Please check back in a few minutes.'
              : `No ${filter} correlations available. Try adjusting the filter.`
            }
          </p>
          <button
            onClick={fetchCorrelations}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center space-x-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Analysis</span>
          </button>
        </div>
      )}
    </div>
  );
}