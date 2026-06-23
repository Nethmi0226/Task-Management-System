import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import api from '../api/axios.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_META = {
  ProjectManager: { label: 'Project Manager', color: '#8b5cf6', bg: '#8b5cf610' },
  Collaborator:   { label: 'Collaborator',    color: '#3b82f6', bg: '#3b82f610' },
};

const STATUS_STYLE = {
  'To Do':       { color: '#6b7280', bg: '#6b728015' },
  'In Progress': { color: '#f59e0b', bg: '#f59e0b15' },
  'Completed':   { color: '#10b981', bg: '#10b98115' },
};

const PRIORITY_COLOR = {
  High:   '#ef4444',
  Medium: '#f59e0b',
  Low:    '#10b981',
};

const AVATAR_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f59e0b', '#3b82f6', '#10b981', '#f97316',
  '#ef4444', '#06b6d4',
];

const ROLE_FILTERS       = ['All', 'ProjectManager', 'Collaborator'];
const ROLE_FILTER_LABELS = { All: 'All', ProjectManager: 'Project Managers', Collaborator: 'Collaborators' };
const SHOW_TASK_LIMIT    = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function memberCompletion(tasks) {
  if (!tasks.length) return 0;
  return tasks.filter(t => t.status === 'Completed').length / tasks.length;
}

