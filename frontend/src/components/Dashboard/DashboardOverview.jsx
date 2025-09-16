import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, ShoppingCart, DollarSign, TrendingUp, Database, Trash2, Package } from 'lucide-react';
import api from '../../services/api';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

const DashboardOverview = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/analytics/overview');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const seedDemoData = async () => {
    try {
      setSeeding(true);
      await api.post('/api/seed/seed');
      alert('Demo data seeded successfully!');
      await fetchAnalytics();
    } catch (error) {
      console.error('Failed to seed data:', error);
      alert('Failed to seed demo data');
    } finally {
      setSeeding(false);
    }
  };

  const clearData = async () => {
    if (!window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return;
    }
    
    try {
      setClearing(true);
      await api.delete('/api/seed/clear');
      alert('Data cleared successfully!');
      await fetchAnalytics();
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Use real data only, show empty state if no data
  const revenueData = analytics?.revenueData || [];
  const customerData = analytics?.customerSegmentation || [];
  const topProducts = analytics?.topProducts || [];

  const stats = analytics?.overview || {
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0
  };

  // Helper function to render empty state
  const EmptyState = ({ title, description }) => (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
      <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-center">{description}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Data Management */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Overview</h1>
        <div className="flex space-x-3">
          <button
            onClick={seedDemoData}
            disabled={seeding}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Database className="h-4 w-4 mr-2" />
            {seeding ? 'Seeding...' : 'Seed Demo Data'}
          </button>
          <button
            onClick={clearData}
            disabled={clearing}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {clearing ? 'Clearing...' : 'Clear Data'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          {error}
          <button 
            onClick={fetchAnalytics}
            className="ml-4 text-red-800 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                <dd className="text-lg font-medium text-gray-900">${(stats.totalRevenue || 0).toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                <dd className="text-lg font-medium text-gray-900">{(stats.totalOrders || 0).toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                <dd className="text-lg font-medium text-gray-900">{(stats.totalCustomers || 0).toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                <dd className="text-lg font-medium text-gray-900">{(stats.totalProducts || 0).toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
          {revenueData && revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Revenue ($)"
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState 
              title="No Revenue Data"
              description="No orders found. Start by seeding demo data or syncing your Shopify store."
            />
          )}
        </div>

        {/* Customer Segmentation */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Segmentation</h3>
          {customerData && customerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={customerData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {customerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState 
              title="No Customer Data"
              description="No customers found. Add customers to see segmentation analysis."
            />
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Products</h3>
        {topProducts && topProducts.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="sales" fill="#8884d8" name="Sales Count" />
              <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState 
            title="No Product Data"
            description="No products or sales found. Add products and orders to see top performers."
          />
        )}
      </div>

      {/* Getting Started Section */}
      {(stats.totalOrders === 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">Getting Started</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-blue-900">Click "Seed Demo Data" to populate with sample data</p>
                <p className="text-xs text-blue-700">This will create customers, orders, and products for testing</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-blue-900">Connect your Shopify store</p>
                <p className="text-xs text-blue-700">Store: xeno-analytics-demo1.myshopify.com</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-blue-900">Set up real-time webhooks</p>
                <p className="text-xs text-blue-700">Get live updates from Shopify</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;