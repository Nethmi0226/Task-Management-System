import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import api from '../../api/axios.js';
import { toast } from 'react-hot-toast';

/* ----------------------------------------------------------------------- */
/*  Shared style tokens                                                     */
/* ----------------------------------------------------------------------- */

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  fontSize: '13px',
  fontWeight: '500',
  color: 'var(--text-primary)',
  display: 'block',
  marginBottom: '6px',
};

const ERROR_COLOR = '#ef4444';
const NEW_MEMBER_COLOR = '#10b981';

const DEFAULT_FORM = { title: '', description: '', priority: 'Medium', status: 'To Do', dueDate: '' };

/* ----------------------------------------------------------------------- */
/*  Theme observer hook                                                     */
/* ----------------------------------------------------------------------- */

function readIsDarkFromDocument() {
  return (
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.documentElement.classList.contains('dark')
  );
}

function useDocumentDarkMode() {
  const [isDark, setIsDark] = useState(readIsDarkFromDocument);

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(readIsDarkFromDocument()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

/* ----------------------------------------------------------------------- */
/*  Validation                                                              */
/* ----------------------------------------------------------------------- */

function validateTaskForm(form) {
  const errors = {};

  if (!form.title.trim()) {
    errors.title = 'Title is required';
  } else if (form.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  } else if (form.title.trim().length > 200) {
    errors.title = 'Title cannot exceed 200 characters';
  }

  if (form.dueDate && form.dueDate.trim() !== '') {
    const parsed = new Date(form.dueDate);
    if (!isNaN(parsed.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsed < today) errors.dueDate = 'Due date cannot be in the past';
    }
  }

  return errors;
}

/* ----------------------------------------------------------------------- */
/*  Task <-> form mapping                                                   */
/* ----------------------------------------------------------------------- */

function taskToFormValues(task) {
  return {
    title: task.title || '',
    description: task.description || '',
    priority: task.priority || 'Medium',
    status: task.status || 'To Do',
    dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
  };
}

function buildTaskPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    priority: form.priority,
    status: form.status,
    // Only include dueDate if user set one — sending null causes backend to
    // evaluate new Date(null) = Jan 1 1970 which always fails past-date check
    ...(form.dueDate && form.dueDate.trim() !== '' ? { dueDate: form.dueDate } : {}),
  };
}

/* ----------------------------------------------------------------------- */
/*  Active-user roster hook                                                 */
/* ----------------------------------------------------------------------- */

const ASSIGNABLE_ROLES = new Set(['Admin', 'ProjectManager', 'Collaborator']);

function useActiveUsers() {
  const [allUsers, setAllUsers] = useState([]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      const active = (res.data.users || []).filter((u) => u.isActive && ASSIGNABLE_ROLES.has(u.role));
      setAllUsers(active);
    } catch (e) {
      console.error('Fetch users error:', e);
    }
  };

  return { allUsers, fetchUsers };
}

/* ----------------------------------------------------------------------- */
/*  Assignee selection / diffing hook                                       */
/* ----------------------------------------------------------------------- */

function useAssigneeSelection(isEdit) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [pendingAdd, setPendingAdd] = useState([]);
  const [pendingRemove, setPendingRemove] = useState([]);
  const originalIdsRef = useRef([]);

  const seedFromTask = (assignees) => {
    const ids = (assignees || []).map((a) => Number(a.id));
    setSelectedIds(ids);
    originalIdsRef.current = ids;
  };

  const toggle = (rawId) => {
    const uid = Number(rawId);

    if (!isEdit) {
      setSelectedIds((prev) => (prev.includes(uid) ? prev.filter((i) => i !== uid) : [...prev, uid]));
      return;
    }

    setSelectedIds((prev) => {
      const next = prev.includes(uid) ? prev.filter((i) => i !== uid) : [...prev, uid];
      setPendingAdd(next.filter((i) => !originalIdsRef.current.includes(i)));
      setPendingRemove(originalIdsRef.current.filter((i) => !next.includes(i)));
      return next;
    });
  };

  const clearAll = () => {
    setSelectedIds([]);
    if (isEdit) {
      setPendingAdd([]);
      setPendingRemove([...originalIdsRef.current]);
    }
  };

  return { selectedIds, pendingAdd, pendingRemove, seedFromTask, toggle, clearAll };
}

