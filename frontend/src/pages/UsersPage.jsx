import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../components/layout/Layout.jsx';
import Avatar from '../components/common/Avatar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import api from '../api/axios.js';
import { toast } from 'react-hot-toast';

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', email: '', role: 'Collaborator' });

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
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
    } catch (e) {
      toast.error('Failed to delete user');
    }
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', regForm);
      toast.success('User registered successfully');
      setShowRegisterForm(false);
      setRegForm({ name: '', email: '', role: 'Collaborator' });
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to register user');
    }
  };

  const filteredUsers = users.filter(u =>
    (u.name.toLowerCase().includes(filters.search.toLowerCase()) ||
    u.email.toLowerCase().includes(filters.search.toLowerCase()))
  );

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Users Management</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              placeholder="Search users..."
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', width: '200px' }}
            />
            <select
              value={filters.role}
              onChange={e => setFilters({...filters, role: e.target.value})}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            >
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="ProjectManager">Project Manager</option>
              <option value="Collaborator">Collaborator</option>
            </select>
            <select
              value={filters.status}
              onChange={e => setFilters({...filters, status: e.target.value})}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={() => { setShowRegisterForm(true); setEditingUser(null); }}
              style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              + Register User
            </button>
          </div>
        </div>

        {editingUser && (
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Edit User: {editingUser.name}</h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
            </div>
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Name</label>
                <input
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email</label>
                <input
                  value={editForm.email}
                  onChange={e => setEditForm({...editForm, email: e.target.value})}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Role</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm({...editForm, role: e.target.value})}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="Admin">Admin</option>
                  <option value="ProjectManager">ProjectManager</option>
                  <option value="Collaborator">Collaborator</option>
                </select>
              </div>
              <button type="submit" style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
                Save Changes
              </button>
            </form>
          </div>
        )}

        {showRegisterForm && (
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Register New User</h3>
              <button onClick={() => setShowRegisterForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
            </div>
            <form onSubmit={handleRegisterUser} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Name</label>
                <input
                  required
                  value={regForm.name}
                  onChange={e => setRegForm({...regForm, name: e.target.value})}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email</label>
                <input
                  required
                  type="email"
                  value={regForm.email}
                  onChange={e => setRegForm({...regForm, email: e.target.value})}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Role</label>
                <select
                  value={regForm.role}
                  onChange={e => setRegForm({...regForm, role: e.target.value})}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="Admin">Admin</option>
                  <option value="ProjectManager">ProjectManager</option>
                  <option value="Collaborator">Collaborator</option>
                </select>
              </div>
              <button type="submit" style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
                Register User
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><LoadingSpinner /></div>
        ) : (
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            {users.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}>👥</p>
                <p style={{ fontSize: '14px' }}>No users found.</p>
              </div>
            ) : (
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
                  {filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar name={u.name} size={28} />
                          <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleEditClick(u)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Edit</button>
                          <button onClick={() => toggleUserStatus(u)} style={{ background: 'none', border: 'none', color: u.isActive ? 'var(--danger)' : 'var(--accent)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => deleteUser(u.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
