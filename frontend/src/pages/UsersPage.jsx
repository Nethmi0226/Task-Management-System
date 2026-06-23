import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../components/layout/Layout.jsx';
import Avatar from '../components/common/Avatar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import api from '../api/axios.js';
import { toast } from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES              = ['Admin', 'ProjectManager', 'Collaborator'];
const EMPTY_FILTERS      = { search: '', role: '', status: '' };
const EMPTY_REG_FORM     = { name: '', email: '', role: 'Collaborator' };

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputBase = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
};

const fieldInput = {
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
};

const ghostBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '600',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageHeader({ filters, onFilterChange, onRegisterClick }) {
  const set = (key) => (e) => onFilterChange({ ...filters, [key]: e.target.value });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Users Management</h1>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="Search users..."
          value={filters.search}
          onChange={set('search')}
          style={{ ...inputBase, width: '200px' }}
        />
        <select value={filters.role} onChange={set('role')} style={inputBase}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r === 'ProjectManager' ? 'Project Manager' : r}</option>)}
        </select>
        <select value={filters.status} onChange={set('status')} style={inputBase}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={onRegisterClick}
          style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
        >
          + Register User
        </button>
      </div>
    </div>
  );
}

function InlineFormPanel({ title, onClose, onSubmit, children }) {
  return (
    <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ ...ghostBtn, color: 'var(--text-muted)' }}>Cancel</button>
      </div>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {children}
      </form>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}

function RoleSelect({ value, onChange }) {
  return (
    <select value={value} onChange={onChange} style={fieldInput}>
      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
    </select>
  );
}

function EditUserPanel({ user: editingUser, form, onFormChange, onSubmit, onClose }) {
  const set = (key) => (e) => onFormChange({ ...form, [key]: e.target.value });

  return (
    <InlineFormPanel title={`Edit User: ${editingUser.name}`} onClose={onClose} onSubmit={onSubmit}>
      <FormField label="Name">
        <input value={form.name}  onChange={set('name')}  style={fieldInput} />
      </FormField>
      <FormField label="Email">
        <input value={form.email} onChange={set('email')} style={fieldInput} />
      </FormField>
      <FormField label="Role">
        <RoleSelect value={form.role} onChange={set('role')} />
      </FormField>
      <button type="submit" style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
        Save Changes
      </button>
    </InlineFormPanel>
  );
}

function RegisterUserPanel({ form, onFormChange, onSubmit, onClose }) {
  const set = (key) => (e) => onFormChange({ ...form, [key]: e.target.value });

  return (
    <InlineFormPanel title="Register New User" onClose={onClose} onSubmit={onSubmit}>
      <FormField label="Name">
        <input required value={form.name}  onChange={set('name')}  style={fieldInput} />
      </FormField>
      <FormField label="Email">
        <input required type="email" value={form.email} onChange={set('email')} style={fieldInput} />
      </FormField>
      <FormField label="Role">
        <RoleSelect value={form.role} onChange={set('role')} />
      </FormField>
      <button type="submit" style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
        Register User
      </button>
    </InlineFormPanel>
  );
}

function UserRoleBadge({ role }) {
  return (
    <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
      {role}
    </span>
  );
}

function UserTableRow({ u, onEdit, onToggleStatus, onDelete }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s' }}>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Avatar name={u.name} size={28} />
          <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{u.name}</span>
        </div>
      </td>
      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.email}</td>
      <td style={{ padding: '12px 16px' }}>
        <UserRoleBadge role={u.role} />
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={() => onEdit(u)}           style={{ ...ghostBtn, color: 'var(--accent)' }}>Edit</button>
          <button onClick={() => onToggleStatus(u)}   style={{ ...ghostBtn, color: u.isActive ? 'var(--danger)' : 'var(--accent)' }}>
            {u.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={() => onDelete(u.id)}      style={{ ...ghostBtn, color: 'var(--danger)' }}>Delete</button>
        </div>
      </td>
    </tr>
  );
}

function UsersTable({ users, onEdit, onToggleStatus, onDelete }) {
  if (users.length === 0) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p style={{ fontSize: '32px', marginBottom: '12px' }}>👥</p>
        <p style={{ fontSize: '14px' }}>No users found.</p>
      </div>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
      <thead style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
        <tr>
          <th style={{ padding: '12px 16px', fontWeight: '600' }}>User</th>
          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Email</th>
          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Role</th>
          <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map(u => (
          <UserTableRow
            key={u.id}
            u={u}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
          />
        ))}
      </tbody>
    </table>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user }          = useAuth();
  const [users,           setUsers]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [filters,         setFilters]         = useState(EMPTY_FILTERS);
  const [editingUser,     setEditingUser]     = useState(null);
  const [editForm,        setEditForm]        = useState({ name: '', email: '', role: '' });
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regForm,         setRegForm]         = useState(EMPTY_REG_FORM);

  useEffect(() => { fetchUsers(); }, [filters]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.role)   params.append('role',   filters.role);
      if (filters.status) params.append('status', filters.status);
      const res = await api.get(`/users?${params.toString()}`);
      setUsers(res.data.users || res.data || []);
    } catch (e) {
      console.error('Fetch users error:', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, role: u.role });
    setShowRegisterForm(false);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/users/${editingUser.id}`, editForm);
      toast.success('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update user');
    }
  };

  const toggleUserStatus = async (u) => {
    try {
      await api.patch(`/users/${u.id}/${u.isActive ? 'deactivate' : 'activate'}`);
      toast.success(`User ${u.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.description || 'Failed to update status');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', regForm);
      toast.success('User registered successfully');
      setShowRegisterForm(false);
      setRegForm(EMPTY_REG_FORM);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to register user');
    }
  };

  const openRegisterForm = () => {
    setShowRegisterForm(true);
    setEditingUser(null);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(filters.search.toLowerCase()) ||
    u.email.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <PageHeader
          filters={filters}
          onFilterChange={setFilters}
          onRegisterClick={openRegisterForm}
        />

        {editingUser && (
          <EditUserPanel
            user={editingUser}
            form={editForm}
            onFormChange={setEditForm}
            onSubmit={handleUpdateUser}
            onClose={() => setEditingUser(null)}
          />
        )}

        {showRegisterForm && (
          <RegisterUserPanel
            form={regForm}
            onFormChange={setRegForm}
            onSubmit={handleRegisterUser}
            onClose={() => setShowRegisterForm(false)}
          />
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <UsersTable
              users={filteredUsers}
              onEdit={handleEditClick}
              onToggleStatus={toggleUserStatus}
              onDelete={deleteUser}
            />
          </div>
        )}

      </div>
    </Layout>
  );
}
