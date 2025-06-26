'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, DollarSign, AlertCircle, Clock, Lightbulb, BarChart3 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface EconomicInsight {
  id: string;
  indicatorId: string;
  indicatorName: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  trend: 'rising' | 'falling' | 'stable';
  significance: 'low' | 'medium' | 'high' | 'critical';
  narrative: string;
  investmentImplication: string;
  historicalContext: string;
  relatedIndicators: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AIInsights() {
  const [insights, setInsights] = useState<EconomicInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<EconomicInsight | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/analysis/insights`);
      const data = await response.json();
      
      if (data.success) {
        setInsights(data.data);
        setError(null);
      } else {
        setError('Failed to fetch AI insights');
      }
    } catch (err) {
      setError('Unable to connect to analysis service');
      console.error('Error fetching insights:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string, changePercent: number) => {
    if (trend === 'rising' || changePercent > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (trend === 'falling' || changePercent < 0) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return <BarChart3 className="w-4 h-4 text-gray-600" />;
  };

  const formatValue = (value: number) => {
    if (Math.abs(value) >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`;
    }
    return value.toFixed(2);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-purple-600 animate-pulse" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Economic Insights</h2>
            <p className="text-gray-600">Generating intelligent analysis...</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/40 shadow-lg animate-pulse">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
            <h3 className="text-lg font-semibold text-red-800">AI Analysis Unavailable</h3>
            <p className="text-red-600">{error}</p>
          </div>
          <button
            onClick={fetchInsights}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Brain className="w-8 h-8 text-purple-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Economic Insights</h2>
          <p className="text-gray-600">Intelligent analysis of economic indicators and market implications</p>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={() => setSelectedInsight(insight)}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                  {insight.indicatorName}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  {getTrendIcon(insight.trend, insight.changePercent)}
                  <span className={`text-sm font-medium ${insight.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {insight.changePercent > 0 ? '+' : ''}{insight.changePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getSignificanceColor(insight.significance)}`}>
                {insight.significance}
              </span>
            </div>

            {/* Values */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Current</p>
                <p className="text-lg font-bold text-gray-900">{formatValue(insight.currentValue)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Previous</p>
                <p className="text-lg font-bold text-gray-600">{formatValue(insight.previousValue)}</p>
              </div>
            </div>

            {/* Narrative Preview */}
            <p className="text-gray-700 text-sm leading-relaxed line-clamp-3 mb-4">
              {insight.narrative}
            </p>

            {/* Tags */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {new Date(insight.createdAt).toLocaleDateString()}
                </span>
              </div>
              <span className="text-xs text-purple-600 font-medium group-hover:text-purple-700">
                View Details →
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detailed Insight Modal */}
      <AnimatePresence>
        {selectedInsight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedInsight(null)}
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
                  <h2 className="text-2xl font-bold text-gray-900">{selectedInsight.indicatorName}</h2>
                  <div className="flex items-center space-x-3 mt-2">
                    {getTrendIcon(selectedInsight.trend, selectedInsight.changePercent)}
                    <span className={`text-lg font-bold ${selectedInsight.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedInsight.changePercent > 0 ? '+' : ''}{selectedInsight.changePercent.toFixed(2)}%
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getSignificanceColor(selectedInsight.significance)}`}>
                      {selectedInsight.significance}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Values */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Current Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatValue(selectedInsight.currentValue)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Previous Value</p>
                  <p className="text-2xl font-bold text-gray-600">{formatValue(selectedInsight.previousValue)}</p>
                </div>
              </div>

              {/* Analysis Sections */}
              <div className="space-y-6">
                {/* What Happened */}
                <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-800 mb-3 flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2" />
                    What Happened
                  </h3>
                  <p className="text-blue-700 leading-relaxed">{selectedInsight.narrative}</p>
                </div>

                {/* Investment Implications */}
                <div className="p-6 bg-green-50 rounded-xl border border-green-200">
                  <h3 className="text-lg font-bold text-green-800 mb-3 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Investment Implications
                  </h3>
                  <p className="text-green-700 leading-relaxed">{selectedInsight.investmentImplication}</p>
                </div>

                {/* Historical Context */}
                <div className="p-6 bg-purple-50 rounded-xl border border-purple-200">
                  <h3 className="text-lg font-bold text-purple-800 mb-3 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Historical Context
                  </h3>
                  <p className="text-purple-700 leading-relaxed">{selectedInsight.historicalContext}</p>
                </div>

                {/* Related Indicators */}
                {selectedInsight.relatedIndicators.length > 0 && (
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Related Indicators
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedInsight.relatedIndicators.map((indicator, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700"
                        >
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  Analysis generated on {new Date(selectedInsight.createdAt).toLocaleString()}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {insights.length === 0 && !loading && (
        <div className="text-center py-12">
          <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Insights Available</h3>
          <p className="text-gray-500 mb-4">AI analysis is processing. Please check back in a few minutes.</p>
          <button
            onClick={fetchInsights}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Refresh Insights
          </button>
        </div>
      )}
    </div>
  );
}