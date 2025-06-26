'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface EconomicHealthScore {
  overallScore: number;
  trend: 'improving' | 'deteriorating' | 'stable';
  components: {
    laborMarket: number;
    inflation: number;
    economicGrowth: number;
    fiscalHealth: number;
    marketConditions: number;
  };
  narrative: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

export default function EconomicHealthScore() {
  const [healthScore, setHealthScore] = useState<EconomicHealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealthScore();
  }, []);

  const fetchHealthScore = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/analysis/health-score`);
      const data = await response.json();
      
      if (data.success) {
        setHealthScore(data.data);
        setError(null);
      } else {
        setError('Failed to fetch health score');
      }
    } catch (err) {
      setError('Unable to connect to analysis service');
      console.error('Error fetching health score:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-600';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'medium': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'high': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'deteriorating': return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'stable': return <Minus className="w-5 h-5 text-gray-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const componentLabels = {
    laborMarket: 'Labor Market',
    inflation: 'Inflation',
    economicGrowth: 'Economic Growth',
    fiscalHealth: 'Fiscal Health',
    marketConditions: 'Market Conditions'
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/40 shadow-xl">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 bg-gray-200 rounded-full"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !healthScore) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-red-200 shadow-xl">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Analysis Unavailable</h3>
            <p className="text-red-600">{error}</p>
          </div>
          <button
            onClick={fetchHealthScore}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/40 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Economic Health Score</h2>
          <p className="text-gray-600">Real-time economic condition assessment</p>
        </div>
        <div className="flex items-center space-x-2">
          {getTrendIcon(healthScore.trend)}
          <span className="text-sm font-medium text-gray-700 capitalize">
            {healthScore.trend}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Overall Score */}
        <div className="lg:col-span-1">
          <div className="text-center space-y-4">
            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative w-32 h-32 mx-auto"
              >
                {/* Background circle */}
                <div className="absolute inset-0 rounded-full bg-gray-200"></div>
                
                {/* Score circle */}
                <div 
                  className={`absolute inset-0 rounded-full bg-gradient-to-br ${getScoreBackground(healthScore.overallScore)}`}
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + (healthScore.overallScore / 100) * 50}% 0%, 100% 100%, 0% 100%)`
                  }}
                ></div>
                
                {/* Score text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`text-3xl font-black ${getScoreColor(healthScore.overallScore)}`}>
                      {healthScore.overallScore}
                    </div>
                    <div className="text-xs font-semibold text-gray-600">/ 100</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Risk Level */}
            <div className="flex items-center justify-center space-x-2">
              {getRiskIcon(healthScore.riskLevel)}
              <span className={`text-sm font-bold uppercase tracking-wider ${getScoreColor(healthScore.overallScore)}`}>
                {healthScore.riskLevel} Risk
              </span>
            </div>
          </div>
        </div>

        {/* Component Scores */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Component Breakdown</h3>
          
          {Object.entries(healthScore.components).map(([key, value], index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between py-3 px-4 bg-gray-50/80 rounded-xl"
            >
              <span className="text-sm font-medium text-gray-700">
                {componentLabels[key as keyof typeof componentLabels]}
              </span>
              
              <div className="flex items-center space-x-3">
                {/* Progress bar */}
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className={`h-full bg-gradient-to-r ${getScoreBackground(value)}`}
                  ></motion.div>
                </div>
                
                {/* Score */}
                <span className={`text-sm font-bold w-8 ${getScoreColor(value)}`}>
                  {Math.round(value)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Narrative */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
        <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center">
          <Activity className="w-4 h-4 mr-2" />
          AI Analysis
        </h4>
        <p className="text-blue-700 leading-relaxed">
          {healthScore.narrative}
        </p>
      </div>

      {/* Last Updated */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Last updated: {new Date(healthScore.createdAt).toLocaleString()}
        </p>
      </div>
    </motion.div>
  );
}