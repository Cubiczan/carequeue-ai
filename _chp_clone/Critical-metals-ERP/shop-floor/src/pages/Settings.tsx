import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');

  const [settings, setSettings] = useState({
    // General
    companyName: 'Battery Recycling Company',
    timezone: 'UTC',
    language: 'en',
    
    // Notifications
    emailNotifications: true,
    lowStockAlerts: true,
    qualityAlerts: true,
    productionAlerts: true,
    
    // Quality
    defaultSampleSize: 1,
    requireInspectionForReceipt: true,
    autoRejectBelowPurity: 95,
    
    // Production
    autoStartNextWorkOrder: false,
    trackDowntime: true,
    requireCompletionNotes: false
  });

  const handleToggle = (key: string) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = () => {
    // In production, this would save to backend
    alert('Settings saved successfully!');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure shop floor preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {[
            { id: 'general', label: 'General' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'quality', label: 'Quality' },
            { id: 'production', label: 'Production' },
            { id: 'users', label: 'Users' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card max-w-2xl">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">General Settings</h2>
            
            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                className="input"
                value={settings.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Timezone</label>
              <select
                className="input"
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>

            <div>
              <label className="label">Language</label>
              <select
                className="input"
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="zh">中文</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Notification Settings</h2>
            
            <ToggleSetting
              label="Email Notifications"
              description="Receive email alerts for important events"
              enabled={settings.emailNotifications}
              onToggle={() => handleToggle('emailNotifications')}
            />

            <ToggleSetting
              label="Low Stock Alerts"
              description="Get notified when inventory falls below threshold"
              enabled={settings.lowStockAlerts}
              onToggle={() => handleToggle('lowStockAlerts')}
            />

            <ToggleSetting
              label="Quality Alerts"
              description="Get notified of quality inspection failures"
              enabled={settings.qualityAlerts}
              onToggle={() => handleToggle('qualityAlerts')}
            />

            <ToggleSetting
              label="Production Alerts"
              description="Get notified of production issues and delays"
              enabled={settings.productionAlerts}
              onToggle={() => handleToggle('productionAlerts')}
            />
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Quality Settings</h2>
            
            <div>
              <label className="label">Default Sample Size</label>
              <input
                type="number"
                className="input"
                value={settings.defaultSampleSize}
                onChange={(e) => handleChange('defaultSampleSize', parseInt(e.target.value) || 1)}
                min="1"
              />
            </div>

            <ToggleSetting
              label="Require Inspection for Receipt"
              description="All inbound batteries must pass inspection"
              enabled={settings.requireInspectionForReceipt}
              onToggle={() => handleToggle('requireInspectionForReceipt')}
            />

            <div>
              <label className="label">Auto-Reject Below Purity (%)</label>
              <input
                type="number"
                className="input"
                value={settings.autoRejectBelowPurity}
                onChange={(e) => handleChange('autoRejectBelowPurity', parseInt(e.target.value) || 95)}
                min="0"
                max="100"
              />
              <p className="text-sm text-gray-500 mt-1">
                Materials below this purity will be automatically flagged for review
              </p>
            </div>
          </div>
        )}

        {activeTab === 'production' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Production Settings</h2>
            
            <ToggleSetting
              label="Auto-Start Next Work Order"
              description="Automatically start the next pending work order when one completes"
              enabled={settings.autoStartNextWorkOrder}
              onToggle={() => handleToggle('autoStartNextWorkOrder')}
            />

            <ToggleSetting
              label="Track Downtime"
              description="Record and analyze production downtime"
              enabled={settings.trackDowntime}
              onToggle={() => handleToggle('trackDowntime')}
            />

            <ToggleSetting
              label="Require Completion Notes"
              description="Require operators to add notes when completing work orders"
              enabled={settings.requireCompletionNotes}
              onToggle={() => handleToggle('requireCompletionNotes')}
            />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">User Management</h2>
            <p className="text-gray-600">
              User management is handled through ERPNext. 
              <a href="http://localhost:8080/app/user" className="text-green-600 hover:underline ml-1">
                Manage Users in ERPNext →
              </a>
            </p>
          </div>
        )}

        {/* Save Button */}
        <div className="border-t pt-6 mt-6">
          <button onClick={handleSave} className="btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({ label, description, enabled, onToggle }: any) {
  return (
    <div className="flex justify-between items-start py-4 border-b last:border-0">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-green-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}
