import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, Filter } from 'lucide-react';
import api from '../../services/api';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff6b6b', '#4ecdc4'];

const Analytics = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState({
    revenueTrends: [],
    orderAnalytics: [],
    productPerformance: [],
     customerMetrics: [],
     recentOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');
  
    // Generate customer metrics timeline from customer data
    const generateCustomerMetrics = (customers) => {
      if (!customers || customers.length === 0) return [];
    
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      return months.map((month, index) => {
        const monthlyCustomers = customers.filter(c => {
          const createdDate = new Date(c.createdAt);
          return createdDate.getMonth() === index;
        });
      
        const newCustomers = monthlyCustomers.length;
        const returningCustomers = Math.round(newCustomers * 0.3); // 30% returning rate
        const averageLifetimeValue = monthlyCustomers.length > 0 
          ? monthlyCustomers.reduce((sum, c) => sum + parseFloat(c.totalSpent), 0) / monthlyCustomers.length
          : 0;
      
        return {
          month,
          newCustomers,
          returningCustomers,
          averageLifetimeValue: parseFloat(averageLifetimeValue.toFixed(2))
        };
      });
    };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      console.log('Fetching analytics data for date range:', dateRange);
      console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());

        const [revenueTrends, orders, products, customers] = await Promise.all([
        api.get('/api/analytics/revenue-trends', {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            interval: dateRange === '7d' ? 'day' : dateRange === '30d' ? 'day' : 'week'
          }
        }),
        api.get('/api/analytics/orders', {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        }),
          api.get('/api/analytics/products', { params: { limit: 10 } }),
          api.get('/api/analytics/top-customers', { params: { limit: 20 } })
      ]);

      console.log('API Responses:', {
        revenueTrends: revenueTrends.data,
        orders: orders.data,
          products: products.data,
          customers: customers.data
      });

      setAnalyticsData({
        revenueTrends: revenueTrends.data.trends || [],
        orderAnalytics: orders.data.ordersByStatus || [],
        productPerformance: products.data.topProducts || [],
          recentOrders: orders.data.recentOrders || [],
          customerMetrics: generateCustomerMetrics(customers.data.topCustomers || [])
      });

    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Set empty data on error to ensure proper empty states
      setAnalyticsData({
        revenueTrends: [],
        orderAnalytics: [],
        productPerformance: [],
        recentOrders: []
      });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'customers', label: 'Customers', icon: Users }
  ];

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        
        <div className="flex items-center space-x-4">
          {/* Date Range Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trends</h3>
              {analyticsData.revenueTrends && analyticsData.revenueTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analyticsData.revenueTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'revenue' ? `$${value.toFixed(2)}` : value,
                        name === 'revenue' ? 'Revenue' : 'Orders'
                      ]}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3}
                      name="Revenue ($)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No revenue data available</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Sync your Shopify data to see revenue trends
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Orders by Status</h3>
                {analyticsData.orderAnalytics && analyticsData.orderAnalytics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.orderAnalytics}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, count }) => `${status}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {analyticsData.orderAnalytics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No order data available</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Sync your Shopify data to see order analytics
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Orders</h3>
                {analyticsData.recentOrders && analyticsData.recentOrders.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {analyticsData.recentOrders?.slice(0, 8).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-sm text-gray-500">
                            {order.customer?.name || 'Guest'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">${order.totalPrice.toFixed(2)}</p>
                          <p className={`text-sm capitalize ${
                            order.financialStatus === 'paid' ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {order.financialStatus}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No recent orders</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Orders will appear here after syncing
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Products</h3>
            {analyticsData.productPerformance && analyticsData.productPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.productPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" angle={-45} textAnchor="end" height={100} />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalSold" fill="#8884d8" name="Units Sold" />
                  <Bar yAxisId="right" dataKey="totalRevenue" fill="#82ca9d" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No product data available</p>
                <p className="text-sm text-gray-400 mt-2">
                  Sync your Shopify products to see performance metrics
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Analytics</h3>
              {analyticsData.customerMetrics && analyticsData.customerMetrics.length > 0 ? (
                <div className="space-y-6">
                  {/* Customer Acquisition Chart */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Customer Acquisition</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analyticsData.customerMetrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="newCustomers" 
                            stroke="#8884d8" 
                            name="New Customers"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="returningCustomers" 
                            stroke="#82ca9d" 
                            name="Returning Customers"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">Customer Lifetime Value</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.customerMetrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'CLV']} />
                          <Legend />
                          <Bar dataKey="averageLifetimeValue" fill="#ffc658" name="Avg CLV ($)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                
                  {/* Customer Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                          <p className="text-sm text-blue-600">Total Customers</p>
                          <p className="text-xl font-bold text-blue-900">
                            {analyticsData.customerMetrics.reduce((sum, m) => sum + m.newCustomers + m.returningCustomers, 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                          <p className="text-sm text-green-600">Avg CLV</p>
                          <p className="text-xl font-bold text-green-900">
                            ${analyticsData.customerMetrics.length > 0 
                              ? (analyticsData.customerMetrics.reduce((sum, m) => sum + m.averageLifetimeValue, 0) / analyticsData.customerMetrics.length).toFixed(2)
                              : '0.00'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <ShoppingCart className="h-8 w-8 text-purple-600" />
                        <div className="ml-3">
                          <p className="text-sm text-purple-600">Retention Rate</p>
                          <p className="text-xl font-bold text-purple-900">
                            {analyticsData.customerMetrics.length > 0 
                              ? Math.round((analyticsData.customerMetrics.reduce((sum, m) => sum + m.returningCustomers, 0) / 
                                analyticsData.customerMetrics.reduce((sum, m) => sum + m.newCustomers + m.returningCustomers, 0)) * 100)
                              : 0
                            }%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No customer data available</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Customer analytics will appear here after syncing your data
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;