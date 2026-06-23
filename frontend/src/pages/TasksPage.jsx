import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../components/layout/Layout.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import TaskCard from '../components/tasks/TaskCard.jsx';
import api from '../api/axios.js';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS   = ['To Do', 'In Progress', 'Completed'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];
const PRIORITY_LABELS  = { High: '🔴 High', Medium: '🟡 Medium', Low: '🟢 Low' };

const EMPTY_FILTERS = { status: '', priority: '', search: '' };

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageHeader({ taskCount, canCreate, onCreateClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>Tasks</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
          {taskCount} task{taskCount !== 1 ? 's' : ''} found
        </p>
      </div>
      {canCreate && (
        <button
          onClick={onCreateClick}
          style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Task
        </button>
      )}
    </div>
  );
}

function FiltersBar({ filters, onChange, onClear }) {
  const hasActive = filters.status || filters.priority || filters.search;
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>

      {/* Search */}
      <div style={{ position: 'relative', flex: '1', minWidth: '160px' }}>
        <svg
          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={set('search')}
          style={{ ...inputBase, paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {/* Status */}
      <select value={filters.status} onChange={set('status')} style={{ ...inputBase, minWidth: '140px' }}>
        <option value="">All Statuses</option>
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Priority */}
      <select value={filters.priority} onChange={set('priority')} style={{ ...inputBase, minWidth: '140px' }}>
        <option value="">All Priorities</option>
        {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
      </select>

      {/* Clear */}
      {hasActive && (
        <button
          onClick={onClear}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

function TaskGrid({ tasks, onDelete }) {
  if (tasks.length === 0) {
    return (
      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
        <p style={{ fontSize: '40px', marginBottom: '12px' }}>📋</p>
        <p style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>No tasks found</p>
        <p style={{ fontSize: '13px' }}>Try adjusting your filters or create a new task</p>
      </div>
    );
  }

  return tasks.map(task => (
    <TaskCard key={task.id} task={task} onDelete={onDelete} />
  ));
}

function DeleteConfirmModal({ task, onConfirm, onCancel }) {
  if (!task) return null;

  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '28px 28px 24px', maxWidth: '380px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: '1px solid var(--border)' }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px', textAlign: 'center' }}>🗑️</div>
        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center' }}>
          Delete Task?
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          "<strong style={{ color: 'var(--text-primary)' }}>{task.title}</strong>" will be permanently deleted.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'none', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#ef4444', fontSize: '13px', fontWeight: '600', color: '#fff', cursor: 'pointer' }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [tasks,         setTasks]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filters,       setFilters]       = useState(EMPTY_FILTERS);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchTasks(); }, [filters]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status)   params.append('status',   filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search)   params.append('search',   filters.search);
      const res = await api.get(`/tasks?${params.toString()}`);
      setTasks(res.data.tasks || []);
    } catch (e) {
      console.error('Fetch tasks error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/tasks/${deleteConfirm.id}`);
      setTasks(prev => prev.filter(t => t.id !== deleteConfirm.id));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const isAdminOrPM = user?.role === 'Admin' || user?.role === 'ProjectManager';

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <PageHeader
          taskCount={tasks.length}
          canCreate={isAdminOrPM}
          onCreateClick={() => navigate('/tasks/new')}
        />

        <FiltersBar
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            <TaskGrid tasks={tasks} onDelete={setDeleteConfirm} />
          </div>
        )}

      </div>

      <DeleteConfirmModal
        task={deleteConfirm}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />
    </Layout>
  );
}
