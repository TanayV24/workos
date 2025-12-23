import React, { useEffect, useState } from 'react';
import { Settings, Save, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { taskRest } from '@/services/api';
import { ROLES } from '@/utils/roles';
import { useAuth } from '@/contexts/AuthContext';

type Flash = { type: 'success' | 'error'; text: string };

interface IntegrationSettings {
  allowemployeetaskcreation: boolean;
  allowemployeetaskassignment: boolean;
  allowintradepartmentassignments: boolean;
  allowmultitaskassignment: boolean;
  allowtimelinepriorityediting: boolean;
  crossdepartmenttaskredirection: 'direct' | 'teamlead';
  updatedat?: string;
  updatedby?: string;
}

const Integration: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [original, setOriginal] = useState<IntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);

  // Admin-only access - check ROLES.ADMIN constant
  useEffect(() => {
    console.log('🔐 User role:', user?.role, 'ROLES.ADMIN:', ROLES.ADMIN);
    if (user && user.role !== ROLES.ADMIN) {
      console.warn('❌ Access denied - not admin');
      window.location.href = '/dashboard';
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('📥 Loading integration settings...');
      const response = await taskRest.getTaskSettings();
      console.log('📨 Settings response:', response);
      
      const data = response.data as IntegrationSettings;
      setSettings(data);
      setOriginal(data);
      console.log('✅ Settings loaded:', data);
    } catch (err: any) {
      console.error('❌ Failed to load settings', err);
      setFlash({ type: 'error', text: `Failed to load settings: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof IntegrationSettings, value: any) => {
    if (!settings) return;
    const next = { ...settings, [field]: value };
    setSettings(next);
    if (original) {
      setChanged(JSON.stringify(next) !== JSON.stringify(original));
    }
  };

  const toggle = (field: keyof IntegrationSettings) => {
    if (!settings) return;
    updateField(field, !settings[field]);
  };

  const save = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const payload = {
        allowemployeetaskcreation: settings.allowemployeetaskcreation,
        allowemployeetaskassignment: settings.allowemployeetaskassignment,
        allowintradepartmentassignments: settings.allowintradepartmentassignments,
        allowmultitaskassignment: settings.allowmultitaskassignment,
        allowtimelinepriorityediting: settings.allowtimelinepriorityediting,
        crossdepartmenttaskredirection: settings.crossdepartmenttaskredirection,
      };
      await taskRest.updateTaskSettings(payload);
      setOriginal(settings);
      setChanged(false);
      setFlash({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setFlash(null), 3000);
    } catch (err: any) {
      console.error('Failed to save settings', err);
      setFlash({ type: 'error', text: `Failed to save settings: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!original) return;
    setSettings(original);
    setChanged(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!settings) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 mb-4">Could not load integration settings.</p>
          <button
            onClick={loadSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" /> Integration Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Control how tasks can be created, assigned, and managed across your organization.
          </p>
        </div>

        {/* Flash Messages */}
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-3 p-4 mb-6 rounded-lg border ${
              flash.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {flash.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{flash.text}</span>
          </motion.div>
        )}

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Employee Task Creation */}
          <SettingCard
            icon="✓"
            title="Allow Employee Task Creation"
            description="Employees can create their own tasks"
            enabled={settings.allowemployeetaskcreation}
            onToggle={() => toggle('allowemployeetaskcreation')}
          />

          {/* Employee Task Assignment */}
          <SettingCard
            icon="→"
            title="Allow Employee Task Assignment"
            description="Employees can assign tasks to others"
            enabled={settings.allowemployeetaskassignment}
            onToggle={() => toggle('allowemployeetaskassignment')}
          />

          {/* Intra-Department Assignments */}
          <SettingCard
            icon="↔"
            title="Allow Intra-Department Assignments"
            description="Tasks can be assigned within departments"
            enabled={settings.allowintradepartmentassignments}
            onToggle={() => toggle('allowintradepartmentassignments')}
          />

          {/* Multi-Task Assignment */}
          <SettingCard
            icon="∞"
            title="Allow Multi-Task Assignment"
            description="Users can be assigned multiple tasks"
            enabled={settings.allowmultitaskassignment}
            onToggle={() => toggle('allowmultitaskassignment')}
          />

          {/* Timeline & Priority Editing */}
          <SettingCard
            icon="📅"
            title="Allow Timeline & Priority Editing"
            description="Users can edit task deadlines and priorities"
            enabled={settings.allowtimelinepriorityediting}
            onToggle={() => toggle('allowtimelinepriorityediting')}
          />
        </div>

        {/* Cross-Department Redirection */}
        {settings.allowintradepartmentassignments && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-blue-50 rounded-lg border border-blue-200 mb-6"
          >
            <h3 className="font-semibold text-gray-900 mb-2">Cross-Department Redirection</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose how cross-department tasks should be routed.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={settings.crossdepartmenttaskredirection === 'direct'}
                  onChange={() => updateField('crossdepartmenttaskredirection', 'direct')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Direct assignment</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={settings.crossdepartmenttaskredirection === 'teamlead'}
                  onChange={() => updateField('crossdepartmenttaskredirection', 'teamlead')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Team Lead approval</span>
              </label>
            </div>
            <div className="mt-3 text-xs text-gray-600">
              Current: {settings.crossdepartmenttaskredirection === 'direct'
                ? 'Direct assignment'
                : 'Team Lead approval'}
            </div>
          </motion.div>
        )}

        {/* Last Updated */}
        <div className="text-sm text-gray-500 mb-6">
          Last updated: {settings.updatedat ? new Date(settings.updatedat).toLocaleString() : 'Never'}
          {settings.updatedby ? ` by ${settings.updatedby}` : ''}
        </div>

        {/* Actions */}
        {changed && (
          <div className="flex gap-3 justify-end">
            <button
              onClick={discard}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Discard
            </button>
            <button
              onClick={() => save()}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

interface SettingCardProps {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

const SettingCard: React.FC<SettingCardProps> = ({
  icon,
  title,
  description,
  enabled,
  onToggle,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    onClick={onToggle}
  >
    <div className="flex items-start justify-between mb-3">
      <span className="text-2xl">{icon}</span>
      <div className={`w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-green-500' : 'bg-gray-300'
      }`} />
    </div>
    <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
    <p className="text-sm text-gray-600 mb-3">{description}</p>
    <div className="text-xs font-medium text-gray-700">
      Status: {enabled ? '✓ Enabled' : '✗ Disabled'}
    </div>
  </motion.div>
);

export default Integration;