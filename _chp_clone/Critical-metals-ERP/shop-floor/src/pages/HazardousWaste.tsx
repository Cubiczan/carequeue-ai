import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import {
  ExclamationTriangleIcon,
  PlusIcon,
  DocumentTextIcon,
  TruckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function HazardousWaste() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'manifests' | 'pickups' | 'compliance'>('manifests');
  const [showNewManifest, setShowNewManifest] = useState(false);
  const [selectedManifest, setSelectedManifest] = useState<string | null>(null);

  const { data: manifests, isLoading: manifestsLoading } = useQuery({
    queryKey: ['hazmat-manifests'],
    queryFn: () => api.get('/api/hazmat/manifests')
  });

  const { data: attentionItems, isLoading: attentionLoading } = useQuery({
    queryKey: ['hazmat-attention'],
    queryFn: () => api.get('/api/hazmat/compliance/attention?days=90')
  });

  const createManifestMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/hazmat/manifests', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hazmat-manifests'] });
      toast.success('Manifest created successfully');
      setShowNewManifest(false);
    }
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'badge-warning',
      in_storage: 'badge-info',
      scheduled: 'badge-warning',
      in_transit: 'badge-info',
      disposed: 'badge-success'
    };
    return badges[status] || 'badge-info';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hazardous Waste Tracking</h1>
            <p className="text-gray-600 mt-1">Manage waste manifests and compliance</p>
          </div>
          <button
            onClick={() => setShowNewManifest(true)}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            New Manifest
          </button>
        </div>
      </div>

      {/* Compliance Alerts */}
      {attentionItems?.data && attentionItems.data.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">
                {attentionItems.data.length} Manifest(s) Requiring Attention
              </h3>
              <p className="text-sm text-red-700 mt-1">
                These manifests have exceeded or are approaching the 90-day accumulation limit
              </p>
              <div className="mt-3 space-y-2">
                {attentionItems.data.slice(0, 3).map((item: any) => (
                  <div key={item.manifest_id} className="flex justify-between text-sm">
                    <span className="font-medium">{item.manifest_id}</span>
                    <span className="text-red-700">
                      {item.days_accumulated} days ({item.compliance.days_remaining} days over limit)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {[
            { id: 'manifests', label: 'Manifests', count: manifests?.data?.length },
            { id: 'pickups', label: 'Scheduled Pickups' },
            { id: 'compliance', label: 'Compliance Reports' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'manifests' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Hazardous Waste Manifests</h2>
          
          {manifestsLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : !manifests?.data || manifests.data.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No manifests yet</p>
              <button
                onClick={() => setShowNewManifest(true)}
                className="mt-4 text-green-600 hover:text-green-800"
              >
                Create your first manifest →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Manifest ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Waste Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total Weight</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Storage</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Accumulation Start</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Days</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {manifests.data.map((manifest: any) => {
                    const daysAccumulated = Math.floor(
                      (new Date().getTime() - new Date(manifest.accumulation_start_date).getTime()) / 
                      (1000 * 60 * 60 * 24)
                    );
                    
                    return (
                      <tr key={manifest.manifest_id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{manifest.manifest_id}</td>
                        <td className="px-4 py-3 text-sm">{manifest.waste_type}</td>
                        <td className="px-4 py-3 text-sm">{manifest.total_weight_kg} kg</td>
                        <td className="px-4 py-3 text-sm">{manifest.storage_location}</td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(manifest.accumulation_start_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={daysAccumulated > 80 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {daysAccumulated} days
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${getStatusBadge(manifest.status)}`}>
                            {manifest.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedManifest(manifest.manifest_id)}
                            className="text-green-600 hover:text-green-800 font-medium text-sm"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'pickups' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Scheduled Pickups</h2>
          <div className="text-center py-12 text-gray-500">
            <TruckIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No scheduled pickups</p>
          </div>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Compliance Reports</h2>
          <div className="space-y-4">
            <button className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Quarterly Compliance Report</h3>
                  <p className="text-sm text-gray-600 mt-1">EPA required quarterly summary</p>
                </div>
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            </button>
            <button className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">Annual Waste Summary</h3>
                  <p className="text-sm text-gray-600 mt-1">Complete annual waste report</p>
                </div>
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* New Manifest Modal */}
      {showNewManifest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">New Hazardous Waste Manifest</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createManifestMutation.mutate({
                    waste_type: formData.get('waste_type'),
                    generator: formData.get('generator'),
                    storage_location: formData.get('storage_location'),
                    accumulation_start_date: formData.get('accumulation_start_date')
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label">Waste Type</label>
                  <select name="waste_type" className="input" required>
                    <option value="">Select waste type...</option>
                    <option value="ignitable">D001 - Ignitable Waste</option>
                    <option value="corrosive">D002 - Corrosive Waste</option>
                    <option value="reactive">D003 - Reactive Waste</option>
                    <option value="toxic">D004-D011 - Toxic Waste</option>
                    <option value="organic">F001-F005 - Organic Waste</option>
                    <option value="solvent">F006 - Solvent Waste</option>
                  </select>
                </div>
                <div>
                  <label className="label">Generator</label>
                  <input name="generator" type="text" className="input" placeholder="Company name" required />
                </div>
                <div>
                  <label className="label">Storage Location</label>
                  <select name="storage_location" className="input" required>
                    <option value="">Select location...</option>
                    <option value="HazMat Storage A">HazMat Storage A</option>
                    <option value="HazMat Storage B">HazMat Storage B</option>
                    <option value="Temporary Accumulation">Temporary Accumulation Area</option>
                  </select>
                </div>
                <div>
                  <label className="label">Accumulation Start Date</label>
                  <input name="accumulation_start_date" type="date" className="input" required />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    Create Manifest
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewManifest(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