/* ----------------------------------------------------------------------- */
/*  Icons                                                                   */
/* ----------------------------------------------------------------------- */

const BackArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);

const SearchIcon = () => (
  <svg
    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const RemoveChipIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* ----------------------------------------------------------------------- */
/*  Field subcomponents                                                     */
/* ----------------------------------------------------------------------- */

function FieldError({ message }) {
  if (!message) return null;
  return <p style={{ fontSize: '11px', color: ERROR_COLOR, margin: '4px 0 0' }}>{message}</p>;
}

function TitleField({ value, error, onChange }) {
  return (
    <div>
      <label style={labelStyle}>
        Task Title <span style={{ color: ERROR_COLOR }}>*</span>
      </label>
      <input
        value={value}
        onChange={onChange}
        placeholder="Enter a clear, descriptive title..."
        style={{ ...inputStyle, borderColor: error ? ERROR_COLOR : 'var(--border)' }}
      />
      <FieldError message={error} />
    </div>
  );
}

function DescriptionField({ value, onChange }) {
  return (
    <div>
      <label style={labelStyle}>Description</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder="Provide details about what needs to be done..."
        rows={4}
        style={{ ...inputStyle, resize: 'vertical', minHeight: '100px', lineHeight: '1.5' }}
      />
    </div>
  );
}

function PriorityStatusFields({ priority, status, onPriorityChange, onStatusChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div>
        <label style={labelStyle}>Priority</label>
        <select value={priority} onChange={onPriorityChange} style={inputStyle}>
          <option value="Low">🟢 Low</option>
          <option value="Medium">🟡 Medium</option>
          <option value="High">🔴 High</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Status</label>
        <select value={status} onChange={onStatusChange} style={inputStyle}>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
    </div>
  );
}

function DueDateField({ value, error, isDark, onChange }) {
  return (
    <div>
      <label style={labelStyle}>Due Date</label>
      <input
        type="date"
        value={value}
        onChange={onChange}
        style={{ ...inputStyle, borderColor: error ? ERROR_COLOR : 'var(--border)', colorScheme: isDark ? 'dark' : 'light' }}
      />
      <FieldError message={error} />
    </div>
  );
}

function TaskDetailsCard({ form, errors, isDark, onFieldChange }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      <TitleField value={form.title} error={errors.title} onChange={(e) => onFieldChange('title', e.target.value)} />
      <DescriptionField value={form.description} onChange={(e) => onFieldChange('description', e.target.value)} />
      <PriorityStatusFields
        priority={form.priority}
        status={form.status}
        onPriorityChange={(e) => onFieldChange('priority', e.target.value)}
        onStatusChange={(e) => onFieldChange('status', e.target.value)}
      />
      <DueDateField value={form.dueDate} error={errors.dueDate} isDark={isDark} onChange={(e) => onFieldChange('dueDate', e.target.value)} />
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/*  Assignment section subcomponents                                        */
/* ----------------------------------------------------------------------- */

function AssignmentSummary({ isEdit, selectedCount, pendingAddCount, pendingRemoveCount, onClearAll, showClearAll }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>
          Assign Team Members
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          {selectedCount} member{selectedCount !== 1 ? 's' : ''} selected
          {isEdit && pendingAddCount > 0 && (
            <span style={{ color: NEW_MEMBER_COLOR, marginLeft: '6px' }}>+{pendingAddCount} to add</span>
          )}
          {isEdit && pendingRemoveCount > 0 && (
            <span style={{ color: ERROR_COLOR, marginLeft: '6px' }}>−{pendingRemoveCount} to remove</span>
          )}
        </p>
      </div>
      {showClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          style={{ background: 'none', border: 'none', color: 'var(--danger, #ef4444)', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}
        >
          Clear all
        </button>
      )}
    </div>
  );
}

function SelectedMemberChip({ user, isNew, onRemove }) {
  const color = isNew ? NEW_MEMBER_COLOR : 'var(--accent)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: isNew ? '#10b98118' : 'var(--accent-light)',
        border: `1px solid ${color}`,
        borderRadius: '20px',
        padding: '4px 10px 4px 4px',
      }}
    >
      <Avatar name={user.name} size={20} />
      <span style={{ fontSize: '12px', fontWeight: '500', color }}>
        {user.name}
        {isNew && <span style={{ fontSize: '10px', marginLeft: '3px' }}>●</span>}
      </span>
      <button
        type="button"
        onClick={() => onRemove(user.id)}
        style={{ background: 'none', border: 'none', color, cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center' }}
      >
        <RemoveChipIcon />
      </button>
    </div>
  );
}