function getAssignedTasks(allTasks, memberId) {
  return allTasks.filter(t =>
    (t.assignees || []).some(a => Number(a.id) === Number(memberId))
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const card = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
};

const pill = (color, bg) => ({
  fontSize: '9.5px',
  fontWeight: '700',
  color,
  backgroundColor: bg,
  padding: '2px 7px',
  borderRadius: '10px',
  whiteSpace: 'nowrap',
});

const iconBox = (color) => ({
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  backgroundColor: color + '18',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const selectStyle = {
  padding: '9px 12px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  fontWeight: '600',
  cursor: 'pointer',
  outline: 'none',
  minWidth: '120px',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBox({ value, label, color = 'var(--text-primary)' }) {
  return (
    <div style={{
      flex: 1,
      textAlign: 'center',
      padding: '10px 6px',
      borderRadius: '10px',
      backgroundColor: 'var(--bg-primary)',
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: '20px', fontWeight: '800', color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>{label}</div>
    </div>
  );
}

function TaskPill({ task }) {
  const s = STATUS_STYLE[task.status] || STATUS_STYLE['To Do'];
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '7px 10px',
      borderRadius: '8px',
      backgroundColor: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      gap: '8px',
    }}>
      <span style={{
        fontSize: '11.5px',
        fontWeight: '600',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1,
      }}>
        {task.title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          backgroundColor: PRIORITY_COLOR[task.priority] || '#6b7280',
          flexShrink: 0,
        }} />
        <span style={pill(s.color, s.bg)}>{task.status}</span>
      </div>
    </div>
  );
}

function MemberCardAvatar({ name }) {
  const color = avatarColor(name);
  return (
    <div style={{
      width: '52px', height: '52px',
      borderRadius: '14px',
      backgroundColor: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '20px', fontWeight: '800',
      color: '#fff', flexShrink: 0,
      textTransform: 'uppercase',
      boxShadow: `0 4px 12px ${color}44`,
    }}>
      {name?.charAt(0) || '?'}
    </div>
  );
}

function MemberCardHeader({ member }) {
  const role = ROLE_META[member.role] || { label: member.role, color: '#6b7280', bg: '#6b728010' };
  return (
    <div style={{ padding: '18px 18px 14px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
      <MemberCardAvatar name={member.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <p style={{
            fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)',
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {member.name}
          </p>
          <span style={{
            ...pill(role.color, role.bg),
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}>
            {role.label}
          </span>
        </div>
        <p style={{
          fontSize: '11.5px', color: 'var(--text-muted)',
          margin: '3px 0 8px', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {member.email}
        </p>
        <span style={{
          fontSize: '10px', fontWeight: '600',
          color: member.isActive ? '#10b981' : '#ef4444',
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: member.isActive ? '#10b981' : '#ef4444',
            display: 'inline-block',
          }} />
          {member.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  );
}

function MemberCardProgress({ tasks }) {
  const total      = tasks.length;
  const done       = tasks.filter(t => t.status === 'Completed').length;
  const inProgress = tasks.filter(t => t.status === 'In Progress').length;
  const todo       = tasks.filter(t => t.status === 'To Do').length;
  const progress   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <div style={{ padding: '0 18px 14px', display: 'flex', gap: '8px' }}>
        <StatBox value={total}      label="Total"       />
        <StatBox value={inProgress} label="In Progress" color="#f59e0b" />
        <StatBox value={done}       label="Done"        color="#10b981" />
        <StatBox value={todo}       label="To Do"       color="#6b7280" />
      </div>

      {total > 0 && (
        <div style={{ padding: '0 18px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: '500' }}>Completion</span>
            <span style={{ fontSize: '10.5px', fontWeight: '700', color: progress === 100 ? '#10b981' : 'var(--text-secondary)' }}>
              {progress}%
            </span>
          </div>
          <div style={{ height: '5px', borderRadius: '10px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: '10px',
              background: progress === 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}
    </>
  );
}

function MemberCardTasks({ tasks }) {
  const [expanded, setExpanded] = useState(false);
  const total      = tasks.length;
  const visible    = expanded ? tasks : tasks.slice(0, SHOW_TASK_LIMIT);
  const remaining  = tasks.length - SHOW_TASK_LIMIT;

  if (total === 0) {
    return (
      <div style={{ borderTop: '1px solid var(--border)', padding: '14px 18px', textAlign: 'center' }}>
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No tasks assigned</span>
      </div>
    );
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Assigned Tasks
      </p>
      {visible.map(t => <TaskPill key={t.id} task={t} />)}
      {tasks.length > SHOW_TASK_LIMIT && (
        <button
          onClick={() => setExpanded(p => !p)}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}
        >
          {expanded ? '▲ Show less' : `▼ Show ${remaining} more`}
        </button>
      )}
    </div>
  );
}

function MemberCard({ member, tasks }) {
  const role  = ROLE_META[member.role] || { color: '#6b7280' };
  const color = avatarColor(member.name);
  void color; // used inside MemberCardAvatar

  return (
    <div
      style={{ ...card, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ height: '4px', background: role.color }} />
      <MemberCardHeader  member={member} />
      <MemberCardProgress tasks={tasks} />
      <MemberCardTasks   tasks={tasks} />
    </div>
  );
}

function SummaryStatsBar({ members, tasks }) {
  const totalCompleted  = tasks.filter(t => t.status === 'Completed').length;
  const totalInProgress = tasks.filter(t => t.status === 'In Progress').length;

  const stats = [
    { label: 'Team Members', value: members.length,  color: '#6366f1' },
    { label: 'Total Tasks',  value: tasks.length,    color: '#3b82f6' },
    { label: 'In Progress',  value: totalInProgress, color: '#f59e0b' },
    { label: 'Completed',    value: totalCompleted,  color: '#10b981' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
      {stats.map(s => (
        <div key={s.label} style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={iconBox(s.color)}>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', backgroundColor: s.color }} />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '500' }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RoleFilterTabs({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
      {ROLE_FILTERS.map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          style={{
            padding: '6px 14px', borderRadius: '7px', border: 'none',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
            backgroundColor: active === f ? 'var(--accent)' : 'transparent',
            color: active === f ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
        >
          {ROLE_FILTER_LABELS[f]}
        </button>
      ))}
    </div>
  );
}

function SearchAndFilterBar({ search, onSearchChange, statusFilter, onStatusChange, sortBy, onSortChange, resultCount, totalCount, onClear }) {
  const hasActiveFilter = search || statusFilter !== 'All' || sortBy !== 'name';

  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
        <svg
          width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-muted)" strokeWidth="2.2"
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            paddingLeft: '36px',
            paddingRight: search ? '36px' : '12px',
            paddingTop: '9px', paddingBottom: '9px',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1, padding: '2px' }}
          >
            ×
          </button>
        )}
      </div>

      <select value={statusFilter} onChange={e => onStatusChange(e.target.value)} style={selectStyle}>
        <option value="All">All Status</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>

      <select value={sortBy} onChange={e => onSortChange(e.target.value)} style={{ ...selectStyle, minWidth: '140px' }}>
        <option value="name">Sort: Name A–Z</option>
        <option value="tasks">Sort: Most Tasks</option>
        <option value="completion">Sort: Completion %</option>
      </select>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {resultCount} of {totalCount} members
        </span>
        {hasActiveFilter && (
          <button
            onClick={onClear}
            style={{ fontSize: '11px', fontWeight: '600', color: '#ef4444', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '7px', padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ search, onClearSearch }) {
  return (
    <div style={{
      gridColumn: '1/-1', textAlign: 'center', padding: '60px',
      color: 'var(--text-muted)', ...card,
      border: '1px dashed var(--border)',
    }}>
      <p style={{ fontSize: '32px', marginBottom: '12px' }}>{search ? '🔍' : '👥'}</p>
      <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
        {search ? `No results for "${search}"` : 'No team members found.'}
      </p>
      {search && (
        <p style={{ fontSize: '12px', margin: 0 }}>
          Try a different name or email, or{' '}
          <button onClick={onClearSearch} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: '600', fontSize: '12px', padding: 0 }}>
            clear search
          </button>
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [members,      setMembers]      = useState([]);
  const [tasks,        setTasks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [roleFilter,   setRoleFilter]   = useState('All');
  const [search,       setSearch]       = useState('');
  const [sortBy,       setSortBy]       = useState('name');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, tasksRes] = await Promise.all([
        api.get('/auth/users'),
        api.get('/tasks'),
      ]);
      const allUsers = usersRes.data.users || [];
      setMembers(allUsers.filter(u => u.role === 'Collaborator' || u.role === 'ProjectManager'));
      setTasks(tasksRes.data.tasks || []);
    } catch (e) {
      console.error('Fetch team error:', e);
      setMembers([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const memberTasks = (memberId) =>
    getAssignedTasks(tasks, memberId);

  const filtered = members
    .filter(m => roleFilter === 'All' || m.role === roleFilter)
    .filter(m => statusFilter === 'All' || (statusFilter === 'Active' ? m.isActive : !m.isActive))
    .filter(m => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'tasks')      return memberTasks(b.id).length - memberTasks(a.id).length;
      if (sortBy === 'completion') return memberCompletion(memberTasks(b.id)) - memberCompletion(memberTasks(a.id));
      return a.name?.localeCompare(b.name);
    });

  const activeMemberCount = members.filter(m => m.isActive).length;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setSortBy('name');
  };

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px' }}>My Team</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              {activeMemberCount} active · {members.length} total members
            </p>
          </div>
          <RoleFilterTabs active={roleFilter} onChange={setRoleFilter} />
        </div>

        {/* Search + sort toolbar */}
        <SearchAndFilterBar
          search={search}          onSearchChange={setSearch}
          statusFilter={statusFilter} onStatusChange={setStatusFilter}
          sortBy={sortBy}          onSortChange={setSortBy}
          resultCount={filtered.length} totalCount={members.length}
          onClear={clearFilters}
        />

        {/* Summary stats */}
        {!loading && members.length > 0 && (
          <SummaryStatsBar members={members} tasks={tasks} />
        )}

        {/* Member grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '18px' }}>
            {filtered.length === 0
              ? <EmptyState search={search} onClearSearch={() => setSearch('')} />
              : filtered.map(m => (
                  <MemberCard key={m.id} member={m} tasks={memberTasks(m.id)} />
                ))
            }
          </div>
        )}

      </div>
    </Layout>
  );
}
