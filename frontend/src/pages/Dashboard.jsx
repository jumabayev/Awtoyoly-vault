import { useState, useEffect } from 'react';
import { KeyRound, GitBranch, Users, Activity, Server, Shield, Network, Loader2 } from 'lucide-react';
import { dashboard as dashboardApi } from '../lib/api';
import { formatRelativeTime, cn } from '../lib/utils';
import { getDeviceIcon } from '../lib/deviceTypes';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-vault-card border border-vault-border rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-vault-text-secondary font-medium">{label}</p>
          <p className="text-3xl font-bold text-vault-text mt-1">{value}</p>
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function DeviceTypeChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="bg-vault-card border border-vault-border rounded-2xl p-6 animate-fade-in">
      <h3 className="text-lg font-semibold text-vault-text mb-4">By Device Type</h3>
      <div className="space-y-3">
        {data.map((item) => {
          const deviceInfo = getDeviceIcon(item.device_type);
          const DeviceIcon = deviceInfo.icon;
          const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          return (
            <div key={item.device_type} className="flex items-center gap-3">
              <DeviceIcon className="w-4 h-4 flex-shrink-0" style={{ color: deviceInfo.color }} />
              <span className="text-sm text-vault-text-secondary w-20 truncate">{deviceInfo.label}</span>
              <div className="flex-1 h-6 bg-vault-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: deviceInfo.color,
                    opacity: 0.7,
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-vault-text w-8 text-right">{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BranchChart({ data }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-vault-card border border-vault-border rounded-2xl p-6 animate-fade-in">
      <h3 className="text-lg font-semibold text-vault-text mb-4">By Branch</h3>
      <div className="space-y-3">
        {data.map((item) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div key={item.id || item.name} className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color || '#6b7280' }}
              />
              <span className="text-sm text-vault-text-secondary flex-1 truncate">{item.name}</span>
              <div className="w-24 h-2 bg-vault-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: item.color || '#6b7280',
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-vault-text w-8 text-right">{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentActivity({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-vault-card border border-vault-border rounded-2xl p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-vault-text mb-4">Recent Activity</h3>
        <p className="text-sm text-vault-text-secondary">No recent activity</p>
      </div>
    );
  }

  const getActionColor = (action) => {
    if (action?.includes('create') || action?.includes('add')) return 'text-green-400';
    if (action?.includes('delete') || action?.includes('remove')) return 'text-red-400';
    if (action?.includes('update') || action?.includes('edit')) return 'text-blue-400';
    return 'text-vault-text-secondary';
  };

  return (
    <div className="bg-vault-card border border-vault-border rounded-2xl p-6 animate-fade-in">
      <h3 className="text-lg font-semibold text-vault-text mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {data.slice(0, 10).map((item, i) => (
          <div key={i} className="flex items-start gap-3 py-2 border-b border-vault-border last:border-0">
            <div className="w-8 h-8 rounded-full bg-vault-bg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Activity className="w-3.5 h-3.5 text-vault-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-vault-text">
                <span className="font-medium">{item.username}</span>{' '}
                <span className={getActionColor(item.action)}>{item.action}</span>{' '}
                <span className="text-vault-text-secondary">{item.target_type}</span>{' '}
                <span className="font-medium">{item.target_name}</span>
              </p>
              <p className="text-xs text-vault-text-secondary mt-0.5">
                {formatRelativeTime(item.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .get()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-vault-accent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-vault-text">Dashboard</h1>
        <p className="text-vault-text-secondary mt-1">Overview of your vault</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={KeyRound}
          label="Total Credentials"
          value={data?.total_credentials ?? 0}
          color="#3b82f6"
        />
        <StatCard
          icon={GitBranch}
          label="Branches"
          value={data?.total_branches ?? 0}
          color="#8b5cf6"
        />
        <StatCard
          icon={Users}
          label="Users"
          value={data?.total_users ?? 0}
          color="#10b981"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeviceTypeChart data={data?.by_device_type} />
        <BranchChart data={data?.by_branch} />
      </div>

      {/* Recent Activity */}
      <RecentActivity data={data?.recent_activity} />
    </div>
  );
}
