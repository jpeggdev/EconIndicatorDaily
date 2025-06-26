'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Users, 
  BarChart3, 
  Database, 
  RefreshCw, 
  Shield, 
  Eye,
  TrendingUp,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Crown,
  LogOut
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import AdminLogin from '@/components/AdminLogin';

interface AdminStats {
  totalUsers: number;
  proUsers: number;
  totalIndicators: number;
  activeIndicators: number;
  lastSync: string;
  apiHealth: {
    fred: boolean;
    alphaVantage: boolean;
    sec: boolean;
    rapidapi: boolean;
    treasury: boolean;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'indicators' | 'sync' | 'apis' | 'settings'>('overview');
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Fetch admin stats when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminStats();
    }
  }, [isAuthenticated]);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setShowLogin(true);
        setAuthLoading(false);
        return;
      }

      // Verify token with backend
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.role === 'admin') {
          setIsAuthenticated(true);
          setAdminUser(data.data);
          setShowLogin(false);
        } else {
          // Not an admin or invalid token
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminRefreshToken');
          setShowLogin(true);
        }
      } else if (response.status === 401) {
        // Token expired, try to refresh
        const refreshToken = localStorage.getItem('adminRefreshToken');
        if (refreshToken) {
          await attemptTokenRefresh(refreshToken);
        } else {
          setShowLogin(true);
        }
      } else {
        setShowLogin(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setShowLogin(true);
    } finally {
      setAuthLoading(false);
    }
  };

  const attemptTokenRefresh = async (refreshToken: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          localStorage.setItem('adminToken', data.data.token);
          localStorage.setItem('adminRefreshToken', data.data.refreshToken);
          setIsAuthenticated(true);
          setAdminUser(data.data.user);
          setShowLogin(false);
          return;
        }
      }
      
      // Refresh failed
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminRefreshToken');
      setShowLogin(true);
    } catch (error) {
      console.error('Token refresh error:', error);
      setShowLogin(true);
    }
  };

  const handleLogin = (token: string, user: any) => {
    setIsAuthenticated(true);
    setAdminUser(user);
    setShowLogin(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    setIsAuthenticated(false);
    setAdminUser(null);
    setShowLogin(true);
  };

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        console.error('Failed to fetch admin stats:', data.error);
        // Fallback to mock data
        setStats({
          totalUsers: 1247,
          proUsers: 89,
          totalIndicators: 25,
          activeIndicators: 23,
          lastSync: new Date().toISOString(),
          apiHealth: {
            fred: true,
            alphaVantage: true,
            sec: false,
            rapidapi: true,
            treasury: true,
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      // Fallback to mock data
      setStats({
        totalUsers: 1247,
        proUsers: 89,
        totalIndicators: 25,
        activeIndicators: 23,
        lastSync: new Date().toISOString(),
        apiHealth: {
          fred: true,
          alphaVantage: true,
          sec: false,
          rapidapi: true,
          treasury: true,
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/sync-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('Sync initiated successfully');
        // Refresh stats after a delay
        setTimeout(fetchAdminStats, 2000);
      } else {
        console.error('Failed to initiate sync:', data.error);
      }
    } catch (error) {
      console.error('Failed to sync indicators:', error);
    }
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Show login modal if not authenticated
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <AdminLogin 
          onLogin={handleLogin}
          onCancel={() => router.push('/')}
        />
      </div>
    );
  }

  // Show access denied if somehow not admin (fallback)
  if (!isAuthenticated || !adminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Admin Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">EconIndicatorDaily Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Welcome, {adminUser?.name || adminUser?.email}
              </div>
              <ThemeToggle />
              <button
                onClick={handleSyncAll}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync All
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'indicators', label: 'Indicators', icon: TrendingUp },
              { id: 'sync', label: 'Sync Status', icon: RefreshCw },
              { id: 'apis', label: 'API Status', icon: Database },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab stats={stats} onRefresh={fetchAdminStats} />
            )}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'indicators' && <IndicatorsTab />}
            {activeTab === 'sync' && <SyncStatusTab />}
            {activeTab === 'apis' && <APIStatusTab stats={stats} />}
            {activeTab === 'settings' && <SettingsTab />}
          </>
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ stats, onRefresh }: { stats: AdminStats | null; onRefresh: () => void }) {
  if (!stats) return null;

  const conversionRate = ((stats.proUsers / stats.totalUsers) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalUsers.toLocaleString()}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pro Users</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.proUsers}</p>
              <p className="text-sm text-green-600">{conversionRate}% conversion</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Indicators</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeIndicators}/{stats.totalIndicators}</p>
            </div>
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Sync</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {new Date(stats.lastSync).toLocaleTimeString()}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </motion.div>
      </div>

      {/* API Health Status */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Health Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(stats.apiHealth).map(([api, isHealthy]) => (
            <div key={api} className="flex items-center space-x-2">
              {isHealthy ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                {api}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Enhanced Users Tab Component
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      fetchUsers();
    }
  }, [page, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/users?page=${page}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      fetchUsers();
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/users/search/${encodeURIComponent(searchQuery)}?page=${page}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserSubscription = async (userId: string, subscriptionTier: 'free' | 'pro') => {
    try {
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/subscription`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionTier }),
      });
      const data = await response.json();
      
      if (data.success) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update user subscription:', error);
    }
  };

  const viewUserDetails = async (userId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setSelectedUser(data.data);
        setShowUserModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setShowDeleteConfirm(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Controls */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Management</h3>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={fetchUsers}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Search results for "{searchQuery}" - {users.length} users found
          </p>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Favorites
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.subscriptionTier === 'pro'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {user.subscriptionTier === 'pro' ? (
                          <>
                            <Crown className="w-3 h-3 mr-1" />
                            Pro
                          </>
                        ) : (
                          'Free'
                        )}
                      </span>
                      {user.subscriptionStatus && user.subscriptionStatus !== 'active' && (
                        <span className="text-xs text-red-600 dark:text-red-400">
                          {user.subscriptionStatus}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {user._count?.preferences || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center text-sm text-green-600">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => viewUserDetails(user.id)}
                      className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 transition-colors"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => updateUserSubscription(
                        user.id,
                        user.subscriptionTier === 'pro' ? 'free' : 'pro'
                      )}
                      className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        user.subscriptionTier === 'pro'
                          ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}
                    >
                      {user.subscriptionTier === 'pro' ? 'Downgrade' : 'Upgrade'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(user.id)}
                      className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <UserDetailsModal 
          user={selectedUser} 
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onUpdate={fetchUsers}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUser(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// User Details Modal Component
function UserDetailsModal({ user, onClose, onUpdate }: { user: any, onClose: () => void, onUpdate: () => void }) {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user.name || '',
    email: user.email || '',
    subscriptionTier: user.subscriptionTier || 'free',
    subscriptionStatus: user.subscriptionStatus || 'active'
  });

  useEffect(() => {
    fetchUserFavorites();
  }, []);

  const fetchUserFavorites = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${user.id}/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setFavorites(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch user favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });
      const data = await response.json();
      
      if (data.success) {
        setEditing(false);
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* User Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{user.name || 'Unknown'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              {editing ? (
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{user.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subscription Tier
              </label>
              {editing ? (
                <select
                  value={editData.subscriptionTier}
                  onChange={(e) => setEditData(prev => ({ ...prev, subscriptionTier: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select>
              ) : (
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.subscriptionTier === 'pro'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {user.subscriptionTier === 'pro' ? (
                      <>
                        <Crown className="w-3 h-3 mr-1" />
                        Pro
                      </>
                    ) : (
                      'Free'
                    )}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subscription Status
              </label>
              {editing ? (
                <select
                  value={editData.subscriptionStatus}
                  onChange={(e) => setEditData(prev => ({ ...prev, subscriptionStatus: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="canceled">Canceled</option>
                  <option value="past_due">Past Due</option>
                  <option value="incomplete">Incomplete</option>
                </select>
              ) : (
                <p className="text-gray-900 dark:text-white capitalize">{user.subscriptionStatus || 'active'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Created
              </label>
              <p className="text-gray-900 dark:text-white">{new Date(user.createdAt).toLocaleString()}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Login
              </label>
              <p className="text-gray-900 dark:text-white">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Total Favorites
              </label>
              <p className="text-gray-900 dark:text-white">{user._count?.preferences || 0}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Verified
              </label>
              <p className="text-gray-900 dark:text-white">
                {user.emailVerified ? (
                  <span className="text-green-600">✓ Verified</span>
                ) : (
                  <span className="text-red-600">✗ Not Verified</span>
                )}
              </p>
            </div>
          </div>

          {/* User Favorites */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Favorite Indicators</h4>
            {loading ? (
              <div className="flex justify-center py-4">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : favorites.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {favorites.map((favorite) => (
                  <div key={favorite.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {favorite.indicator.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {favorite.indicator.category} • {favorite.indicator.source}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Added {new Date(favorite.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No favorite indicators</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Close
          </button>
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={updateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit User
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function IndicatorsTab() {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchIndicators();
  }, []);

  const fetchIndicators = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/indicators`);
      const data = await response.json();
      
      if (data.success) {
        setIndicators(data.data.indicators);
      }
    } catch (error) {
      console.error('Failed to fetch indicators:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleIndicator = async (indicatorId: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/indicators/${indicatorId}/toggle`, {
        method: 'PATCH',
      });
      const data = await response.json();
      
      if (data.success) {
        fetchIndicators(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to toggle indicator:', error);
    }
  };

  const syncIndicator = async (indicatorId: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/indicators/${indicatorId}/sync`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('Indicator sync initiated');
        setTimeout(fetchIndicators, 2000); // Refresh after delay
      }
    } catch (error) {
      console.error('Failed to sync indicator:', error);
    }
  };

  const filteredIndicators = indicators.filter(indicator => {
    if (filter === 'active') return indicator.isActive;
    if (filter === 'inactive') return !indicator.isActive;
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Indicator Management</h3>
          <div className="flex space-x-2">
            {['all', 'active', 'inactive'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption as any)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filter === filterOption
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Indicators Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Indicator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredIndicators.map((indicator) => (
                <tr key={indicator.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {indicator.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {indicator.code}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {indicator.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {indicator.frequency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {indicator.isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                      )}
                      <span className={`text-sm ${indicator.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {indicator.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(indicator.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => toggleIndicator(indicator.id)}
                      className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        indicator.isActive
                          ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                      }`}
                    >
                      {indicator.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => syncIndicator(indicator.id)}
                      className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 transition-colors"
                    >
                      Sync
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function APIStatusTab({ stats }: { stats: AdminStats | null }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Status & Configuration</h3>
      <p className="text-gray-600 dark:text-gray-400">API status monitoring coming soon...</p>
    </div>
  );
}

function SyncStatusTab() {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchSyncStatus();
    // Refresh sync status every 30 seconds
    const interval = setInterval(fetchSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/sync-status`);
      const data = await response.json();
      
      if (data.success) {
        setSyncStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncBySource = async (source: string) => {
    try {
      setSyncing(source);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/sync-source`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source, force: true }),
      });
      const data = await response.json();
      
      if (data.success) {
        console.log(`Sync initiated for ${source}`);
        setTimeout(fetchSyncStatus, 2000); // Refresh after delay
      }
    } catch (error) {
      console.error(`Failed to sync ${source}:`, error);
    } finally {
      setTimeout(() => setSyncing(null), 3000);
    }
  };

  const syncAll = async () => {
    try {
      setSyncing('all');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/admin/sync-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true }),
      });
      const data = await response.json();
      
      if (data.success) {
        console.log('Full sync initiated');
        setTimeout(fetchSyncStatus, 2000);
      }
    } catch (error) {
      console.error('Failed to initiate full sync:', error);
    } finally {
      setTimeout(() => setSyncing(null), 5000);
    }
  };

  if (loading && !syncStatus) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Indicators</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{syncStatus?.summary?.total || 0}</p>
            </div>
            <Database className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">With Data</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{syncStatus?.summary?.withData || 0}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recently Updated</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{syncStatus?.summary?.recentlyUpdated || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Needing Update</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{syncStatus?.summary?.needingUpdate || 0}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Sync Controls */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sync Controls</h3>
          <button
            onClick={syncAll}
            disabled={syncing === 'all'}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncing === 'all' ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync All Sources
          </button>
        </div>

        {/* Source-specific sync buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {syncStatus?.bySource && Object.entries(syncStatus.bySource).map(([source, stats]: [string, any]) => (
            <div key={source} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="text-center">
                <h4 className="font-medium text-gray-900 dark:text-white capitalize mb-2">{source}</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <div>Total: {stats.total}</div>
                  <div>Updated: {stats.recentlyUpdated}</div>
                </div>
                <button
                  onClick={() => syncBySource(source)}
                  disabled={syncing === source}
                  className="w-full flex items-center justify-center px-3 py-2 text-xs bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 transition-colors"
                >
                  {syncing === source ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    'Sync'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Status Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Indicator Sync Status</h3>
          <button
            onClick={fetchSyncStatus}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Indicator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Update
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Data Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {syncStatus?.indicators?.map((indicator: any) => {
                const hoursSinceUpdate = indicator.lastUpdate ? 
                  (new Date().getTime() - new Date(indicator.lastUpdate).getTime()) / (1000 * 60 * 60) : 
                  null;
                const isStale = hoursSinceUpdate ? hoursSinceUpdate > 24 : true;
                
                return (
                  <tr key={indicator.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {indicator.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {indicator.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {indicator.lastUpdate ? new Date(indicator.lastUpdate).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {indicator.totalDataPoints || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {indicator.lastValue || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {isStale ? (
                          <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        )}
                        <span className={`text-sm ${isStale ? 'text-orange-600' : 'text-green-600'}`}>
                          {isStale ? 'Needs Update' : 'Current'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Settings</h3>
      <p className="text-gray-600 dark:text-gray-400">System settings coming soon...</p>
    </div>
  );
}