function SelectedMemberChips({ selectedUsers, pendingAdd, isEdit, onRemove }) {
  if (selectedUsers.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
      {selectedUsers.map((u) => (
        <SelectedMemberChip key={u.id} user={u} isNew={isEdit && pendingAdd.includes(Number(u.id))} onRemove={onRemove} />
      ))}
    </div>
  );
}

function MemberSearchControls({ search, roleFilter, onSearchChange, onRoleFilterChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <SearchIcon />
        <input
          value={search}
          onChange={onSearchChange}
          placeholder="Search by name or email..."
          style={{ ...inputStyle, paddingLeft: '30px', padding: '8px 12px 8px 30px', fontSize: '13px' }}
        />
      </div>
      <select value={roleFilter} onChange={onRoleFilterChange} style={{ ...inputStyle, width: 'auto', minWidth: '140px', padding: '8px 12px', fontSize: '13px' }}>
        <option value="">All Roles</option>
        <option value="Admin">Admin</option>
        <option value="ProjectManager">Project Manager</option>
        <option value="Collaborator">Collaborator</option>
      </select>
    </div>
  );
}

function MemberListRow({ user, isSelected, isNew, isLast, onToggle }) {
  const activeColor = isNew ? NEW_MEMBER_COLOR : 'var(--accent)';

  return (
    <div
      onClick={() => onToggle(user.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        cursor: 'pointer',
        backgroundColor: isSelected ? (isNew ? '#10b98110' : 'var(--accent-light)') : 'transparent',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Avatar name={user.name} size={32} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>{user.name}</p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email} · {user.role}
        </p>
      </div>

      <div
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '5px',
          flexShrink: 0,
          border: `2px solid ${isSelected ? activeColor : 'var(--border)'}`,
          backgroundColor: isSelected ? activeColor : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {isSelected && <CheckIcon />}
      </div>
    </div>
  );
}

function MemberList({ users, selectedIds, pendingAdd, isEdit, onToggle }) {
  return (
    <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
      {users.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          No active users found matching your search
        </div>
      ) : (
        users.map((u, i) => (
          <MemberListRow
            key={u.id}
            user={u}
            isSelected={selectedIds.includes(Number(u.id))}
            isNew={isEdit && pendingAdd.includes(Number(u.id))}
            isLast={i === users.length - 1}
            onToggle={onToggle}
          />
        ))
      )}
    </div>
  );
}

function AssignMembersCard({
  isEdit,
  selectedIds,
  pendingAdd,
  pendingRemove,
  selectedUsers,
  filteredUsers,
  userSearch,
  userRoleFilter,
  onSearchChange,
  onRoleFilterChange,
  onToggleUser,
  onClearAll,
}) {
  return (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
      <AssignmentSummary
        isEdit={isEdit}
        selectedCount={selectedIds.length}
        pendingAddCount={pendingAdd.length}
        pendingRemoveCount={pendingRemove.length}
        onClearAll={onClearAll}
        showClearAll={selectedIds.length > 0}
      />

      <SelectedMemberChips selectedUsers={selectedUsers} pendingAdd={pendingAdd} isEdit={isEdit} onRemove={onToggleUser} />

      <MemberSearchControls
        search={userSearch}
        roleFilter={userRoleFilter}
        onSearchChange={onSearchChange}
        onRoleFilterChange={onRoleFilterChange}
      />

      <MemberList users={filteredUsers} selectedIds={selectedIds} pendingAdd={pendingAdd} isEdit={isEdit} onToggle={onToggleUser} />
    </div>
  );
}

