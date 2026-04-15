import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  GitBranch,
  Palette,
  Hash,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import toast from 'react-hot-toast';
import { branches as branchesApi } from '../lib/api';
import { cn } from '../lib/utils';
import useAuthStore from '../store/auth';

const ICON_OPTIONS = [
  'building', 'server', 'network', 'globe', 'shield', 'database',
  'cloud', 'monitor', 'phone', 'printer', 'camera', 'wifi',
  'home', 'factory', 'warehouse', 'office', 'hospital', 'school',
];

const COLOR_PRESETS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
  '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#64748b',
];

function BranchModal({ open, onClose, branch, onSave }) {
  const isEdit = !!branch?.id;
  const [form, setForm] = useState({ name: '', icon: 'building', color: '#3b82f6' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branch) {
      setForm({
        name: branch.name || '',
        icon: branch.icon || 'building',
        color: branch.color || '#3b82f6',
      });
    } else {
      setForm({ name: '', icon: 'building', color: '#3b82f6' });
    }
  }, [branch, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await branchesApi.update(branch.id, form);
        toast.success('Branch updated');
      } else {
        await branchesApi.create(form);
        toast.success('Branch created');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-vault-card border border-vault-border rounded-2xl p-6 animate-scale-in">
          <Dialog.Title className="text-lg font-semibold text-vault-text">
            {isEdit ? 'Edit Branch' : 'New Branch'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Name *</label>
              <input
                className="w-full px-3 py-2.5 rounded-xl bg-vault-input border border-vault-border text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent/50 focus:border-vault-accent transition-all"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Branch name"
                required
              />
            </div>

            {/* Icon */}
            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">
                <Hash className="w-3 h-3 inline mr-1" /> Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setForm({ ...form, icon })}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs border transition-all',
                      form.icon === icon
                        ? 'border-vault-accent bg-vault-accent/10 text-vault-accent'
                        : 'border-vault-border text-vault-text-secondary hover:border-vault-accent/50'
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">
                <Palette className="w-3 h-3 inline mr-1" /> Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className={cn(
                      'w-8 h-8 rounded-lg border-2 transition-all',
                      form.color === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-8 h-8 rounded-lg border border-vault-border cursor-pointer"
                />
                <span className="text-xs font-mono text-vault-text-secondary">{form.color}</span>
              </div>
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

export default function Branches() {
  const [branchList, setBranchList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBranch, setEditBranch] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const isManager = useAuthStore((s) => s.isManager);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const data = await branchesApi.list();
      setBranchList(data);
    } catch {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleDelete = async (branch) => {
    if (!confirm(`Delete branch "${branch.name}"? Credentials in this branch will not be deleted.`)) return;
    setDeletingId(branch.id);
    try {
      await branchesApi.delete(branch.id);
      toast.success('Branch deleted');
      fetchBranches();
    } catch (error) {
      toast.error(error.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-vault-text">Subeler (Branches)</h1>
          <p className="text-vault-text-secondary mt-1">Manage credential branches</p>
        </div>
        {isManager() && (
          <button
            onClick={() => {
              setEditBranch(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-vault-accent hover:bg-vault-accent-hover transition-all"
          >
            <Plus className="w-4 h-4" /> New Branch
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-vault-accent" />
        </div>
      ) : branchList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-vault-text-secondary">
          <GitBranch className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No branches yet</p>
          <p className="text-sm mt-1">Create your first branch to organize credentials</p>
        </div>
      ) : (
        <div className="bg-vault-card border border-vault-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-vault-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">Branch</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider hidden sm:table-cell">Icon</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider hidden sm:table-cell">Color</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">Credentials</th>
                {isManager() && (
                  <th className="text-right px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {branchList.map((branch) => (
                <tr
                  key={branch.id}
                  className="border-b border-vault-border last:border-0 hover:bg-vault-hover/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: branch.color || '#6b7280' }}
                      />
                      <span className="text-sm font-medium text-vault-text">{branch.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="text-xs text-vault-text-secondary bg-vault-bg px-2 py-1 rounded-lg">
                      {branch.icon || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded border border-vault-border"
                        style={{ backgroundColor: branch.color || '#6b7280' }}
                      />
                      <span className="text-xs font-mono text-vault-text-secondary">{branch.color}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-vault-text">{branch.credential_count ?? 0}</span>
                  </td>
                  {isManager() && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditBranch(branch);
                            setModalOpen(true);
                          }}
                          className="p-2 rounded-lg text-vault-text-secondary hover:text-vault-accent hover:bg-vault-accent/10 transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(branch)}
                          disabled={deletingId === branch.id}
                          className="p-2 rounded-lg text-vault-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        >
                          {deletingId === branch.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BranchModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditBranch(null);
        }}
        branch={editBranch}
        onSave={fetchBranches}
      />
    </div>
  );
}
