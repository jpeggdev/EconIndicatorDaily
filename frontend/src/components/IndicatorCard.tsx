import { EconomicIndicator } from '@/types/indicator';
import { TrendingUp, TrendingDown, Activity, Users, PieChart, Zap, BarChart3, Calendar, Source } from 'lucide-react';
import { formatNumberWithUnit } from '@/lib/formatNumber';
import { useState } from 'react';
import FavoriteButton from './FavoriteButton';

interface IndicatorCardProps {
  indicator: EconomicIndicator;
  onCardClick?: (indicator: EconomicIndicator) => void;
  onFavoriteChange?: (indicatorId: string, isFavorite: boolean) => void;
}

export default function IndicatorCard({ indicator, onCardClick, onFavoriteChange }: IndicatorCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const formatValue = (value: number | null, unit: string | null) => {
    return formatNumberWithUnit(value as number, unit);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryConfig = (category: string) => {
    const configs = {
      economic_growth: {
        color: 'from-emerald-500 to-green-600',
        bgColor: 'bg-gradient-to-br from-emerald-50 to-green-50',
        textColor: 'text-emerald-800',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: TrendingUp,
        emoji: '📈'
      },
      employment: {
        color: 'from-blue-500 to-indigo-600',
        bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
        textColor: 'text-blue-800',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Users,
        emoji: '👥'
      },
      inflation: {
        color: 'from-rose-500 to-red-600',
        bgColor: 'bg-gradient-to-br from-rose-50 to-red-50',
        textColor: 'text-rose-800',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: TrendingUp,
        emoji: '💰'
      },
      monetary_policy: {
        color: 'from-purple-500 to-violet-600',
        bgColor: 'bg-gradient-to-br from-purple-50 to-violet-50',
        textColor: 'text-purple-800',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: PieChart,
        emoji: '🏦'
      },
      default: {
        color: 'from-gray-500 to-slate-600',
        bgColor: 'bg-gradient-to-br from-gray-50 to-slate-50',
        textColor: 'text-gray-800',
        badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: Activity,
        emoji: '📊'
      }
    };
    return configs[category as keyof typeof configs] || configs.default;
  };

  const config = getCategoryConfig(indicator.category);
  const IconComponent = config.icon;

  // Generate a trend indicator (mock for now - could be enhanced with historical data)
  const getTrendIndicator = () => {
    const isPositiveIndicator = indicator.category === 'economic_growth';
    const isNegativeIndicator = indicator.category === 'inflation' || indicator.category === 'employment';
    
    // Mock trend - in real app this would be calculated from historical data
    const trendValue = Math.random() > 0.5 ? 'up' : 'down';
    
    if (trendValue === 'up') {
      return {
        icon: TrendingUp,
        color: isPositiveIndicator ? 'text-green-500' : isNegativeIndicator ? 'text-red-500' : 'text-blue-500',
        text: isPositiveIndicator ? 'Growing' : isNegativeIndicator ? 'Rising' : 'Increasing'
      };
    } else {
      return {
        icon: TrendingDown,
        color: isPositiveIndicator ? 'text-red-500' : isNegativeIndicator ? 'text-green-500' : 'text-blue-500',
        text: isPositiveIndicator ? 'Declining' : isNegativeIndicator ? 'Falling' : 'Decreasing'
      };
    }
  };

  const trend = getTrendIndicator();
  const TrendIcon = trend.icon;

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(indicator);
    }
  };

  return (
    <div 
      className={`${config.bgColor} rounded-xl shadow-lg p-6 border border-white/50 backdrop-blur-sm relative overflow-hidden group cursor-pointer transform transition-all duration-500 ease-out ${
        isHovered 
          ? 'shadow-2xl scale-105 -translate-y-2 bg-white/90' 
          : 'hover:shadow-xl hover:scale-102 hover:-translate-y-1'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Background decoration */}
      <div className={`absolute inset-0 bg-gradient-to-r ${config.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
      
      {/* Header */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{config.emoji}</span>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-800 transition-colors">
                {indicator.name}
              </h3>
              <FavoriteButton 
                indicatorId={indicator.id}
                isFavorite={indicator.isFavorite || false}
                onToggle={(isFavorite) => onFavoriteChange?.(indicator.id, isFavorite)}
                size="sm"
              />
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${config.badgeColor}`}>
              <IconComponent className="w-3 h-3 mr-1" />
              {indicator.category.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          
          {/* Trend indicator */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-white/70 ${trend.color}`}>
            <TrendIcon className="w-3 h-3" />
            <span className="text-xs font-medium">{trend.text}</span>
          </div>
        </div>

        {/* Value display */}
        <div className="mb-4">
          <div className={`text-3xl font-black bg-gradient-to-r ${config.color} bg-clip-text text-transparent mb-1`}>
            {formatValue(indicator.latestValue, indicator.unit)}
          </div>
          <div className="text-sm text-gray-600 font-medium">
            as of {formatDate(indicator.latestDate)}
          </div>
        </div>
        
        {/* Description */}
        <p className="text-gray-700 text-sm mb-4 line-clamp-2 leading-relaxed">
          {indicator.description}
        </p>
        
        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.color} animate-pulse`}></div>
            <span className="text-gray-600 text-sm font-medium">
              Updated {indicator.frequency}
            </span>
          </div>
          
          <button className={`group/btn flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white transition-all duration-200 text-sm font-medium ${config.textColor} hover:shadow-md`}>
            <Zap className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
            <span>Analyze</span>
          </button>
        </div>
      </div>
    </div>
  );
}