function FormActions({ isEdit, submitting, onCancel }) {
  return (
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
      <button
        type="button"
        onClick={onCancel}
        style={{
          padding: '11px 20px',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '11px 24px',
          borderRadius: '10px',
          border: 'none',
          backgroundColor: submitting ? '#6ea8da' : 'var(--accent)',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '600',
          cursor: submitting ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {submitting ? <LoadingSpinner size={18} /> : isEdit ? 'Save Changes' : 'Create Task'}
      </button>
    </div>
  );
}

function FormHeader({ title, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '13px',
          padding: '6px 10px',
          borderRadius: '8px',
        }}
      >
        <BackArrowIcon />
        Back
      </button>
      <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{title}</h1>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/*  Main component                                                          */
/* ----------------------------------------------------------------------- */

export default function TaskForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const isDark = useDocumentDarkMode();
  const [form, setForm] = useState(DEFAULT_FORM);

  const { allUsers, fetchUsers } = useActiveUsers();
  const assignees = useAssigneeSelection(isEdit);

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [fetchingTask, setFetchingTask] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // ── fetch task and seed selected IDs ─────────────────────────────────────
  const fetchTask = async () => {
    try {
      const res = await api.get(`/tasks/${id}`);
      const t = res.data.task;
      setForm(taskToFormValues(t));
      assignees.seedFromTask(t.assignees);
    } catch {
      toast.error('Failed to load task');
    } finally {
      setFetchingTask(false);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchUsers();
      if (isEdit) await fetchTask();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFieldChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateTaskForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);

    try {
      if (!isEdit) {
        // ── CREATE: send assigneeIds in one shot ──────────────────────────
        await api.post('/tasks', {
          ...buildTaskPayload(form),
          assigneeIds: assignees.selectedIds,
        });
        toast.success('Task created successfully');
      } else {
        // ── EDIT: three separate steps ────────────────────────────────────

        // 1. Update task fields (backend PUT does NOT handle assigneeIds)
        await api.put(`/tasks/${id}`, buildTaskPayload(form));

        // 2. Add new members  →  POST /tasks/:id/members  { userIds: [...] }
        if (assignees.pendingAdd.length > 0) {
          await api.post(`/tasks/${id}/members`, { userIds: assignees.pendingAdd });
        }

        // 3. Remove members   →  DELETE /tasks/:id/members/:userId  (one by one)
        for (const uid of assignees.pendingRemove) {
          await api.delete(`/tasks/${id}/members/${uid}`);
        }

        toast.success('Task updated successfully');
      }

      // Small delay so the success toast has time to mount/render before
      // the route change unmounts this page (otherwise the toast can be
      // skipped entirely, especially right after a fresh login/page load).
      setTimeout(() => navigate('/tasks'), 300);
    } catch (err) {
      toast.error(err.response?.data?.description || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  // ── derived UI data ───────────────────────────────────────────────────────
  const filteredUsers = allUsers.filter((u) => {
    const matchSearch =
      !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = !userRoleFilter || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  const selectedUsers = allUsers.filter((u) => assignees.selectedIds.includes(Number(u.id)));

  if (fetchingTask) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <FormHeader title={isEdit ? 'Edit Task' : 'Create New Task'} onBack={() => navigate('/tasks')} />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <TaskDetailsCard form={form} errors={errors} isDark={isDark} onFieldChange={handleFieldChange} />

          <AssignMembersCard
            isEdit={isEdit}
            selectedIds={assignees.selectedIds}
            pendingAdd={assignees.pendingAdd}
            pendingRemove={assignees.pendingRemove}
            selectedUsers={selectedUsers}
            filteredUsers={filteredUsers}
            userSearch={userSearch}
            userRoleFilter={userRoleFilter}
            onSearchChange={(e) => setUserSearch(e.target.value)}
            onRoleFilterChange={(e) => setUserRoleFilter(e.target.value)}
            onToggleUser={assignees.toggle}
            onClearAll={assignees.clearAll}
          />

          <FormActions isEdit={isEdit} submitting={submitting} onCancel={() => navigate('/tasks')} />
        </form>
      </div>
    </Layout>
  );
}
