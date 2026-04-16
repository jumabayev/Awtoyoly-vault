import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  Trash2,
  History,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  Key,
  RefreshCw,
  Wand2,
  Globe,
  Tag,
  Filter,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import toast from 'react-hot-toast';
import {
  credentials as credentialsApi,
  branches as branchesApi,
  deviceTypes as deviceTypesApi,
  generatePassword,
} from '../lib/api';
import { cn, copyToClipboard, formatDate, getPasswordStrength } from '../lib/utils';
import { getDeviceIcon, DEVICE_TYPE_MAP } from '../lib/deviceTypes';
import useAuthStore from '../store/auth';

// ---- Credential Card ----
function CredentialCard({ cred, onEdit, onDelete, isManagerOrAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingPw, setLoadingPw] = useState(false);
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const deviceInfo = getDeviceIcon(cred.device_type);
  const DeviceIcon = deviceInfo.icon;

  const fetchPassword = async () => {
    if (password !== null) {
      setShowPassword(!showPassword);
      return;
    }
    setLoadingPw(true);
    try {
      const data = await credentialsApi.get(cred.id);
      setPassword(data.password);
      setShowPassword(true);
    } catch {
      toast.error('Failed to fetch password');
    } finally {
      setLoadingPw(false);
    }
  };

  const fetchHistory = async () => {
    if (history !== null) return;
    setLoadingHistory(true);
    try {
      const data = await credentialsApi.history(cred.id);
      setHistory(data);
    } catch {
      toast.error('Failed to fetch history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCopy = async (text, label) => {
    const ok = await copyToClipboard(text);
    if (ok) toast.success(`${label} copied`);
    else toast.error('Failed to copy');
  };

  const handleCopyPassword = async () => {
    let pw = password;
    if (!pw) {
      try {
        const data = await credentialsApi.get(cred.id);
        pw = data.password;
        setPassword(pw);
      } catch {
        toast.error('Failed to fetch password');
        return;
      }
    }
    await handleCopy(pw, 'Password');
  };

  return (
    <div className="bg-vault-card border border-vault-border rounded-2xl overflow-hidden transition-all hover:border-vault-accent/30 animate-fade-in">
      {/* Card header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-vault-hover/50 transition-colors"
        onClick={() => {
          setExpanded(!expanded);
          if (!expanded) fetchHistory();
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${deviceInfo.color}15` }}
        >
          <DeviceIcon className="w-5 h-5" style={{ color: deviceInfo.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-vault-text truncate">{cred.name}</h3>
          <div className="flex items-center gap-3 mt-0.5">
            {cred.ip_address && (
              <span className="text-xs text-vault-text-secondary font-mono">{cred.ip_address}</span>
            )}
            {cred.username && (
              <span className="text-xs text-vault-text-secondary">@{cred.username}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cred.tags && cred.tags.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              {(Array.isArray(cred.tags) ? cred.tags : cred.tags.split(',').map(t => t.trim()).filter(Boolean)).slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-vault-accent/10 text-vault-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${deviceInfo.color}15`,
              color: deviceInfo.color,
            }}
          >
            {deviceInfo.label}
          </span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-vault-text-secondary" />
          ) : (
            <ChevronRight className="w-4 h-4 text-vault-text-secondary" />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-vault-border px-4 py-4 space-y-4 animate-fade-in">
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {cred.ip_address && (
              <button
                onClick={() => handleCopy(cred.ip_address, 'IP Address')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-vault-bg border border-vault-border text-vault-text-secondary hover:text-vault-text hover:border-vault-accent/50 transition-all"
              >
                <Copy className="w-3 h-3" /> IP: {cred.ip_address}
              </button>
            )}
            {cred.username && (
              <button
                onClick={() => handleCopy(cred.username, 'Username')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-vault-bg border border-vault-border text-vault-text-secondary hover:text-vault-text hover:border-vault-accent/50 transition-all"
              >
                <Copy className="w-3 h-3" /> User: {cred.username}
              </button>
            )}
            <button
              onClick={handleCopyPassword}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-vault-bg border border-vault-border text-vault-text-secondary hover:text-vault-text hover:border-vault-accent/50 transition-all"
            >
              <Copy className="w-3 h-3" /> Copy Password
            </button>
          </div>

          {/* Detail fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Password */}
            <div className="bg-vault-bg rounded-xl p-3 border border-vault-border">
              <label className="text-[10px] uppercase tracking-wider text-vault-text-secondary font-semibold">Password</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-mono text-vault-text flex-1 truncate">
                  {loadingPw ? (
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                  ) : showPassword && password ? (
                    password
                  ) : (
                    '••••••••••••'
                  )}
                </span>
                <button
                  onClick={fetchPassword}
                  className="p-1 text-vault-text-secondary hover:text-vault-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Port */}
            {cred.port && (
              <div className="bg-vault-bg rounded-xl p-3 border border-vault-border">
                <label className="text-[10px] uppercase tracking-wider text-vault-text-secondary font-semibold">Port</label>
                <p className="text-sm font-mono text-vault-text mt-1">{cred.port}</p>
              </div>
            )}

            {/* Hostname */}
            {cred.hostname && (
              <div className="bg-vault-bg rounded-xl p-3 border border-vault-border">
                <label className="text-[10px] uppercase tracking-wider text-vault-text-secondary font-semibold">Hostname</label>
                <p className="text-sm text-vault-text mt-1 truncate">{cred.hostname}</p>
              </div>
            )}

            {/* URL */}
            {cred.url && (
              <div className="bg-vault-bg rounded-xl p-3 border border-vault-border">
                <label className="text-[10px] uppercase tracking-wider text-vault-text-secondary font-semibold">URL</label>
                <a
                  href={cred.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-vault-accent hover:underline mt-1 truncate block"
                >
                  {cred.url}
                </a>
              </div>
            )}

            {/* Protocol */}
            {cred.protocol && (
              <div className="bg-vault-bg rounded-xl p-3 border border-vault-border">
                <label className="text-[10px] uppercase tracking-wider text-vault-text-secondary font-semibold">Protocol</label>
                <p className="text-sm text-vault-text mt-1 uppercase">{cred.protocol}</p>
              </div>
            )}

            {/* Branch */}
            {cred.branch_name && (
              <div className="bg-vault-bg rounded-xl p-3 border border-vault-border">
                <label className="text-[10px] uppercase tracking-wider text-vault-text-secondary font-semibold">Branch</label>
                <p className="text-sm text-vault-text mt-1">{cred.branch_name}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {cred.notes && (
            <div className="bg-vault-bg rounded-xl p-3 border border-vault-border">
              <label className="text-[10px] uppercase tracking-wider text-vault-text-secondary font-semibold">Notes</label>
              <p className="text-sm text-vault-text mt-1 whitespace-pre-wrap">{cred.notes}</p>
            </div>
          )}

          {/* History */}
          {history && history.length > 0 && (
            <div className="bg-vault-bg rounded-xl p-3 border border-vault-border">
              <label className="text-[10px] uppercase tracking-wider text-vault-text-secondary font-semibold flex items-center gap-1">
                <History className="w-3 h-3" /> Change History
              </label>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-vault-text-secondary">
                      <th className="text-left py-1 pr-3">Date</th>
                      <th className="text-left py-1 pr-3">User</th>
                      <th className="text-left py-1 pr-3">Field</th>
                      <th className="text-left py-1 pr-3">Old</th>
                      <th className="text-left py-1">New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className="border-t border-vault-border">
                        <td className="py-1.5 pr-3 text-vault-text-secondary whitespace-nowrap">
                          {formatDate(h.changed_at)}
                        </td>
                        <td className="py-1.5 pr-3 text-vault-text">{h.display_name || h.username}</td>
                        <td className="py-1.5 pr-3 text-vault-accent">{h.field_name}</td>
                        <td className="py-1.5 pr-3 text-red-400 font-mono truncate max-w-[100px]">
                          {h.field_name === 'password' ? '••••' : h.old_value || '-'}
                        </td>
                        <td className="py-1.5 text-green-400 font-mono truncate max-w-[100px]">
                          {h.field_name === 'password' ? '••••' : h.new_value || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          {isManagerOrAdmin && (
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => onEdit(cred)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-vault-accent/10 text-vault-accent hover:bg-vault-accent/20 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => onDelete(cred)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Add/Edit Modal ----
function CredentialModal({ open, onClose, credential, branchList, deviceTypeList, onSave }) {
  const isEdit = !!credential?.id;
  const [form, setForm] = useState({
    name: '',
    branch_id: '',
    device_type: 'server',
    hostname: '',
    ip_address: '',
    port: '',
    username: '',
    password: '',
    url: '',
    protocol: '',
    notes: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);
  const [generatingPw, setGeneratingPw] = useState(false);
  const [pwLength, setPwLength] = useState(20);

  useEffect(() => {
    if (credential) {
      setForm({
        name: credential.name || '',
        branch_id: credential.branch_id || '',
        device_type: credential.device_type || 'server',
        hostname: credential.hostname || '',
        ip_address: credential.ip_address || '',
        port: credential.port || '',
        username: credential.username || '',
        password: credential.password || '',
        url: credential.url || '',
        protocol: credential.protocol || '',
        notes: credential.notes || '',
        tags: Array.isArray(credential.tags) ? credential.tags.join(', ') : credential.tags || '',
      });
    } else {
      setForm({
        name: '',
        branch_id: '',
        device_type: 'server',
        hostname: '',
        ip_address: '',
        port: '',
        username: '',
        password: '',
        url: '',
        protocol: '',
        notes: '',
        tags: '',
      });
    }
  }, [credential, open]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGeneratePassword = async () => {
    setGeneratingPw(true);
    try {
      const data = await generatePassword(pwLength);
      handleChange('password', data.password);
    } catch {
      toast.error('Failed to generate password');
    } finally {
      setGeneratingPw(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        port: form.port ? parseInt(form.port, 10) : null,
        tags: form.tags
          ? form.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      };

      if (isEdit) {
        await credentialsApi.update(credential.id, payload);
        toast.success('Credential updated');
      } else {
        await credentialsApi.create(payload);
        toast.success('Credential created');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const strength = getPasswordStrength(form.password);

  const inputClass = cn(
    'w-full px-3 py-2 rounded-xl bg-vault-input border border-vault-border',
    'text-sm text-vault-text placeholder-vault-text-secondary/50',
    'focus:outline-none focus:ring-2 focus:ring-vault-accent/50 focus:border-vault-accent transition-all'
  );

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-vault-card border border-vault-border rounded-2xl p-6 animate-scale-in">
          <Dialog.Title className="text-lg font-semibold text-vault-text">
            {isEdit ? 'Edit Credential' : 'New Credential'}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-vault-text-secondary mt-1">
            {isEdit ? 'Update the credential details.' : 'Add a new credential to the vault.'}
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Name *</label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Production Server"
                  required
                />
              </div>

              {/* Branch */}
              <div>
                <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Branch</label>
                <select
                  className={inputClass}
                  value={form.branch_id}
                  onChange={(e) => handleChange('branch_id', e.target.value)}
                >
                  <option value="">Select branch...</option>
                  {branchList.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Device Type */}
              <div>
                <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Device Type</label>
                <select
                  className={inputClass}
                  value={form.device_type}
                  onChange={(e) => handleChange('device_type', e.target.value)}
                >
                  {deviceTypeList.map((dt) => (
                    <option key={dt.id || dt.name} value={dt.id || dt.name}>
                      {dt.name || dt.id}
                    </option>
                  ))}
                  {deviceTypeList.length === 0 &&
                    Object.entries(DEVICE_TYPE_MAP).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))
                  }
                </select>
              </div>

              {/* IP Address */}
              <div>
                <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">IP Address</label>
                <input
                  className={inputClass}
                  value={form.ip_address}
                  onChange={(e) => handleChange('ip_address', e.target.value)}
                  placeholder="192.168.1.1"
                />
              </div>

              {/* Hostname */}
              <div>
                <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Hostname</label>
                <input
                  className={inputClass}
                  value={form.hostname}
                  onChange={(e) => handleChange('hostname', e.target.value)}
                  placeholder="server01.local"
                />
              </div>

              {/* Port */}
              <div>
                <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Port</label>
                <input
                  className={inputClass}
                  type="number"
                  value={form.port}
                  onChange={(e) => handleChange('port', e.target.value)}
                  placeholder="22"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Username</label>
                <input
                  className={inputClass}
                  value={form.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="admin"
                />
              </div>

              {/* Protocol */}
              <div>
                <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Protocol</label>
                <input
                  className={inputClass}
                  value={form.protocol}
                  onChange={(e) => handleChange('protocol', e.target.value)}
                  placeholder="SSH, HTTPS, RDP..."
                />
              </div>
            </div>

            {/* Password with generator */}
            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Password</label>
              <div className="flex gap-2">
                <input
                  className={cn(inputClass, 'flex-1 font-mono')}
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  disabled={generatingPw}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-vault-accent/10 text-vault-accent hover:bg-vault-accent/20 transition-all disabled:opacity-50"
                >
                  {generatingPw ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  Generate
                </button>
              </div>

              {/* Password strength meter */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-vault-text-secondary">Strength</span>
                    <span className="text-[10px] font-medium text-vault-text-secondary">{strength.label}</span>
                  </div>
                  <div className="w-full h-1 bg-vault-border rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-300', strength.color)}
                      style={{ width: `${strength.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Length slider */}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] text-vault-text-secondary">Length: {pwLength}</span>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={pwLength}
                  onChange={(e) => setPwLength(parseInt(e.target.value, 10))}
                  className="flex-1 h-1 accent-vault-accent"
                />
              </div>
            </div>

            {/* URL */}
            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">URL</label>
              <input
                className={inputClass}
                value={form.url}
                onChange={(e) => handleChange('url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Tags (comma separated)</label>
              <input
                className={inputClass}
                value={form.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                placeholder="production, web, critical"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Notes</label>
              <textarea
                className={cn(inputClass, 'resize-none h-20')}
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-vault-text-secondary hover:text-vault-text hover:bg-vault-hover transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-vault-accent hover:bg-vault-accent-hover transition-all disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? 'Update' : 'Create'}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4 p-1.5 text-vault-text-secondary hover:text-vault-text transition-colors rounded-lg hover:bg-vault-hover">
              <X className="w-4 h-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---- Delete Confirm Modal ----
function DeleteModal({ open, onClose, credential, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await credentialsApi.delete(credential.id);
      toast.success('Credential deleted');
      onConfirm();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-vault-card border border-vault-border rounded-2xl p-6 animate-scale-in">
          <Dialog.Title className="text-lg font-semibold text-vault-text">Delete Credential</Dialog.Title>
          <Dialog.Description className="text-sm text-vault-text-secondary mt-2">
            Are you sure you want to delete <strong className="text-vault-text">{credential?.name}</strong>? This action cannot be undone.
          </Dialog.Description>
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-vault-text-secondary hover:text-vault-text hover:bg-vault-hover transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---- Main Page ----
export default function Credentials() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [credList, setCredList] = useState([]);
  const [branchList, setBranchList] = useState([]);
  const [deviceTypeList, setDeviceTypeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selectedBranch, setSelectedBranch] = useState(searchParams.get('branch_id') || '');
  const [selectedDeviceType, setSelectedDeviceType] = useState(searchParams.get('device_type') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCred, setEditCred] = useState(null);
  const [deleteCred, setDeleteCred] = useState(null);
  const isManager = useAuthStore((s) => s.isManager);

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedBranch) params.branch_id = selectedBranch;
      if (search) params.q = search;
      if (selectedDeviceType) params.device_type = selectedDeviceType;
      const data = await credentialsApi.list(params);
      setCredList(data);
    } catch {
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, search, selectedDeviceType]);

  useEffect(() => {
    branchesApi.list().then(setBranchList).catch(() => {});
    deviceTypesApi.list().then(setDeviceTypeList).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCredentials();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCredentials]);

  // Sync URL params
  useEffect(() => {
    const params = {};
    if (selectedBranch) params.branch_id = selectedBranch;
    if (search) params.q = search;
    if (selectedDeviceType) params.device_type = selectedDeviceType;
    setSearchParams(params, { replace: true });
  }, [selectedBranch, search, selectedDeviceType, setSearchParams]);

  const handleEdit = async (cred) => {
    try {
      const full = await credentialsApi.get(cred.id);
      setEditCred(full);
      setModalOpen(true);
    } catch {
      toast.error('Failed to load credential');
    }
  };

  const handleAdd = () => {
    setEditCred(null);
    setModalOpen(true);
  };

  return (
    <div className="flex h-full">
      {/* Branch sidebar */}
      <div className="hidden lg:flex flex-col w-56 border-r border-vault-border bg-vault-sidebar/50 overflow-y-auto flex-shrink-0">
        <div className="px-4 py-4 border-b border-vault-border">
          <h3 className="text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">Branches</h3>
        </div>
        <div className="p-2 space-y-0.5">
          <button
            onClick={() => setSelectedBranch('')}
            className={cn(
              'w-full text-left px-3 py-2 rounded-xl text-sm transition-all',
              !selectedBranch
                ? 'bg-vault-accent/10 text-vault-accent font-medium'
                : 'text-vault-text-secondary hover:text-vault-text hover:bg-vault-hover'
            )}
          >
            All Branches
          </button>
          {branchList.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranch(b.id.toString())}
              className={cn(
                'w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center gap-2',
                selectedBranch === b.id.toString()
                  ? 'bg-vault-accent/10 text-vault-accent font-medium'
                  : 'text-vault-text-secondary hover:text-vault-text hover:bg-vault-hover'
              )}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: b.color || '#6b7280' }}
              />
              <span className="truncate flex-1">{b.name}</span>
              <span className="text-[10px] opacity-60">{b.credential_count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-vault-border bg-vault-card/50">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vault-text-secondary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search credentials..."
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl bg-vault-input border border-vault-border',
                  'text-sm text-vault-text placeholder-vault-text-secondary/50',
                  'focus:outline-none focus:ring-2 focus:ring-vault-accent/50 focus:border-vault-accent transition-all'
                )}
              />
            </div>

            {/* Mobile branch filter */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden p-2.5 rounded-xl border border-vault-border text-vault-text-secondary hover:text-vault-text hover:bg-vault-hover transition-all"
            >
              <Filter className="w-4 h-4" />
            </button>

            {/* Device type filter */}
            <select
              value={selectedDeviceType}
              onChange={(e) => setSelectedDeviceType(e.target.value)}
              className="hidden sm:block px-3 py-2.5 rounded-xl bg-vault-input border border-vault-border text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent/50 transition-all"
            >
              <option value="">All Types</option>
              {deviceTypeList.map((dt) => (
                <option key={dt.id || dt.name} value={dt.id || dt.name}>
                  {dt.name || dt.id}
                </option>
              ))}
              {deviceTypeList.length === 0 &&
                Object.entries(DEVICE_TYPE_MAP).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))
              }
            </select>

            <button
              onClick={fetchCredentials}
              className="p-2.5 rounded-xl border border-vault-border text-vault-text-secondary hover:text-vault-text hover:bg-vault-hover transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {isManager() && (
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-vault-accent hover:bg-vault-accent-hover transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add</span>
              </button>
            )}
          </div>

          {/* Mobile filters */}
          {showFilters && (
            <div className="lg:hidden mt-3 flex flex-wrap gap-2 animate-fade-in">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-2 rounded-xl bg-vault-input border border-vault-border text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent/50"
              >
                <option value="">All Branches</option>
                {branchList.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <select
                value={selectedDeviceType}
                onChange={(e) => setSelectedDeviceType(e.target.value)}
                className="sm:hidden px-3 py-2 rounded-xl bg-vault-input border border-vault-border text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent/50"
              >
                <option value="">All Types</option>
                {Object.entries(DEVICE_TYPE_MAP).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Credential list */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-vault-accent" />
            </div>
          ) : credList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-vault-text-secondary">
              <Key className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-lg font-medium">No credentials found</p>
              <p className="text-sm mt-1">
                {search || selectedBranch || selectedDeviceType
                  ? 'Try adjusting your filters'
                  : 'Add your first credential to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-w-4xl">
              <p className="text-xs text-vault-text-secondary mb-4">
                {credList.length} credential{credList.length !== 1 ? 's' : ''} found
              </p>
              {credList.map((cred) => (
                <CredentialCard
                  key={cred.id}
                  cred={cred}
                  onEdit={handleEdit}
                  onDelete={setDeleteCred}
                  isManagerOrAdmin={isManager()}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CredentialModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditCred(null);
        }}
        credential={editCred}
        branchList={branchList}
        deviceTypeList={deviceTypeList}
        onSave={fetchCredentials}
      />
      <DeleteModal
        open={!!deleteCred}
        onClose={() => setDeleteCred(null)}
        credential={deleteCred}
        onConfirm={fetchCredentials}
      />
    </div>
  );
}
