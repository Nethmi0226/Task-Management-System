import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../components/layout/Layout.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import api from '../api/axios.js';

// ── Recharts ──────────────────────────────────────────
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

// ── SheetJS ───────────────────────────────────────────
import * as XLSX from 'xlsx';

// ── Palette ───────────────────────────────────────────
const C = {
  indigo:  '#6366f1',
  violet:  '#8b5cf6',
  pink:    '#ec4899',
  teal:    '#14b8a6',
  amber:   '#f59e0b',
  blue:    '#3b82f6',
  green:   '#10b981',
  orange:  '#f97316',
  red:     '#ef4444',
  slate:   '#64748b',
};
const PIE_COLORS = [C.indigo, C.teal, C.amber, C.pink, C.violet, C.orange, C.green, C.blue];

// ── Custom pie label renderer ────────────────────────────
// Default recharts pie labels are placed at a fixed radial offset and
// always use a centered/left text-anchor based on quadrant, which causes
// long left-side labels (e.g. "In Progress 41%") to extend past x=0 and
// get clipped. This renderer anchors text away from the chart center so
// labels grow outward into the available margin instead of off-canvas.
const renderPieLabel = (props) => {
  const { cx, cy, midAngle, outerRadius, percent, name, payload, withName = true } = props;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor = x > cx ? 'start' : 'end';
  const label = withName ? `${name} ${(percent * 100).toFixed(0)}%` : `${(percent * 100).toFixed(0)}%`;
  return (
    <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fontSize={12} fill={payload?.color || 'var(--text-secondary)'}>
      {label}
    </text>
  );
};

const priorityColor = {
  High: C.red,
  Medium: C.amber,
  Low: C.green,
};

const statusColor = {
  'To Do': C.slate,
  'In Progress': C.blue,
  'Completed': C.green,
};

// ── Helpers ───────────────────────────────────────────
const DAY_MS = 86400000;

const startOfDay  = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const startOfWeek = (d) => { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; };
const startOfMonth= (d) => { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; };

const fmt = (d) => new Date(d).toLocaleDateString(undefined, { month:'short', day:'numeric' });
const fmtMonth = (d) => new Date(d).toLocaleDateString(undefined, { month:'short', year:'2-digit' });
const fmtWeek = (d) => `W/e ${fmt(new Date(+new Date(d) + 6*DAY_MS))}`;

// Build bucket labels for last N days/weeks/months
function buildBuckets(period, count) {
  const now = new Date();
  const result = [];
  if (period === 'daily') {
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now - i * DAY_MS);
      result.push({ key: startOfDay(d).toISOString(), label: fmt(d) });
    }
  } else if (period === 'weekly') {
    const w0 = startOfWeek(now);
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(+w0 - i * 7 * DAY_MS);
      result.push({ key: d.toISOString(), label: fmtWeek(d) });
    }
  } else {
    const m0 = startOfMonth(now);
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(m0.getFullYear(), m0.getMonth() - i, 1);
      result.push({ key: d.toISOString(), label: fmtMonth(d) });
    }
  }
  return result;
}

function bucketIndex(period, buckets, dateStr) {
  const d = new Date(dateStr);
  if (period === 'daily') {
    const key = startOfDay(d).toISOString();
    return buckets.findIndex(b => b.key === key);
  } else if (period === 'weekly') {
    const key = startOfWeek(d).toISOString();
    return buckets.findIndex(b => b.key === key);
  } else {
    const key = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    return buckets.findIndex(b => b.key === key);
  }
}

