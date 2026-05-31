import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Layout from '../../components/layout/Layout.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import api from '../../api/axios.js';
import { toast } from 'react-hot-toast';

export default function TaskForm() {
  const { id }     = useParams();
  const isEdit     = !!id;
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.documentElement.classList.contains('dark')
  );
  const [form, setForm] = useState({
    title: '', description: '', priority: 'Medium', status: 'To Do', dueDate: ''
  });

  // selectedIds tracks the CURRENT saved assignees (for edit) or chosen ones (for create)
  const [selectedIds,   setSelectedIds]   = useState([]);   // Number[]
  // pendingAdd / pendingRemove track unsaved changes in edit mode
  const [pendingAdd,    setPendingAdd]    = useState([]);   // Number[] — to POST /members
  const [pendingRemove, setPendingRemove] = useState([]);   // Number[] — to DELETE /members/:id

  const [allUsers,       setAllUsers]       = useState([]);
  const [userSearch,     setUserSearch]     = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [fetchingTask,   setFetchingTask]   = useState(isEdit);
  const [submitting,     setSubmitting]     = useState(false);
  const [errors,         setErrors]         = useState({});

  // Keep a ref to original assignee IDs so we can diff on submit
  const originalIdsRef = useRef([]);

  useEffect(() => {
    fetchUsers();
    if (isEdit) fetchTask();

    // Watch <html> for theme changes (data-theme attr or class toggle)
    const observer = new MutationObserver(() => {
      setIsDark(
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.documentElement.classList.contains('dark')
      );
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => observer.disconnect();
  }, []);

  // ── fetch only ACTIVE users (backend rejects inactive on assign) ──────────
  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      const active = (res.data.users || []).filter(
        u => u.isActive && (u.role === 'ProjectManager' || u.role === 'Collaborator')
      );
      setAllUsers(active);
    } catch (e) {
      console.error('Fetch users error:', e);
    }
  };

  // ── fetch task and seed selected IDs ─────────────────────────────────────
  const fetchTask = async () => {
    try {
      const res   = await api.get(`/tasks/${id}`);
      const t     = res.data.task;
      setForm({
        title:       t.title       || '',
        description: t.description || '',
        priority:    t.priority    || 'Medium',
        status:      t.status      || 'To Do',
        dueDate:     t.dueDate     ? t.dueDate.split('T')[0] : ''
      });
      const ids = (t.assignees || []).map(a => Number(a.id));
      setSelectedIds(ids);
      originalIdsRef.current = ids;
    } catch (e) {
      toast.error('Failed to load task');
    } finally {
      setFetchingTask(false);
    }
  };

  // ── toggle a user's selection ─────────────────────────────────────────────
  // In CREATE mode: just track selectedIds
  // In EDIT mode:   compute pendingAdd / pendingRemove relative to saved state
  const toggleUser = (rawId) => {
    const uid = Number(rawId);

    if (!isEdit) {
      setSelectedIds(prev =>
        prev.includes(uid) ? prev.filter(i => i !== uid) : [...prev, uid]
      );
      return;
    }

    // Edit mode — compute adds / removes live
    setSelectedIds(prev => {
      const next = prev.includes(uid)
        ? prev.filter(i => i !== uid)
        : [...prev, uid];

      // pendingAdd  = newly selected that weren't in original
      setPendingAdd(next.filter(i => !originalIdsRef.current.includes(i)));
      // pendingRemove = originally selected that are no longer selected
      setPendingRemove(originalIdsRef.current.filter(i => !next.includes(i)));

      return next;
    });
  };

  // ── validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.title.trim())                   e.title = 'Title is required';
    else if (form.title.trim().length < 3)    e.title = 'Title must be at least 3 characters';
    else if (form.title.trim().length > 200)  e.title = 'Title cannot exceed 200 characters';
    if (form.dueDate && form.dueDate.trim() !== '') {
      const parsed = new Date(form.dueDate);
      if (!isNaN(parsed.getTime())) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (parsed < today) e.dueDate = 'Due date cannot be in the past';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      if (!isEdit) {
        // ── CREATE: send assigneeIds in one shot ──────────────────────────
        await api.post('/tasks', {
          title:       form.title.trim(),
          description: form.description.trim() || null,
          priority:    form.priority,
          status:      form.status,
          // Only include dueDate if user set one — backend treats null as Jan 1 1970
          ...(form.dueDate && form.dueDate.trim() !== '' ? { dueDate: form.dueDate } : {}),
          assigneeIds: selectedIds
        });
        toast.success('Task created successfully');

      } else {
        // ── EDIT: three separate steps ────────────────────────────────────

        // 1. Update task fields (backend PUT does NOT handle assigneeIds)
        await api.put(`/tasks/${id}`, {
          title:       form.title.trim(),
          description: form.description.trim() || null,
          priority:    form.priority,
          status:      form.status,
          // Only include dueDate if user set one — sending null causes backend to
          // evaluate new Date(null) = Jan 1 1970 which always fails past-date check
          ...(form.dueDate && form.dueDate.trim() !== '' ? { dueDate: form.dueDate } : {}),
        });

        // 2. Add new members  →  POST /tasks/:id/members  { userIds: [...] }
        if (pendingAdd.length > 0) {
          await api.post(`/tasks/${id}/members`, { userIds: pendingAdd });
        }

        // 3. Remove members   →  DELETE /tasks/:id/members/:userId  (one by one)
        for (const uid of pendingRemove) {
          await api.delete(`/tasks/${id}/members/${uid}`);
        }

        toast.success('Task updated successfully');
      }

      navigate('/tasks');
    } catch (err) {
      toast.error(err.response?.data?.description || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  // ── derived UI data ───────────────────────────────────────────────────────
  const filteredUsers = allUsers.filter(u => {
    const matchSearch = !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = !userRoleFilter || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  const selectedUsers = allUsers.filter(u => selectedIds.includes(Number(u.id)));

  // ── styles ────────────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '10px',
    border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s'
  };
  const labelStyle = {
    fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)',
    display: 'block', marginBottom: '6px'
  };

  if (fetchingTask) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => navigate('/tasks')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: '6px 10px', borderRadius: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            {isEdit ? 'Edit Task' : 'Create New Task'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Main form card ── */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Title */}
            <div>
              <label style={labelStyle}>Task Title <span style={{ color: '#ef4444' }}>*</span></label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Enter a clear, descriptive title..."
                style={{ ...inputStyle, borderColor: errors.title ? '#ef4444' : 'var(--border)' }} />
              {errors.title && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0' }}>{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Provide details about what needs to be done..."
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '100px', lineHeight: '1.5' }} />
            </div>

            {/* Priority + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
                  <option value="Low">🟢 Low</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="High">🔴 High</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label style={labelStyle}>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                style={{ ...inputStyle, borderColor: errors.dueDate ? '#ef4444' : 'var(--border)', colorScheme: isDark ? 'dark' : 'light' }} />
              {errors.dueDate && <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0' }}>{errors.dueDate}</p>}
            </div>
          </div>

          {/* ── Assign members card ── */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>
                  Assign Team Members
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  {selectedIds.length} member{selectedIds.length !== 1 ? 's' : ''} selected
                  {isEdit && pendingAdd.length > 0 && (
                    <span style={{ color: '#10b981', marginLeft: '6px' }}>+{pendingAdd.length} to add</span>
                  )}
                  {isEdit && pendingRemove.length > 0 && (
                    <span style={{ color: '#ef4444', marginLeft: '6px' }}>−{pendingRemove.length} to remove</span>
                  )}
                </p>
              </div>
              {selectedIds.length > 0 && (
                <button type="button" onClick={() => {
                  setSelectedIds([]);
                  if (isEdit) {
                    setPendingAdd([]);
                    setPendingRemove([...originalIdsRef.current]);
                  }
                }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger, #ef4444)', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                  Clear all
                </button>
              )}
            </div>

            {/* Selected user chips */}
            {selectedUsers.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {selectedUsers.map(u => {
                  const isNew     = isEdit && pendingAdd.includes(Number(u.id));
                  const isRemoved = isEdit && pendingRemove.includes(Number(u.id)); // won't show (removed = deselected)
                  return (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      backgroundColor: isNew ? '#10b98118' : 'var(--accent-light)',
                      border: `1px solid ${isNew ? '#10b981' : 'var(--accent)'}`,
                      borderRadius: '20px', padding: '4px 10px 4px 4px'
                    }}>
                      <Avatar name={u.name} size={20} />
                      <span style={{ fontSize: '12px', fontWeight: '500', color: isNew ? '#10b981' : 'var(--accent)' }}>
                        {u.name}
                        {isNew && <span style={{ fontSize: '10px', marginLeft: '3px' }}>●</span>}
                      </span>
                      <button type="button" onClick={() => toggleUser(u.id)}
                        style={{ background: 'none', border: 'none', color: isNew ? '#10b981' : 'var(--accent)', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search + role filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  style={{ ...inputStyle, paddingLeft: '30px', padding: '8px 12px 8px 30px', fontSize: '13px' }} />
              </div>
              <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}
                style={{ ...inputStyle, width: 'auto', minWidth: '140px', padding: '8px 12px', fontSize: '13px' }}>
                <option value="">All Roles</option>
                <option value="ProjectManager">Project Manager</option>
                <option value="Collaborator">Collaborator</option>
              </select>
            </div>

            {/* Scrollable user list */}
            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
              {filteredUsers.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No active users found matching your search
                </div>
              ) : (
                filteredUsers.map((u, i) => {
                  const isSelected = selectedIds.includes(Number(u.id));
                  const isNew      = isEdit && pendingAdd.includes(Number(u.id));
                  return (
                    <div key={u.id} onClick={() => toggleUser(u.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', cursor: 'pointer',
                        backgroundColor: isSelected ? (isNew ? '#10b98110' : 'var(--accent-light)') : 'transparent',
                        borderBottom: i < filteredUsers.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-primary)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Avatar name={u.name} size={32} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>{u.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.email} · {u.role}
                        </p>
                      </div>

                      {/* Checkbox */}
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                        border: `2px solid ${isSelected ? (isNew ? '#10b981' : 'var(--accent)') : 'var(--border)'}`,
                        backgroundColor: isSelected ? (isNew ? '#10b981' : 'var(--accent)') : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s'
                      }}>
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Submit buttons ── */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => navigate('/tasks')}
              style={{ padding: '11px 20px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              style={{ padding: '11px 24px', borderRadius: '10px', border: 'none', backgroundColor: submitting ? '#6ea8da' : 'var(--accent)', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {submitting ? <LoadingSpinner size={18} /> : (isEdit ? 'Save Changes' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}