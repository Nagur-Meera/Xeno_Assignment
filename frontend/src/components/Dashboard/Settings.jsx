import React, { useState, useEffect } from 'react';
import { Save, Key, Globe, Webhook, Bell, Shield, User, Building, Eye, EyeOff, ExternalLink, CheckCircle, AlertCircle, Users, ShoppingCart, Package, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [tenantData, setTenantData] = useState({
    name: user?.tenant?.name || '',
    shopifyDomain: user?.tenant?.shopifyDomain || '',
    shopifyToken: '',
    webhookSecret: '',
    hasExistingToken: false
  });

  // Load existing token info on component mount
  useEffect(() => {
    if (user?.tenant) {
      setTenantData(prev => ({
        ...prev,
        name: user.tenant.name || '',
        shopifyDomain: user.tenant.shopifyDomain || '',
        hasExistingToken: user.tenant.hasShopifyToken || false,
        shopifyToken: user.tenant.hasShopifyToken ? user.tenant.shopifyAccessToken || '' : ''
      }));
    }
  }, [user]);

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    token: false
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'store', label: 'Store Settings', icon: Building },
    { id: 'shopify', label: 'Shopify Integration', icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const getTabContent = (tab) => {
    switch (tab) {
      case 'notifications':
        return 'Configure email notifications, alerts, and dashboard preferences. Get notified about order updates, customer activities, and system events.';
      case 'security':
        return 'Manage account security settings, API access controls, and data privacy preferences. Configure two-factor authentication and access logs.';
      default:
        return 'Settings configuration';
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    if (profileData.newPassword && profileData.newPassword.length < 6) {
      showMessage('error', 'New password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        name: profileData.name,
        email: profileData.email
      };

      if (profileData.newPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      const response = await api.put('/api/auth/profile', updateData);
      
      updateUser(response.data.user);
      showMessage('success', 'Profile updated successfully');
      
      // Clear password fields
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleShopifySubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const response = await api.put('/api/auth/shopify-credentials', {
        shopifyToken: tenantData.shopifyToken,
        webhookSecret: tenantData.webhookSecret
      });
      
      // Update user context to reflect new token status
      if (response.data.tenant) {
        updateUser({
          ...user,
          tenant: {
            ...user.tenant,
            hasShopifyToken: response.data.tenant.hasCredentials
          }
        });
        
        // Update local state to show token is saved
        setTenantData(prev => ({
          ...prev,
          hasExistingToken: response.data.tenant.hasCredentials,
          shopifyToken: '' // Clear the input after successful save
        }));
      }
      
      showMessage('success', 'Shopify credentials updated successfully');
      
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Failed to update Shopify credentials');
    } finally {
      setLoading(false);
    }
  };

  const testShopifyConnection = async () => {
    try {
      setLoading(true);
      
      // Test connection to Shopify store
      const response = await api.post('/api/shopify/test-connection');
      
      if (response.data.success) {
        showMessage('success', 'Shopify connection successful!');
      } else {
        showMessage('error', 'Failed to connect to Shopify store');
      }
      
    } catch (error) {
      showMessage('error', error.response?.data?.error || 'Failed to test Shopify connection');
    } finally {
      setLoading(false);
    }
  };

  const syncShopifyData = async (dataType) => {
    try {
      setLoading(true);
      
      let endpoint;
      let successMessage;
      
      switch (dataType) {
        case 'customers':
          endpoint = '/api/shopify/sync/customers';
          successMessage = 'Customers synced successfully!';
          break;
        case 'orders':
          endpoint = '/api/shopify/sync/orders';
          successMessage = 'Orders synced successfully!';
          break;
        case 'products':
          endpoint = '/api/shopify/sync/products';
          successMessage = 'Products synced successfully!';
          break;
        default:
          throw new Error('Invalid data type');
      }
      
      const response = await api.post(endpoint);
      
      if (response.data.success) {
        showMessage('success', `${successMessage} (${response.data.count || 0} items)`);
      } else {
        showMessage('error', `Failed to sync ${dataType}`);
      }
    } catch (error) {
      console.error(`Error syncing ${dataType}:`, error);
      showMessage('error', error.response?.data?.error || `Failed to sync ${dataType}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and store configuration</p>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`p-4 rounded-lg flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-2" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-2" />
          )}
          {message.text}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
                
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.current ? 'text' : 'password'}
                            value={profileData.currentPassword}
                            onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                          >
                            {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.new ? 'text' : 'password'}
                              value={profileData.newPassword}
                              onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.confirm ? 'text' : 'password'}
                              value={profileData.confirmPassword}
                              onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Store Settings */}
            {activeTab === 'store' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Store Configuration</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Store Name
                    </label>
                    <input
                      type="text"
                      value={tenantData.name}
                      onChange={(e) => setTenantData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your Store Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shopify Domain
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={tenantData.shopifyDomain}
                        onChange={(e) => setTenantData(prev => ({ ...prev, shopifyDomain: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="your-store"
                      />
                      <span className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-lg">
                        .myshopify.com
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-900">Store URL</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Your store: <strong>xeno-analytics-demo1.myshopify.com</strong>
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      Password: demo123
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Shopify Integration */}
            {activeTab === 'shopify' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Shopify Integration</h2>
                
                <form onSubmit={handleShopifySubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shopify Access Token
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.token ? 'text' : 'password'}
                        value={tenantData.shopifyToken}
                        onChange={(e) => setTenantData(prev => ({ ...prev, shopifyToken: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={tenantData.hasExistingToken ? "Token is saved (enter new token to update)" : "shpat_..."}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, token: !prev.token }))}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        Your private app access token from Shopify Admin
                      </p>
                      {tenantData.hasExistingToken && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Token Saved
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Webhook Secret (Optional)
                    </label>
                    <input
                      type="text"
                      value={tenantData.webhookSecret}
                      onChange={(e) => setTenantData(prev => ({ ...prev, webhookSecret: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Webhook signing secret"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used to verify webhook authenticity
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Key className="h-5 w-5 text-yellow-600 mr-2" />
                      <span className="text-sm font-medium text-yellow-900">Setup Instructions</span>
                    </div>
                    <ol className="text-sm text-yellow-800 mt-2 space-y-1 list-decimal list-inside">
                      <li>Go to your Shopify Admin → Settings → Apps and sales channels</li>
                      <li>Click "Develop apps" → "Create an app"</li>
                      <li>Configure API access with read permissions for orders, customers, products</li>
                      <li>Install the app and copy the access token here</li>
                    </ol>
                    <a
                      href={`https://${user?.tenant?.shopifyDomain || 'xeno-analytics-demo1'}.myshopify.com/admin`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-yellow-700 hover:text-yellow-900 text-sm mt-2"
                    >
                      Open Shopify Admin <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Credentials'}
                    </button>

                    <button
                      type="button"
                      onClick={testShopifyConnection}
                      disabled={loading || (!tenantData.shopifyToken && !tenantData.hasExistingToken)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Webhook className="h-4 w-4 mr-2" />
                      Test Connection
                    </button>
                  </div>
                </form>

                {/* Data Sync Section */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Synchronization</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Import your Shopify data to start analyzing your store performance. Click the buttons below to sync specific data types.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => syncShopifyData('customers')}
                      disabled={loading || (!tenantData.shopifyToken && !tenantData.hasExistingToken)}
                      className="flex flex-col items-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Users className="h-8 w-8 text-purple-600 mb-2" />
                      <span className="font-medium text-purple-900">Sync Customers</span>
                      <span className="text-xs text-purple-700 mt-1">Import customer data</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => syncShopifyData('orders')}
                      disabled={loading || (!tenantData.shopifyToken && !tenantData.hasExistingToken)}
                      className="flex flex-col items-center p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ShoppingCart className="h-8 w-8 text-orange-600 mb-2" />
                      <span className="font-medium text-orange-900">Sync Orders</span>
                      <span className="text-xs text-orange-700 mt-1">Import order history</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => syncShopifyData('products')}
                      disabled={loading || (!tenantData.shopifyToken && !tenantData.hasExistingToken)}
                      className="flex flex-col items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Package className="h-8 w-8 text-green-600 mb-2" />
                      <span className="font-medium text-green-900">Sync Products</span>
                      <span className="text-xs text-green-700 mt-1">Import product catalog</span>
                    </button>
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <RefreshCw className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-900">Sync Tips</span>
                    </div>
                    <ul className="text-sm text-blue-800 mt-2 space-y-1">
                      <li>• Start with customers and products first</li>
                      <li>• Orders may take longer if you have a large catalog</li>
                      <li>• Data will be automatically updated on subsequent syncs</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Other tabs placeholder */}
            {(activeTab === 'notifications' || activeTab === 'security') && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    {activeTab === 'notifications' ? 'Notification Settings' : 'Security Settings'}
                  </h2>
                  <div className="text-center py-12">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      {activeTab === 'notifications' ? (
                        <Bell className="h-8 w-8 text-gray-400" />
                      ) : (
                        <Shield className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <p className="text-gray-500">
                      {getTabContent(activeTab)}
                    </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;