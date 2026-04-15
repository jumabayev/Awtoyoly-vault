import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Users as UsersIcon,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import toast from 'react-hot-toast';
import { users as usersApi } from '../lib/api';
import { cn, formatDate } from '../lib/utils';

// ---- User Form Modal ----
function UserModal({ open, onClose, user, onSave }) {
  const isEdit = !!user?.id;
  const [form, setForm] = useState({
    username: '',
    password: '',
    display_name: '',
    role: 'viewer',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        password: '',
        display_name: user.display_name || '',
        role: user.role || 'viewer',
      });
    } else {
      setForm({ username: '', password: '', display_name: '', role: 'viewer' });
    }
  }, [user, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      if (isEdit) {
        await usersApi.update(user.id, payload);
        toast.success('User updated');
      } else {
        await usersApi.create(payload);
        toast.success('User created');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = cn(
    'w-full px-3 py-2.5 rounded-xl bg-vault-input border border-vault-border',
    'text-sm text-vault-text focus:outline-none focus:ring-2 focus:ring-vault-accent/50 focus:border-vault-accent transition-all'
  );

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-vault-card border border-vault-border rounded-2xl p-6 animate-scale-in">
          <Dialog.Title className="text-lg font-semibold text-vault-text">
            {isEdit ? 'Edit User' : 'New User'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Username *</label>
              <input
                className={inputClass}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username"
                required
                disabled={isEdit}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">
                {isEdit ? 'Password (leave blank to keep)' : 'Password *'}
              </label>
              <input
                className={inputClass}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Enter password'}
                required={!isEdit}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Display Name</label>
              <input
                className={inputClass}
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-vault-text-secondary mb-1.5">Role</label>
              <select
                className={inputClass}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

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

// ---- Access Management Modal ----
function AccessModal({ open, onClose, user }) {
  const [accessData, setAccessData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedBranch, setExpandedBranch] = useState(null);
  const [changes, setChanges] = useState([]);

  useEffect(() => {
    if (open && user) {
      setLoading(true);
      setChanges([]);
      usersApi
        .getCredentialAccess(user.id)
        .then((data) => {
          setAccessData(data);
        })
        .catch(() => toast.error('Failed to load access'))
        .finally(() => setLoading(false));
    }
  }, [open, user]);

  const toggleCredentialAccess = (credId, currentPermission) => {
    const newPermission = currentPermission === 'read' ? 'none' : 'read';
    setChanges((prev) => {
      const existing = prev.findIndex((c) => c.id === credId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { id: credId, permission: newPermission };
        return updated;
      }
      return [...prev, { id: credId, permission: newPermission }];
    });
    // Update local state for UI
    setAccessData((prev) =>
      prev.map((branch) => ({
        ...branch,
        credentials: branch.credentials?.map((cred) =>
          cred.id === credId ? { ...cred, permission: newPermission } : cred
        ),
      }))
    );
  };

  const handleSave = async () => {
    if (changes.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await usersApi.updateCredentialAccessBulk(user.id, { credentials: changes });
      toast.success('Access updated');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to update access');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-vault-card border border-vault-border rounded-2xl p-6 animate-scale-in">
          <Dialog.Title className="text-lg font-semibold text-vault-text">
            Access Management - {user?.display_name || user?.username}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-vault-text-secondary mt-1">
            Manage which credentials this user can access.
          </Dialog.Description>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-vault-accent" />
            </div>
          ) : accessData.length === 0 ? (
            <p className="text-sm text-vault-text-secondary py-8 text-center">No branches or credentials found.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {accessData.map((branch) => (
                <div key={branch.id} className="border border-vault-border rounded-xl overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedBranch(expandedBranch === branch.id ? null : branch.id)
                    }
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-vault-hover/50 transition-colors"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: branch.color || '#6b7280' }}
                    />
                    <span className="text-sm font-medium text-vault-text flex-1 text-left">
                      {branch.name}
                    </span>
                    <span className="text-xs text-vault-text-secondary">
                      {branch.credentials?.length || 0} credentials
                    </span>
                    {expandedBranch === branch.id ? (
                      <ChevronDown className="w-4 h-4 text-vault-text-secondary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-vault-text-secondary" />
                    )}
                  </button>

                  {expandedBranch === branch.id && branch.credentials && (
                    <div className="border-t border-vault-border px-4 py-2 space-y-1 bg-vault-bg/50">
                      {branch.credentials.map((cred) => (
                        <label
                          key={cred.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-vault-hover/50 cursor-pointer transition-colors"
                        >
                          <Checkbox.Root
                            checked={cred.permission === 'read'}
                            onCheckedChange={() => toggleCredentialAccess(cred.id, cred.permission)}
                            className={cn(
                              'w-5 h-5 rounded border-2 transition-all flex items-center justify-center',
                              cred.permission === 'read'
                                ? 'bg-vault-accent border-vault-accent'
                                : 'border-vault-border'
                            )}
                          >
                            <Checkbox.Indicator>
                              <Check className="w-3 h-3 text-white" />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          <span className="text-sm text-vault-text">{cred.name}</span>
                          {cred.ip_address && (
                            <span className="text-xs text-vault-text-secondary font-mono">{cred.ip_address}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-vault-border">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-vault-text-secondary hover:text-vault-text hover:bg-vault-hover transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-vault-accent hover:bg-vault-accent-hover transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes {changes.length > 0 && `(${changes.length})`}
            </button>
          </div>

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

// ---- Role badge ----
function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-red-500/10 text-red-400 border-red-500/20',
    manager: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    viewer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize',
        styles[role] || styles.viewer
      )}
    >
      {role}
    </span>
  );
}

// ---- Main Page ----
export default function Users() {
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [accessUser, setAccessUser] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.list();
      setUserList(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (user) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    setDeletingId(user.id);
    try {
      await usersApi.delete(user.id);
      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-vault-text">Users</h1>
          <p className="text-vault-text-secondary mt-1">Manage user accounts and access</p>
        </div>
        <button
          onClick={() => {
            setEditUser(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-vault-accent hover:bg-vault-accent-hover transition-all"
        >
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-vault-accent" />
        </div>
      ) : userList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-vault-text-secondary">
          <UsersIcon className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No users found</p>
        </div>
      ) : (
        <div className="bg-vault-card border border-vault-border rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-vault-border">
                <th className="text-left px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">Role</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">2FA</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">Last Login</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-vault-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-vault-border last:border-0 hover:bg-vault-hover/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-vault-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-vault-accent">
                          {(u.display_name || u.username)?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-vault-text">{u.display_name || u.username}</p>
                        <p className="text-xs text-vault-text-secondary">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    {u.totp_enabled ? (
                      <ShieldCheck className="w-5 h-5 text-green-400 mx-auto" />
                    ) : (
                      <ShieldOff className="w-5 h-5 text-vault-text-secondary/40 mx-auto" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        u.active !== false
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      )}
                    >
                      {u.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-vault-text-secondary">
                      {u.last_login ? formatDate(u.last_login) : 'Never'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setAccessUser(u)}
                        className="p-2 rounded-lg text-vault-text-secondary hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                        title="Manage access"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditUser(u);
                          setModalOpen(true);
                        }}
                        className="p-2 rounded-lg text-vault-text-secondary hover:text-vault-accent hover:bg-vault-accent/10 transition-all"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={deletingId === u.id}
                        className="p-2 rounded-lg text-vault-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditUser(null);
        }}
        user={editUser}
        onSave={fetchUsers}
      />

      <AccessModal
        open={!!accessUser}
        onClose={() => setAccessUser(null)}
        user={accessUser}
      />
    </div>
  );
}
