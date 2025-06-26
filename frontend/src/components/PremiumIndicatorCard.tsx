'use client';

import { EconomicIndicator } from '@/types/indicator';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatNumberWithUnit } from '@/lib/formatNumber';

interface PremiumIndicatorCardProps {
  indicator: EconomicIndicator;
  index: number;
  onCardClick?: (indicator: EconomicIndicator) => void;
}

export default function PremiumIndicatorCard({ indicator, index, onCardClick }: PremiumIndicatorCardProps) {
  const value = indicator.latestValue;
  const isPositive = value !== null && value > 0;
  const isNegative = value !== null && value < 0;
  
  const getCategoryConfig = (category: string) => {
    const configs = {
      economic_growth: {
        gradient: 'from-blue-500 via-blue-600 to-indigo-700',
        metallic: 'from-slate-200 via-blue-100 to-blue-200',
        icon: '📈',
        accent: 'blue'
      },
      employment: {
        gradient: 'from-emerald-500 via-teal-600 to-cyan-700',
        metallic: 'from-slate-200 via-emerald-100 to-emerald-200',
        icon: '👥',
        accent: 'emerald'
      },
      inflation: {
        gradient: 'from-orange-500 via-red-600 to-pink-700',
        metallic: 'from-slate-200 via-orange-100 to-orange-200',
        icon: '💰',
        accent: 'orange'
      },
      interest_rates: {
        gradient: 'from-purple-500 via-violet-600 to-indigo-700',
        metallic: 'from-slate-200 via-purple-100 to-purple-200',
        icon: '🏦',
        accent: 'purple'
      },
      default: {
        gradient: 'from-slate-500 via-gray-600 to-slate-700',
        metallic: 'from-slate-200 via-gray-100 to-slate-200',
        icon: '📊',
        accent: 'slate'
      }
    };
    
    return configs[category as keyof typeof configs] || configs.default;
  };

  const config = getCategoryConfig(indicator.category);
  
  const formatValue = (val: number | null) => {
    return formatNumberWithUnit(val as number, indicator.unit);
  };

  const getTrendIcon = () => {
    if (isPositive) return <TrendingUp className="w-5 h-5" />;
    if (isNegative) return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  const getTrendColor = () => {
    if (isPositive) return 'text-emerald-600';
    if (isNegative) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      }}
      className="group relative overflow-hidden cursor-pointer"
      onClick={() => onCardClick?.(indicator)}
    >
      {/* Main Card */}
      <div className="relative bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Metallic Header Background */}
        <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${config.metallic} opacity-80`}></div>
        
        {/* 3D Floating Elements */}
        <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transform rotate-12 group-hover:rotate-45 transition-transform duration-500">
          <Sparkles className="w-6 h-6 text-white/70" />
        </div>
        
        {/* Premium Gradient Accent */}
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${config.gradient}`}></div>
        
        <div className="relative p-6 space-y-4">
          {/* Header Section */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              {/* Category Badge - Modern Style */}
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r ${config.gradient} text-white shadow-lg`}>
                <span className="mr-1">{config.icon}</span>
                {indicator.category.replace('_', ' ')}
              </div>
              
              {/* Bold Title - Modern Typography */}
              <h3 className="text-xl font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">
                {indicator.name}
              </h3>
            </div>
            
            {/* Trend Indicator */}
            <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
              {getTrendIcon()}
            </div>
          </div>

          {/* Value Display - Premium Style */}
          <div className="space-y-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black text-gray-900 tracking-tight">
                {formatValue(value)}
              </span>
            </div>
            
            {/* Last Updated */}
            {indicator.lastUpdated && (
              <p className="text-sm text-gray-500 font-medium">
                Updated {new Date(indicator.lastUpdated).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Description - Clean Typography */}
          <p className="text-gray-700 leading-relaxed font-medium">
            {indicator.description}
          </p>

          {/* Source Badge */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                {indicator.source}
              </span>
            </div>
            
            {/* Frequency */}
            <span className="text-xs font-semibold text-gray-500 px-2 py-1 bg-gray-50 rounded-lg">
              {indicator.frequency}
            </span>
          </div>
        </div>

        {/* Metallic Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none group-hover:from-white/20 transition-all duration-500"></div>
      </div>
    </motion.div>
  );
}