// ── Custom Tooltip ────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'10px', padding:'10px 14px', boxShadow:'var(--shadow-md)', fontSize:'12px' }}>
      <p style={{ margin:'0 0 6px', fontWeight:'700', color:'var(--text-primary)' }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ margin:'2px 0', color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color }) => (
  <div style={{ backgroundColor:'var(--bg-card)', borderRadius:'16px', padding:'20px 24px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', display:'flex', alignItems:'center', gap:'16px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
    <div style={{ width:'48px', height:'48px', borderRadius:'14px', backgroundColor:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>
      {icon}
    </div>
    <div>
      <p style={{ fontSize:'28px', fontWeight:'800', color:'var(--text-primary)', margin:'0 0 2px', lineHeight:1 }}>{value}</p>
      <p style={{ fontSize:'12px', fontWeight:'600', color:'var(--text-secondary)', margin:0 }}>{label}</p>
      {sub && <p style={{ fontSize:'11px', color:'var(--text-muted)', margin:'2px 0 0' }}>{sub}</p>}
    </div>
  </div>
);

// ── Chart card wrapper ────────────────────────────────
const ChartCard = ({ title, subtitle, children, extra }) => (
  <div style={{ backgroundColor:'var(--bg-card)', borderRadius:'16px', padding:'20px 24px', border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'18px', flexWrap:'wrap', gap:'8px' }}>
      <div>
        <h3 style={{ fontSize:'14px', fontWeight:'700', color:'var(--text-primary)', margin:'0 0 3px' }}>{title}</h3>
        {subtitle && <p style={{ fontSize:'12px', color:'var(--text-muted)', margin:0 }}>{subtitle}</p>}
      </div>
      {extra}
    </div>
    {children}
  </div>
);

// ── Section heading ───────────────────────────────────
const SectionHead = ({ title, icon }) => (
  <div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'32px 0 16px', pageBreakAfter: 'avoid', breakAfter: 'avoid' }}>
    <span style={{ fontSize:'20px' }}>{icon}</span>
    <h2 style={{ fontSize:'16px', fontWeight:'800', color:'var(--text-primary)', margin:0 }}>{title}</h2>
    <div style={{ flex:1, height:'1px', backgroundColor:'var(--border)' }} />
  </div>
);

// ── Period selector ────────────────────────────────────
const PeriodBtn = ({ value, label, period, setPeriod }) => (
  <button onClick={() => setPeriod(value)}
    style={{ padding:'6px 14px', borderRadius:'8px', border:'none', fontSize:'12px', fontWeight:'600', cursor:'pointer', backgroundColor: period===value ? 'var(--accent)' : 'var(--bg-primary)', color: period===value ? '#fff' : 'var(--text-muted)', transition:'all 0.15s' }}>
    {label}
  </button>
);

// ─────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const exportRef  = useRef(null);

  const [period,   setPeriod]   = useState('weekly');   // daily | weekly | monthly
  const [loading,  setLoading]  = useState(true);
  const [rawUsers, setRawUsers] = useState([]);
  const [rawTasks, setRawTasks] = useState([]);

  // Redirect non-admins immediately
  useEffect(() => {
    if (user && user.role !== 'Admin') {
      navigate('/home');
    }
  }, [user, navigate]);

  // ── Fetch ───────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [uRes, tRes] = await Promise.all([
          api.get('/users'),
          api.get('/tasks')
        ]);
        setRawUsers(uRes.data.users || []);
        setRawTasks(tRes.data.tasks || []);
      } catch (e) {
        console.error('Analytics fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (user && user.role !== 'Admin') {
    return null;
  }


  // ── Derived data ────────────────────────────────────
  const BUCKET_COUNT = period === 'daily' ? 14 : period === 'weekly' ? 12 : 12;
  const buckets = buildBuckets(period, BUCKET_COUNT);

  // ── Top-level stats ─────────────────────────────────
  const totalUsers      = rawUsers.length;
  const activeUsers     = rawUsers.filter(u => u.isActive).length;
  const inactiveUsers   = totalUsers - activeUsers;
  const totalTasks      = rawTasks.length;
  const completedTasks  = rawTasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = rawTasks.filter(t => t.status === 'In Progress').length;
  const todoTasks       = rawTasks.filter(t => t.status === 'To Do').length;
  const overdueTasks    = rawTasks.filter(t => {
    if (!t.dueDate || t.status === 'Completed') return false;
    return new Date(t.dueDate) < new Date();
  }).length;
  const completionRate  = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // ── Task creation over time ─────────────────────────
  const taskCreationData = buckets.map(b => ({ name: b.label, tasks: 0 }));
  rawTasks.forEach(t => {
    const idx = bucketIndex(period, buckets, t.createdAt);
    if (idx >= 0) taskCreationData[idx].tasks++;
  });

  // ── User registration over time ─────────────────────
  const userRegData = buckets.map(b => ({ name: b.label, users: 0 }));
  rawUsers.forEach(u => {
    const idx = bucketIndex(period, buckets, u.createdAt);
    if (idx >= 0) userRegData[idx].users++;
  });

  // ── Task completion over time ───────────────────────
  const completionData = buckets.map(b => ({ name: b.label, completed: 0, created: 0 }));
  rawTasks.forEach(t => {
    const cIdx = bucketIndex(period, buckets, t.createdAt);
    if (cIdx >= 0) completionData[cIdx].created++;
    if (t.status === 'Completed') {
      const uIdx = bucketIndex(period, buckets, t.updatedAt);
      if (uIdx >= 0) completionData[uIdx].completed++;
    }
  });

  // ── Task status distribution (pie) ─────────────────
  const statusPie = [
    { name: 'To Do',       value: todoTasks,       color: C.slate  },
    { name: 'In Progress', value: inProgressTasks, color: C.blue   },
    { name: 'Completed',   value: completedTasks,  color: C.green  },
  ].filter(d => d.value > 0);

  // ── Priority distribution (pie) ────────────────────
  const priorityPie = ['High','Medium','Low'].map((p, i) => ({
    name: p,
    value: rawTasks.filter(t => t.priority === p).length,
    color: [C.red, C.amber, C.green][i]
  })).filter(d => d.value > 0);

  // ── Role distribution (pie) ─────────────────────────
  const rolePie = ['Admin','ProjectManager','Collaborator'].map((r, i) => ({
    name: r === 'ProjectManager' ? 'Proj. Manager' : r,
    value: rawUsers.filter(u => u.role === r).length,
    color: PIE_COLORS[i]
  })).filter(d => d.value > 0);

  // ── Tasks per creator (top 8) ───────────────────────
  const creatorMap = {};
  rawTasks.forEach(t => {
    const name = t.creator?.name || 'Unknown';
    creatorMap[name] = (creatorMap[name] || 0) + 1;
  });
  const tasksPerCreator = Object.entries(creatorMap)
    .sort((a,b) => b[1]-a[1])
    .slice(0,8)
    .map(([name, count]) => ({ name, count }));

  // ── Tasks per assignee (top 8, all assignees) ───────
  const assigneeMap = {};
  rawTasks.forEach(t => {
    (t.assignees || []).forEach(a => {
      assigneeMap[a.name] = (assigneeMap[a.name] || 0) + 1;
    });
  });
  const tasksPerAssignee = Object.entries(assigneeMap)
    .sort((a,b) => b[1]-a[1])
    .slice(0,8)
    .map(([name, count]) => ({ name, count }));

  // ── Completion rate per assignee (top 8) ───────────
  const assigneeComplMap = {};
  rawTasks.forEach(t => {
    (t.assignees || []).forEach(a => {
      if (!assigneeComplMap[a.name]) assigneeComplMap[a.name] = { total:0, done:0 };
      assigneeComplMap[a.name].total++;
      if (t.status === 'Completed') assigneeComplMap[a.name].done++;
    });
  });
  const completionByAssignee = Object.entries(assigneeComplMap)
    .filter(([,v]) => v.total >= 1)
    .sort((a,b) => b[1].total - a[1].total)
    .slice(0,8)
    .map(([name,v]) => ({ name, rate: Math.round((v.done/v.total)*100), total: v.total }));

  // ── Overdue tasks per assignee ──────────────────────
  const overdueMap = {};
  rawTasks.forEach(t => {
    if (!t.dueDate || t.status === 'Completed') return;
    if (new Date(t.dueDate) >= new Date()) return;
    (t.assignees || []).forEach(a => {
      overdueMap[a.name] = (overdueMap[a.name] || 0) + 1;
    });
  });
  const overdueByAssignee = Object.entries(overdueMap)
    .sort((a,b) => b[1]-a[1])
    .slice(0,8)
    .map(([name,count]) => ({ name, count }));

  // ── Priority × Status matrix ────────────────────────
  const matrixData = ['High','Medium','Low'].map(p => ({
    priority: p,
    'To Do':      rawTasks.filter(t => t.priority===p && t.status==='To Do').length,
    'In Progress':rawTasks.filter(t => t.priority===p && t.status==='In Progress').length,
    'Completed':  rawTasks.filter(t => t.priority===p && t.status==='Completed').length,
  }));

  // ── Radar — workload per user (top 6) ──────────────
  const radarData = Object.entries(assigneeComplMap)
    .sort((a,b) => b[1].total-a[1].total)
    .slice(0,6)
    .map(([name,v]) => ({
      user: name.split(' ')[0],
      Total:      v.total,
      Completed:  v.done,
      Pending:    v.total - v.done,
    }));

  // ── Tasks due in next 7 days (upcoming) ─────────────
  const now7 = new Date(); now7.setDate(now7.getDate()+7);
  const upcoming = rawTasks
    .filter(t => t.dueDate && t.status !== 'Completed' && new Date(t.dueDate) <= now7 && new Date(t.dueDate) >= new Date())
    .sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate))
    .slice(0,10);

  // ── Recent users ────────────────────────────────────
  const recentUsers = [...rawUsers]
    .sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))
    .slice(0,8);

  // ── Export helpers ───────────────────────────────────
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Metric','Value'],
      ['Total Users', totalUsers],
      ['Active Users', activeUsers],
      ['Inactive Users', inactiveUsers],
      ['Total Tasks', totalTasks],
      ['Completed Tasks', completedTasks],
      ['In Progress Tasks', inProgressTasks],
      ['To Do Tasks', todoTasks],
      ['Overdue Tasks', overdueTasks],
      ['Overall Completion Rate (%)', completionRate],
      ['Export Date', new Date().toLocaleString()],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

    // Users sheet — no passwords
    const userRows = rawUsers.map(u => ({
      ID: u.id,
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Status: u.isActive ? 'Active' : 'Inactive',
      'Must Change Password': u.mustChangePassword ? 'Yes' : 'No',
      'Created At': new Date(u.createdAt).toLocaleString(),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(userRows), 'Users');

    // Tasks sheet
    const taskRows = rawTasks.map(t => ({
      ID: t.id,
      Title: t.title,
      Description: t.description || '',
      Status: t.status,
      Priority: t.priority,
      'Due Date': t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '',
      'Created By': t.creator?.name || '',
      'Assignees': (t.assignees || []).map(a => a.name).join(', '),
      'Is Overdue': (!t.dueDate || t.status==='Completed') ? 'No' : new Date(t.dueDate)<new Date() ? 'Yes' : 'No',
      'Created At': new Date(t.createdAt).toLocaleString(),
      'Updated At': new Date(t.updatedAt).toLocaleString(),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows), 'Tasks');

    // Tasks per creator
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasksPerCreator.map(r=>({Creator:r.name,Tasks:r.count}))), 'Tasks by Creator');

    // Completion by assignee
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(completionByAssignee.map(r=>({Assignee:r.name,'Completion Rate (%)':r.rate,'Total Tasks':r.total}))), 'Completion by Assignee');

    XLSX.writeFile(wb, `Planora_Analytics_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportPDF = () => {
    window.print();
  };

  // ── Render ─────────────────────────────────────────
  if (loading) return <Layout><LoadingSpinner /></Layout>;

  return (
    <Layout>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-content { margin: 0 !important; padding: 0 !important; }
          body { background: white !important; }
        }
        .analytics-grid-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; }
        .analytics-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .analytics-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
        @media (max-width: 900px) {
          .analytics-grid-4 { grid-template-columns: repeat(2,1fr) !important; }
          .analytics-grid-3 { grid-template-columns: repeat(2,1fr) !important; }
          .analytics-grid-2 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .analytics-grid-4, .analytics-grid-3, .analytics-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div ref={exportRef} style={{ maxWidth:'1200px', margin:'0 auto' }}>

        {/* ── Page header ── */}
        <div className="no-print" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'16px' }}>
          <div>
            <h1 style={{ fontSize:'24px', fontWeight:'800', color:'var(--text-primary)', margin:'0 0 4px' }}>Analytics Dashboard</h1>
            <p style={{ fontSize:'13px', color:'var(--text-muted)', margin:0 }}>
              Admin-only · Last refreshed {new Date().toLocaleString()}
            </p>
          </div>
          <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
            {/* Period selector */}
            <div style={{ display:'flex', gap:'4px', backgroundColor:'var(--bg-card)', padding:'4px', borderRadius:'10px', border:'1px solid var(--border)' }}>
              <PeriodBtn value="daily"   label="Daily"   period={period} setPeriod={setPeriod} />
              <PeriodBtn value="weekly"  label="Weekly"  period={period} setPeriod={setPeriod} />
              <PeriodBtn value="monthly" label="Monthly" period={period} setPeriod={setPeriod} />
            </div>
            {/* Export buttons */}
            <button onClick={exportExcel}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', backgroundColor:'#10b981', color:'#fff', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
              📊 Export Excel
            </button>
            <button onClick={exportPDF}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', backgroundColor:'#ef4444', color:'#fff', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>
              📄 Export PDF
            </button>
          </div>
        </div>

        {/* ── KPI stats ── */}
        <div className="analytics-grid-4">
          <StatCard icon="👥" label="Total Users"      value={totalUsers}      sub={`${activeUsers} active · ${inactiveUsers} inactive`} color={C.indigo} />
          <StatCard icon="📋" label="Total Tasks"      value={totalTasks}      sub={`${completionRate}% completion rate`}                color={C.blue}   />
          <StatCard icon="✅" label="Completed Tasks"  value={completedTasks}  sub={`${inProgressTasks} in progress`}                   color={C.green}  />
          <StatCard icon="⚠️" label="Overdue Tasks"    value={overdueTasks}    sub={`${todoTasks} still to-do`}                         color={C.red}    />
        </div>

        {/* ── Over-time trends ── */}
        <SectionHead title="Trends Over Time" icon="📈" />
        <div className="analytics-grid-2">
          <ChartCard title="Task Creation" subtitle={`Tasks created per ${period.replace('ly','')} period`}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={taskCreationData}>
                <defs>
                  <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={C.indigo} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{fontSize:11, fill:'var(--text-muted)'}} />
                <YAxis tick={{fontSize:11, fill:'var(--text-muted)'}} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="tasks" name="Tasks Created" stroke={C.indigo} fill="url(#tGrad)" strokeWidth={2.5} dot={{ r:3, fill:C.indigo }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Completion vs Creation" subtitle="Created tasks vs completed tasks per period">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{fontSize:11, fill:'var(--text-muted)'}} />
                <YAxis tick={{fontSize:11, fill:'var(--text-muted)'}} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize:'12px'}} />
                <Line type="monotone" dataKey="created"   name="Created"   stroke={C.blue}  strokeWidth={2.5} dot={{r:3}} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke={C.green} strokeWidth={2.5} dot={{r:3}} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="User Registrations" subtitle={`New users per ${period.replace('ly','')} period`}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={userRegData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{fontSize:11, fill:'var(--text-muted)'}} />
                <YAxis tick={{fontSize:11, fill:'var(--text-muted)'}} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="users" name="New Users" fill={C.teal} radius={[5,5,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Priority × Status Matrix" subtitle="Task count breakdown by priority and status">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={matrixData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="priority" tick={{fontSize:11, fill:'var(--text-muted)'}} />
                <YAxis tick={{fontSize:11, fill:'var(--text-muted)'}} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize:'12px'}} />
                <Bar dataKey="To Do"       name="To Do"        fill={C.slate}  radius={[4,4,0,0]} />
                <Bar dataKey="In Progress" name="In Progress"  fill={C.blue}   radius={[4,4,0,0]} />
                <Bar dataKey="Completed"   name="Completed"    fill={C.green}  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Distributions ── */}
        <SectionHead title="Distribution Breakdown" icon="🥧" />
        <div className="analytics-grid-3">
          <ChartCard title="Task Status" subtitle="Current status distribution">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart margin={{ top: 10, right: 50, bottom: 10, left: 50 }}>
                <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={44} paddingAngle={3} label={renderPieLabel} labelLine={false}>
                  {statusPie.map((e,i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', justifyContent:'center', gap:'12px', flexWrap:'wrap', marginTop:'8px' }}>
              {statusPie.map(e => (
                <div key={e.name} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'var(--text-secondary)' }}>
                  <span style={{ width:'10px', height:'10px', borderRadius:'50%', backgroundColor:e.color, flexShrink:0 }}/>
                  {e.name} ({e.value})
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Task Priority" subtitle="Priority level distribution">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart margin={{ top: 10, right: 50, bottom: 10, left: 50 }}>
                <Pie data={priorityPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={44} paddingAngle={3} label={renderPieLabel} labelLine={false}>
                  {priorityPie.map((e,i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', justifyContent:'center', gap:'12px', flexWrap:'wrap', marginTop:'8px' }}>
              {priorityPie.map(e => (
                <div key={e.name} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'var(--text-secondary)' }}>
                  <span style={{ width:'10px', height:'10px', borderRadius:'50%', backgroundColor:e.color, flexShrink:0 }}/>
                  {e.name} ({e.value})
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="User Roles" subtitle="Distribution of user roles">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart margin={{ top: 10, right: 50, bottom: 10, left: 50 }}>
                <Pie data={rolePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={44} paddingAngle={3} label={(props) => renderPieLabel({ ...props, withName: false })} labelLine={false}>
                  {rolePie.map((e,i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', justifyContent:'center', gap:'12px', flexWrap:'wrap', marginTop:'8px' }}>
              {rolePie.map(e => (
                <div key={e.name} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'var(--text-secondary)' }}>
                  <span style={{ width:'10px', height:'10px', borderRadius:'50%', backgroundColor:e.color, flexShrink:0 }}/>
                  {e.name} ({e.value})
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* ── Team performance ── */}
        <SectionHead title="Team Performance" icon="🏆" />
        <div className="analytics-grid-2">
          <ChartCard title="Tasks Created per User" subtitle="Top 8 task creators">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={tasksPerCreator} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{fontSize:11, fill:'var(--text-muted)'}} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{fontSize:11, fill:'var(--text-muted)'}} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Tasks Created" fill={C.violet} radius={[0,5,5,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Tasks Assigned per User" subtitle="Top 8 most assigned members">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={tasksPerAssignee} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{fontSize:11, fill:'var(--text-muted)'}} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{fontSize:11, fill:'var(--text-muted)'}} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Tasks Assigned" fill={C.blue} radius={[0,5,5,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Completion Rate by Assignee" subtitle="% of assigned tasks completed (top 8)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={completionByAssignee}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{fontSize:10, fill:'var(--text-muted)'}} />
                <YAxis tick={{fontSize:11, fill:'var(--text-muted)'}} domain={[0,100]} unit="%" />
                <Tooltip content={<CustomTooltip />} formatter={(v) => `${v}%`} />
                <Bar dataKey="rate" name="Completion Rate" radius={[5,5,0,0]}>
                  {completionByAssignee.map((e,i) => (
                    <Cell key={i} fill={e.rate >= 75 ? C.green : e.rate >= 40 ? C.amber : C.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'8px', textAlign:'center' }}>
              🟢 ≥75%  🟡 40–74%  🔴 &lt;40%
            </p>
          </ChartCard>

          <ChartCard title="Overdue Tasks per Assignee" subtitle="Members with most overdue tasks">
            {overdueByAssignee.length === 0 ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'200px', gap:'8px' }}>
                <span style={{ fontSize:'40px' }}>🎉</span>
                <p style={{ fontSize:'14px', fontWeight:'600', color:'var(--text-secondary)' }}>No overdue tasks!</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={overdueByAssignee}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{fontSize:10, fill:'var(--text-muted)'}} />
                  <YAxis tick={{fontSize:11, fill:'var(--text-muted)'}} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Overdue Tasks" fill={C.red} radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* ── Radar workload ── */}
        {radarData.length > 0 && (
          <>
            <SectionHead title="Workload Overview" icon="🕸️" />
            <ChartCard title="Team Workload Radar" subtitle="Task load comparison across top team members">
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={120}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="user" tick={{fontSize:12, fill:'var(--text-secondary)'}} />
                  <PolarRadiusAxis tick={{fontSize:10, fill:'var(--text-muted)'}} />
                  <Radar name="Total"     dataKey="Total"     stroke={C.blue}  fill={C.blue}  fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="Completed" dataKey="Completed" stroke={C.green} fill={C.green} fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="Pending"   dataKey="Pending"   stroke={C.amber} fill={C.amber} fillOpacity={0.1}  strokeWidth={2} />
                  <Legend wrapperStyle={{fontSize:'12px'}} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )}

        {/* ── Upcoming deadlines ── */}
        <SectionHead title="Upcoming Deadlines (Next 7 Days)" icon="⏰" />
        {upcoming.length === 0 ? (
          <div style={{ backgroundColor:'var(--bg-card)', borderRadius:'16px', padding:'32px', textAlign:'center', border:'1px solid var(--border)' }}>
            <span style={{ fontSize:'32px' }}>✅</span>
            <p style={{ fontSize:'14px', fontWeight:'600', color:'var(--text-secondary)', marginTop:'10px' }}>No tasks due in the next 7 days</p>
          </div>
        ) : (
          <div style={{ backgroundColor:'var(--bg-card)', borderRadius:'16px', border:'1px solid var(--border)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead>
                <tr style={{ backgroundColor:'var(--bg-primary)' }}>
                  {['Task','Assignees','Priority','Status','Due Date'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:'11px', fontWeight:'700', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upcoming.map((t,i) => {
                  const due  = new Date(t.dueDate);
                  const diff = Math.ceil((due - new Date()) / DAY_MS);
                  const dueColor = diff === 0 ? C.red : diff <= 2 ? C.orange : C.amber;
                  return (
                    <tr key={t.id} style={{ borderBottom: i < upcoming.length-1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-primary)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                      <td style={{ padding:'12px 16px', fontWeight:'600', color:'var(--text-primary)', maxWidth:'220px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</td>
                      <td style={{ padding:'12px 16px', color:'var(--text-secondary)' }}>{(t.assignees||[]).map(a=>a.name).join(', ') || '—'}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:'11px', fontWeight:'700', padding:'3px 8px', borderRadius:'20px', backgroundColor:`${priorityColor[t.priority]}18`, color:priorityColor[t.priority] }}>{t.priority}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:'11px', fontWeight:'600', padding:'3px 8px', borderRadius:'20px', backgroundColor:`${statusColor[t.status]}15`, color:statusColor[t.status] }}>{t.status}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ color:dueColor, fontWeight:'600' }}>{due.toLocaleDateString()}</span>
                        <span style={{ fontSize:'11px', color:dueColor, marginLeft:'6px' }}>({diff===0?'Today':`${diff}d`})</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Recent users ── */}
        <SectionHead title="Recently Registered Users" icon="🆕" />
        <div className="analytics-grid-2">
          {recentUsers.map(u => (
            <div key={u.id} style={{ backgroundColor:'var(--bg-card)', borderRadius:'12px', padding:'14px 18px', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'50%', backgroundColor:PIE_COLORS[u.id % PIE_COLORS.length], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'800', color:'#fff', flexShrink:0, textTransform:'uppercase' }}>
                {u.name?.charAt(0) || '?'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:'13px', fontWeight:'600', color:'var(--text-primary)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</p>
                <p style={{ fontSize:'11px', color:'var(--text-muted)', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'3px', flexShrink:0 }}>
                <span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 7px', borderRadius:'20px', backgroundColor:`${PIE_COLORS[0]}15`, color:PIE_COLORS[0] }}>{u.role === 'ProjectManager' ? 'PM' : u.role}</span>
                <span style={{ fontSize:'10px', color: u.isActive ? C.green : C.red, fontWeight:'600' }}>{u.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop:'40px', paddingTop:'20px', borderTop:'1px solid var(--border)', textAlign:'center' }}>
          <p style={{ fontSize:'12px', color:'var(--text-muted)' }}>
            Planora Analytics · Admin Only · Generated {new Date().toLocaleString()} · No sensitive data (passwords) included in exports
          </p>
        </div>
      </div>
    </Layout>
  );
}