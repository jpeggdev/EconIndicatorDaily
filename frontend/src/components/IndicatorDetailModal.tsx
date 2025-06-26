'use client';

import { EconomicIndicator } from '@/types/indicator';
import { X, TrendingUp, TrendingDown, Calendar, BarChart3, Database, AlertCircle, DollarSign } from 'lucide-react';
import { formatNumberWithUnit } from '@/lib/formatNumber';
import { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface IndicatorDetailModalProps {
  indicator: EconomicIndicator | null;
  isOpen: boolean;
  onClose: () => void;
}

interface IndicatorDetailData {
  data: Array<{ date: string; value: number }>;
  explanations?: Array<{ date: string; content: string }>;
}

export default function IndicatorDetailModal({ indicator, isOpen, onClose }: IndicatorDetailModalProps) {
  const [detailData, setDetailData] = useState<IndicatorDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && indicator) {
      fetchDetailData(indicator.id);
    }
  }, [isOpen, indicator]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const fetchDetailData = async (indicatorId: string) => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      console.log(`Fetching detail data for indicator: ${indicatorId} from ${apiUrl}`);
      
      const response = await fetch(`${apiUrl}/api/indicators/${indicatorId}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API result:', result);
      
      if (result.success) {
        setDetailData(result.data);
      } else {
        console.error('API returned error:', result);
      }
    } catch (error) {
      console.error('Failed to fetch indicator details:', error);
      setDetailData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric'
    });
  };

  // Prepare chart data
  const chartData = detailData?.data?.slice(0, 24).reverse().map(point => ({
    date: point.date,
    value: point.value,
    formattedDate: formatDateShort(point.date),
    formattedValue: formatNumberWithUnit(point.value, indicator?.unit)
  })) || [];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'economic_growth':
      case 'Economic Growth':
        return <TrendingUp className="w-5 h-5 text-emerald-600" />;
      case 'employment':
        return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case 'inflation':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'monetary_policy':
        return <DollarSign className="w-5 h-5 text-purple-600" />;
      default:
        return <BarChart3 className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRecentTrend = () => {
    if (!detailData?.data || detailData.data.length < 2) return null;
    
    const recent = detailData.data[0]?.value;
    const previous = detailData.data[1]?.value;
    
    if (recent && previous) {
      const change = ((recent - previous) / previous) * 100;
      return {
        change: change.toFixed(2),
        isPositive: change > 0,
        isNegative: change < 0
      };
    }
    return null;
  };

  if (!isOpen || !indicator) return null;

  const trend = getRecentTrend();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-gray-100 p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {getCategoryIcon(indicator.category)}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{indicator.name}</h2>
                <p className="text-gray-600 mt-1">{indicator.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading detailed data...</span>
            </div>
          ) : !detailData ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-gray-600">Failed to load detailed data</p>
                <p className="text-sm text-gray-500 mt-1">Please ensure the backend is running</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Current Value</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatNumberWithUnit(indicator.latestValue as number, indicator.unit)}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-800">Last Updated</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {indicator.latestDate ? formatDate(indicator.latestDate) : 'N/A'}
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">Frequency</span>
                  </div>
                  <div className="text-lg font-semibold text-emerald-900 capitalize">
                    {indicator.frequency}
                  </div>
                </div>
              </div>

              {/* Trend Analysis */}
              {trend && (
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Recent Trend
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      trend.isPositive ? 'bg-green-100 text-green-800' : 
                      trend.isNegative ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {trend.isPositive ? <TrendingUp className="w-4 h-4" /> : 
                       trend.isNegative ? <TrendingDown className="w-4 h-4" /> : 
                       <AlertCircle className="w-4 h-4" />}
                      <span className="font-medium">
                        {trend.isPositive ? '+' : ''}{trend.change}%
                      </span>
                    </div>
                    <span className="text-gray-600">
                      {trend.isPositive ? 'Increased' : trend.isNegative ? 'Decreased' : 'No change'} since last period
                    </span>
                  </div>
                </div>
              )}

              {/* Historical Chart */}
              {chartData.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Historical Trend (Last 24 periods)
                  </h3>
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="formattedDate" 
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                          stroke="#9CA3AF"
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                          stroke="#9CA3AF"
                          tickFormatter={(value) => formatNumberWithUnit(value, indicator?.unit, true)}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '14px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                          }}
                          formatter={(value: any, name: string) => [
                            formatNumberWithUnit(value, indicator?.unit),
                            'Value'
                          ]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          fill="url(#colorValue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Historical Data */}
              {detailData?.data && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Historical Data (Last 10 periods)
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="space-y-2">
                      {detailData.data.slice(0, 10).map((dataPoint, index) => (
                        <div key={index} className="flex justify-between items-center py-2 px-3 bg-white rounded-lg">
                          <span className="text-gray-700 font-medium">
                            {formatDate(dataPoint.date)}
                          </span>
                          <span className="text-gray-900 font-semibold">
                            {formatNumberWithUnit(dataPoint.value, indicator.unit)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">About This Indicator</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Category:</span>
                    <span className="ml-2 text-blue-700 capitalize">
                      {indicator.category.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Source:</span>
                    <span className="ml-2 text-blue-700">
                      {indicator.source || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Unit:</span>
                    <span className="ml-2 text-blue-700">
                      {indicator.unit || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Update Frequency:</span>
                    <span className="ml-2 text-blue-700 capitalize">
                      {indicator.frequency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}