import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, ScrollText, Filter } from 'lucide-react';
import { audit as auditApi } from '../lib/api';
import { cn, formatDate } from '../lib/utils';

const ACTION_COLORS = {
  create: 'bg-green-500/10 text-green-400',
  update: 'bg-blue-500/10 text-blue-400',
  delete: 'bg-red-500/10 text-red-400',
  login: 'bg-purple-500/10 text-purple-400',
  logout: 'bg-gray-500/10 text-gray-400',
  view: 'bg-cyan-500/10 text-cyan-400',
};

function getActionStyle(action) {
  if (!action) return ACTION_COLORS.view;
  const lower = action.toLowerCase();
  for (const [key, value] of Object.entries(ACTION_COLORS)) {
    if (lower.includes(key)) return value;
  }
  return 'bg-vault-accent/10 text-vault-accent';
}

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    setLoading(true);
    auditApi
      .list(limit)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !search ||
        [log.username, log.action, log.target_type, log.target_name, log.ip_address]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(search.toLowerCase()));
      const matchAction = !actionFilter || (log.action && log.action.toLowerCase().includes(actionFilter.toLowerCase()));
      return matchSearch && matchAction;
    });
  }, [logs, search, actionFilter]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action).filter(Boolean));
    return Array.from(actions).sort();
  }, [logs]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-vault-text">Audit Log</h1>
          <p className="text-vault-text-secondary mt-1">Track all system activity</p>
        </div>
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10))}
          className="px-3 py-2 rounded-xl bg-vault-input border border-vault-border text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent/50 transition-all"
        >
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
          <option value={250}>Last 250</option>
          <option value={500}>Last 500</option>
        </select>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit logs..."
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-xl bg-vault-input border border-vault-border',
              'text-sm text-vault-text placeholder-vault-text-secondary/50',
              'focus:outline-none focus:ring-2 focus:ring-vault-accent/50 focus:border-vault-accent transition-all'
            )}
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-vault-input border border-vault-border text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent/50 transition-all"
        >
          <option value="">All Actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-vault-accent" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-vault-text-secondary">
          <ScrollText className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No audit logs found</p>
          <p className="text-sm mt-1">
            {search || actionFilter ? 'Try adjusting your filters' : 'Activity will appear here'}
          </p>
        </div>
      ) : (
        <div className="bg-vault-card border border-vault-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-vault-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">Time</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">Action</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">Target</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, i) => (
                <tr
                  key={i}
                  className="border-b border-vault-border last:border-0 hover:bg-vault-hover/50 transition-colors"
                >
                  <td className="px-6 py-3">
                    <span className="text-sm text-vault-text-secondary whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm font-medium text-vault-text">{log.username || '-'}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getActionStyle(log.action)
                      )}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div>
                      <span className="text-xs text-vault-text-secondary">{log.target_type}</span>
                      {log.target_name && (
                        <span className="text-sm text-vault-text ml-1.5 font-medium">{log.target_name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm text-vault-text-secondary font-mono">{log.ip_address || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-vault-text-secondary mt-4 text-center">
        Showing {filteredLogs.length} of {logs.length} entries
      </p>
    </div>
  );
}
