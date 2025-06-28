'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EconomicIndicator } from '@/types/indicator';
import PremiumIndicatorCard from './PremiumIndicatorCard';
import IndicatorDetailModal from './IndicatorDetailModal';
import { useAccessControl } from './AccessControl';
import { RefreshCw, TrendingUp, DollarSign, BarChart3, Crown, Shield, Zap, Brain } from 'lucide-react';
import AuthButton from './AuthButton';
import PremiumSubscriptionBanner from './PremiumSubscriptionBanner';
import EconomicHealthScore from './EconomicHealthScore';
import AIInsights from './AIInsights';
import SmartCorrelations from './SmartCorrelations';
import { Button, Card, CardBody, Spinner, Avatar, Tab, Tabs } from '@heroui/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ModernDashboard() {
  const [indicators, setIndicators] = useState<EconomicIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<EconomicIndicator | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'indicators' | 'analysis'>('indicators');
  
  const { isProUser, maxIndicators, session } = useAccessControl();

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

  const handleCardClick = (indicator: EconomicIndicator) => {
    setSelectedIndicator(indicator);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIndicator(null);
  };

  useEffect(() => {
    fetchIndicators();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardBody className="text-center space-y-6 p-8">
            <Spinner size="lg" color="primary" />
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-foreground">
                Loading Economic Data
              </h2>
              <p className="text-default-500">
                Fetching the latest market insights...
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PremiumSubscriptionBanner />
      
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-divider">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Avatar 
                icon={<span className="text-2xl">📊</span>}
                className="w-12 h-12 bg-gradient-to-br from-primary to-secondary"
              />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  ECON INDICATOR
                </h1>
                <p className="text-default-500 font-medium">
                  Daily Market Intelligence
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={syncIndicators}
                disabled={syncing}
                color="primary"
                variant="solid"
                startContent={
                  <motion.div
                    animate={syncing ? { rotate: 360 } : {}}
                    transition={{ duration: 1, repeat: syncing ? Infinity : 0, ease: "linear" }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.div>
                }
                className="font-semibold"
              >
                {syncing ? 'Syncing...' : 'Sync Data'}
              </Button>
              
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Total Indicators */}
          <Card className="p-4">
            <CardBody className="text-center space-y-2">
              <BarChart3 className="w-6 h-6 text-primary mx-auto" />
              <div className="text-2xl font-bold text-foreground">
                {indicators.filter(i => i.latestValue !== null).length}
              </div>
              <div className="text-sm text-default-500 uppercase tracking-wide">
                Indicators
              </div>
            </CardBody>
          </Card>

          {/* Live Data */}
          <Card className="p-4">
            <CardBody className="text-center space-y-2">
              <TrendingUp className="w-6 h-6 text-success mx-auto" />
              <div className="text-2xl font-bold text-foreground">
                {indicators.filter(i => i.latestValue !== null).length}
              </div>
              <div className="text-sm text-default-500 uppercase tracking-wide">
                Live Data
              </div>
            </CardBody>
          </Card>

          {/* Update Status */}
          <Card className="p-4">
            <CardBody className="text-center space-y-2">
              <Zap className="w-6 h-6 text-secondary mx-auto" />
              <div className="text-lg font-bold text-foreground">REAL-TIME</div>
              <div className="text-sm text-default-500 uppercase tracking-wide">
                Updates
              </div>
            </CardBody>
          </Card>

          {/* Data Source */}
          <Card className="p-4">
            <CardBody className="text-center space-y-2">
              <DollarSign className="w-6 h-6 text-warning mx-auto" />
              <div className="text-lg font-bold text-foreground">FRED</div>
              <div className="text-sm text-default-500 uppercase tracking-wide">
                Source
              </div>
            </CardBody>
          </Card>

          {/* User Status */}
          {session && (
            <Card className="p-4">
              <CardBody className="text-center space-y-2">
                {isProUser ? (
                  <Crown className="w-6 h-6 text-warning mx-auto" />
                ) : (
                  <Shield className="w-6 h-6 text-primary mx-auto" />
                )}
                <div className="text-2xl font-bold text-foreground">
                  {isProUser ? '∞' : maxIndicators}
                </div>
                <div className="text-sm text-default-500 uppercase tracking-wide">
                  {isProUser ? 'Pro Access' : 'Free Access'}
                </div>
                <div className="text-xs text-default-400 mt-1">
                  ID: {session.user?.id?.slice(-8) || 'N/A'}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-danger">
            <CardBody className="flex flex-row items-center gap-4 p-6">
              <div className="w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center">
                <span className="text-danger font-bold text-xl">!</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-danger">System Error</h3>
                <p className="text-danger-600">{error}</p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex justify-center">
          <Tabs 
            selectedKey={activeTab} 
            onSelectionChange={(key) => setActiveTab(key as 'indicators' | 'analysis')}
            color="primary"
            variant="bordered"
            size="lg"
          >
            <Tab 
              key="indicators" 
              title={
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Indicators</span>
                </div>
              }
            />
            <Tab 
              key="analysis" 
              title={
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4" />
                  <span>AI Analysis</span>
                </div>
              }
            />
          </Tabs>
        </div>

        {/* Content Based on Active Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'indicators' ? (
            <motion.div
              key="indicators"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
                {indicators.length === 0 && !error ? (
                  <div className="text-center py-20">
                    <Card className="max-w-md mx-auto">
                      <CardBody className="space-y-6 p-8">
                        <Avatar
                          icon={<span className="text-4xl">📈</span>}
                          className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-secondary"
                        />
                        <div className="space-y-3">
                          <h2 className="text-2xl font-bold text-foreground">No Data Yet</h2>
                          <p className="text-default-500">Let&apos;s sync some fresh economic intelligence!</p>
                        </div>
                        <Button
                          onClick={syncIndicators}
                          disabled={syncing}
                          color="primary"
                          size="lg"
                          startContent={
                            <motion.div
                              animate={syncing ? { rotate: 360 } : {}}
                              transition={{ duration: 1, repeat: syncing ? Infinity : 0, ease: "linear" }}
                            >
                              <RefreshCw className="w-5 h-5" />
                            </motion.div>
                          }
                          className="font-semibold"
                        >
                          {syncing ? 'Syncing Data...' : 'Sync Initial Data'}
                        </Button>
                      </CardBody>
                    </Card>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {(() => {
                      // Filter out indicators with N/A values (latestValue is null)
                      const availableIndicators = indicators.filter(indicator => indicator.latestValue !== null);
                      
                      // For free users, prioritize more frequent indicators (weekly, daily, monthly, quarterly)
                      const frequencyPriority = { 'daily': 1, 'weekly': 2, 'monthly': 3, 'quarterly': 4 };
                      const sortedIndicators = isProUser 
                        ? availableIndicators 
                        : [...availableIndicators].sort((a, b) => {
                            const aPriority = frequencyPriority[a.frequency as keyof typeof frequencyPriority] || 5;
                            const bPriority = frequencyPriority[b.frequency as keyof typeof frequencyPriority] || 5;
                            return aPriority - bPriority;
                          });
                      
                      return sortedIndicators.slice(0, maxIndicators).map((indicator, index) => (
                        <motion.div
                          key={indicator.id}
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <PremiumIndicatorCard indicator={indicator} index={index} onCardClick={handleCardClick} />
                        </motion.div>
                      ));
                    })()}
                    
                    {/* Show upgrade card for free users */}
                    {(() => {
                      const availableIndicators = indicators.filter(i => i.latestValue !== null);
                      return !isProUser && availableIndicators.length > maxIndicators && (
                        <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                          <CardBody className="text-center space-y-6 p-8">
                            <Avatar
                              icon={<Crown className="w-8 h-8" />}
                              className="w-16 h-16 mx-auto bg-gradient-to-r from-primary to-secondary"
                            />
                            <div className="space-y-3">
                              <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                Unlock {availableIndicators.length - maxIndicators} More Indicators
                              </h3>
                              <p className="text-default-500 text-sm">
                                Access to longer-term indicators, quarterly reports, and advanced market analytics
                              </p>
                            </div>
                            <Button
                              onClick={() => window.open('/upgrade', '_blank')}
                              color="primary"
                              variant="solid"
                              size="md"
                              className="w-full font-semibold"
                            >
                              Upgrade to Pro
                            </Button>
                          </CardBody>
                        </Card>
                      );
                    })()}
                  </div>
                )}
            </motion.div>
          ) : (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-12"
            >
              {/* Analysis Features Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Economic Health Score */}
                <div className="lg:col-span-2">
                  <EconomicHealthScore />
                </div>
                
                {/* AI Insights */}
                <div className="lg:col-span-2">
                  <AIInsights />
                </div>
                
                {/* Smart Correlations */}
                <div className="lg:col-span-2">
                  <SmartCorrelations />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Detail Modal */}
      <IndicatorDetailModal
        indicator={selectedIndicator}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}