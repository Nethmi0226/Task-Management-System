import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../components/layout/Layout.jsx';
import Avatar from '../components/common/Avatar.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import api from '../api/axios.js';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import './TaskDetailPage.css';

const priorityColor = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
const statusColor   = { 'To Do': '#6b7280', 'In Progress': '#3b9eed', Completed: '#10b981' };
const typeIcon      = { 'image/jpeg': '🖼️', 'image/png': '🖼️', 'image/gif': '🖼️', 'application/pdf': '📄', 'video/mp4': '🎥', default: '📎' };
const getFileIcon   = (type) => typeIcon[type] || typeIcon.default;
const fmtSize       = (bytes) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024*1024)).toFixed(1)} MB`;
const COMMENT_FILTERS = ['All', 'Recent', 'Old', 'With Attachments', 'Edited', 'Mine'];

const safeDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};
const formatRelative = (value) => {
  const date = safeDate(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : '—';
};
const formatDisplayDate = (value) => {
  const date = safeDate(value);
  return date ? date.toLocaleDateString() : '—';
};

export default function TaskDetailPage() {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [task,        setTask]        = useState(null);
  const [comments,    setComments]    = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [updating,    setUpdating]    = useState(false);

  const [commentText,    setCommentText]    = useState('');
  const [commentFile,    setCommentFile]    = useState(null);
  const [postingComment, setPostingComment] = useState(false);
  const commentFileRef = useRef();

  const [editingComment, setEditingComment] = useState(null);
  const [editContent,    setEditContent]    = useState('');
  const [uploadingFile,  setUploadingFile]  = useState(false);
  const [commentFilter,  setCommentFilter]  = useState('All');

  // Member management state
  const [showMemberPanel,  setShowMemberPanel]  = useState(false);
  const [teamUsers,        setTeamUsers]        = useState([]);
  const [memberSearch,     setMemberSearch]     = useState('');
  const [addingMember,     setAddingMember]     = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const taskRes = await api.get(`/tasks/${id}`);
      setTask(taskRes.data.task || taskRes.data || null);
    } catch (e) {
      const status = e.response?.status;
      if (status === 403) toast.error('You do not have permission to view this task');
      else if (status === 404) toast.error('Task not found');
      else toast.error('Failed to load task details');
      setLoading(false);
      return;
    }
    try {
      const [commentsRes, attachmentsRes] = await Promise.all([
        api.get(`/comments/${id}`),
        api.get(`/attachments/${id}`)
      ]);
      setComments(commentsRes.data.comments || commentsRes.data || []);
      setAttachments(attachmentsRes.data.attachments || attachmentsRes.data || []);
    } catch (e) {
      console.error('Failed to load comments/attachments', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Permission helpers ─────────────────────────────
  const isAdmin       = user?.role === 'Admin';
  const isPM          = user?.role === 'ProjectManager';
  const isAdminOrPM   = isAdmin || isPM;
  const isAssignee    = task?.assignees?.some(a => a.id === user?.id);
  const isTaskCreator = task?.creator?.id === user?.id || task?.createdBy === user?.id;

  // Admin: full access. PM: only own tasks
  const canEdit       = isAdmin || (isPM && isTaskCreator);
  const canDelete     = isAdmin || (isPM && isTaskCreator);
  const canManageMembers = isAdmin || (isPM && isTaskCreator);
  const canUpload     = isAdminOrPM || isAssignee;
  const canDeleteAny  = isAdminOrPM;

  // ── Status update ──────────────────────────────────
  const updateStatus = async (newStatus) => {
    if (task.status === newStatus) return;
    setUpdating(true);
    try {
      await api.put(`/tasks/${id}`, { status: newStatus });
      toast.success(`Status updated to "${newStatus}"`);
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.description || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  // ── Delete task ────────────────────────────────────
  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted successfully');
      navigate('/tasks');
    } catch (e) {
      toast.error(e.response?.data?.description || 'Failed to delete task');
    }
  };

  // ── Member management ──────────────────────────────
  const openMemberPanel = async () => {
    setShowMemberPanel(true);
    try {
      const endpoint = isAdmin ? '/users?status=active' : '/users/team';
      const res = await api.get(endpoint);
      setTeamUsers(res.data.users || []);
    } catch (e) {
      toast.error('Failed to load users');
    }
  };

  const handleAddMember = async (userId) => {
    setAddingMember(true);
    try {
      await api.post(`/tasks/${id}/members`, { userIds: [userId] });
      toast.success('Member added to task');
      fetchAll();
      // Refresh team list
      const endpoint = isAdmin ? '/users?status=active' : '/users/team';
      const res = await api.get(endpoint);
      setTeamUsers(res.data.users || []);
    } catch (e) {
      toast.error(e.response?.data?.description || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    setRemovingMemberId(userId);
    try {
      await api.delete(`/tasks/${id}/members/${userId}`);
      toast.success('Member removed from task');
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.description || 'Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  // ── Comment handlers ───────────────────────────────
  const handlePostComment = async () => {
    if (!commentText.trim() && !commentFile) {
      toast.error('Please enter a comment or attach a file');
      return;
    }
    setPostingComment(true);
    try {
      const fd = new FormData();
      fd.append('content', commentText.trim() || ' ');
      if (commentFile) fd.append('file', commentFile);
      await api.post(`/comments/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Comment posted');
      setCommentText('');
      setCommentFile(null);
      if (commentFileRef.current) commentFileRef.current.value = '';
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.description || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleSaveEdit = async (commentId) => {
    if (!editContent.trim()) { toast.error('Comment cannot be empty'); return; }
    try {
      await api.put(`/comments/${commentId}`, { content: editContent });
      toast.success('Comment updated');
      setEditingComment(null);
      setEditContent('');
      fetchAll();
    } catch (e) {
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/comments/${commentId}`);
      toast.success('Comment deleted');
      fetchAll();
    } catch (e) {
      toast.error('Failed to delete comment');
    }
  };

  // ── Attachment handlers ────────────────────────────
  const handleUploadAttachment = async (file) => {
    if (!file) return;
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/attachments/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('File uploaded successfully');
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.description || 'Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleReplaceAttachment = async (attachmentId, file) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.put(`/attachments/${attachmentId}/replace`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('File replaced');
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.description || 'Replace failed');
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Delete this attachment permanently?')) return;
    try {
      await api.delete(`/attachments/${attachmentId}`);
      toast.success('Attachment deleted');
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.description || 'Delete failed');
    }
  };

  const downloadBlob = (data, fileName) => {
    const url  = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href  = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadAttachment = async (attachmentId, fileName) => {
    try {
      const res = await api.get(`/attachments/download/${attachmentId}`, { responseType: 'blob' });
      downloadBlob(res.data, fileName);
    } catch (e) {
      toast.error('Download failed');
    }
  };

  const handleDownloadCommentAttachment = async (commentId, fileName) => {
    try {
      const res = await api.get(`/comments/download/${commentId}`, { responseType: 'blob' });
      downloadBlob(res.data, fileName);
    } catch (e) {
      toast.error('Download failed');
    }
  };

  // ── Comment filtering ──────────────────────────────
  const filteredComments = [...comments]
    .filter(c => {
      if (commentFilter === 'With Attachments') return !!c.commentFileName;
      if (commentFilter === 'Edited')           return c.isEdited;
      if (commentFilter === 'Mine')             return c.author?.id === user?.id;
      return true;
    })
    .sort((a, b) => {
      if (commentFilter === 'Recent') return new Date(b.createdAt) - new Date(a.createdAt);
      if (commentFilter === 'Old')    return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  // ── Team users filtered by search, excluding existing assignees ──
  const existingAssigneeIds = task?.assignees?.map(a => a.id) || [];
  const filteredTeamUsers = teamUsers.filter(u =>
    !existingAssigneeIds.includes(u.id) &&
    (u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
     u.email.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  if (loading) return <Layout><LoadingSpinner /></Layout>;
  if (!task)   return <Layout><div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Task not found.</div></Layout>;

  return (
    <Layout>
      <div className="task-detail-page" style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <button onClick={() => navigate('/tasks')} className="icon-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: '6px 10px', borderRadius: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to Tasks
          </button>
          <span style={{ color: 'var(--border)', fontSize: '14px' }}>/</span>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.title}
          </span>
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: '20px', alignItems: 'start' }}>

          {/* ════ LEFT COLUMN ════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Task header */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, lineHeight: 1.3, flex: 1 }}>
                  {task.title}
                </h1>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', backgroundColor: `${priorityColor[task.priority]}18`, color: priorityColor[task.priority], textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {task.priority}
                  </span>
                  {/* Edit button — only shown when user has permission */}
                  {canEdit && (
                    <button onClick={() => navigate(`/tasks/edit/${id}`)}
                      style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      Edit
                    </button>
                  )}
                  {/* Delete button — only shown when user has permission */}
                  {canDelete && (
                    <button onClick={handleDeleteTask}
                      style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0 }}>
                {task.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description provided.</span>}
              </p>

              {task.assignees?.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Assigned to:</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {task.assignees.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: 'var(--bg-primary)', borderRadius: '20px', padding: '3px 10px 3px 4px', border: '1px solid var(--border)' }}>
                        <Avatar name={a.name} size={20} />
                        <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-primary)' }}>{a.name}</span>
                        {/* Remove member button — only for users with canManageMembers */}
                        {canManageMembers && (
                          <button
                            onClick={() => handleRemoveMember(a.id)}
                            disabled={removingMemberId === a.id}
                            title={`Remove ${a.name}`}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 0 0 4px', fontSize: '14px', lineHeight: 1, display: 'flex', alignItems: 'center', opacity: removingMemberId === a.id ? 0.5 : 1 }}>
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show add member when no assignees */}
              {(!task.assignees || task.assignees.length === 0) && canManageMembers && (
                <div style={{ marginTop: '12px' }}>
                  <button onClick={openMemberPanel}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px dashed var(--accent)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    + Assign Members
                  </button>
                </div>
              )}
            </div>

            {/* Task Attachments */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={sectionTitle}>
                  Attachments
                  <span style={countBadge}>{attachments.length}</span>
                </h3>
                {canUpload && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: uploadingFile ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: uploadingFile ? 'not-allowed' : 'pointer' }}>
                    {uploadingFile ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><LoadingSpinner size={14} /> Uploading...</span> : '+ Upload File'}
                    <input type="file" style={{ display: 'none' }} disabled={uploadingFile}
                      onChange={e => { const f = e.target.files[0]; if (f) { handleUploadAttachment(f); e.target.value = ''; } }} />
                  </label>
                )}
              </div>

              {attachments.length === 0 ? (
                <div style={emptyState}>
                  <span style={{ fontSize: '32px' }}>📂</span>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0' }}>
                    {canUpload ? 'No files yet. Click Upload File to add one.' : 'No attachments yet.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                  {attachments.map(att => {
                    const canEditAtt = isAdminOrPM || att.uploader?.id === user?.id;
                    return (
                      <div key={att.id} className="att-row"
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border)', transition: 'background-color 0.15s' }}>
                        <span style={{ fontSize: '20px', flexShrink: 0 }}>{getFileIcon(att.fileType)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.fileName}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                            {fmtSize(att.fileSize)} · {att.uploader?.name} · {new Date(att.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button onClick={() => handleDownloadAttachment(att.id, att.fileName)} style={linkBtn}>Download</button>
                          {canEditAtt && (
                            <>
                              <label style={{ ...linkBtn, cursor: 'pointer' }}>
                                Replace
                                <input type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) { handleReplaceAttachment(att.id, f); e.target.value = ''; } }} />
                              </label>
                              <button onClick={() => handleDeleteAttachment(att.id)} style={{ ...linkBtn, color: '#ef4444' }}>Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Discussion */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={sectionTitle}>
                  Discussion
                  <span style={countBadge}>{comments.length}</span>
                </h3>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', padding: '3px' }}>
                  {COMMENT_FILTERS.map(f => (
                    <button key={f} className="filter-btn" onClick={() => setCommentFilter(f)}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: '600', cursor: 'pointer', backgroundColor: commentFilter === f ? 'var(--accent)' : 'transparent', color: commentFilter === f ? '#fff' : 'var(--text-muted)' }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment input */}
              <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)', padding: '14px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Avatar name={user?.name || ''} size={32} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea className="task-detail-textarea" value={commentText} onChange={e => setCommentText(e.target.value)}
                      placeholder="Write a comment... (emoji supported, Ctrl+Enter to send)"
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handlePostComment(); }}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', resize: 'none', minHeight: '72px', boxSizing: 'border-box', lineHeight: '1.5', transition: 'border-color 0.2s', fontFamily: 'inherit' }} />
                    {commentFile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--accent-light)', borderRadius: '8px', padding: '8px 12px', border: '1px solid var(--border)' }}>
                        <span>{getFileIcon(commentFile.type)}</span>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{commentFile.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmtSize(commentFile.size)}</span>
                        <button onClick={() => { setCommentFile(null); if (commentFileRef.current) commentFileRef.current.value = ''; }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: 0, lineHeight: 1, flexShrink: 0 }}>x</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)', padding: '6px 10px', borderRadius: '7px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                        Attach file
                        <input ref={commentFileRef} type="file" style={{ display: 'none' }} onChange={e => setCommentFile(e.target.files[0] || null)} />
                      </label>
                      <button onClick={handlePostComment} disabled={postingComment}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: postingComment ? 'var(--text-muted)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: postingComment ? 'not-allowed' : 'pointer' }}>
                        {postingComment ? <LoadingSpinner size={16} /> : 'Post'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '480px', overflowY: 'auto' }}>
                {filteredComments.length === 0 ? (
                  <div style={emptyState}>
                    <span style={{ fontSize: '28px' }}>💬</span>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0' }}>
                      {commentFilter === 'All' ? 'No comments yet. Be the first to comment!' : `No comments match "${commentFilter}"`}
                    </p>
                  </div>
                ) : (
                  filteredComments.map(c => {
                    const isOwn     = c.author?.id === user?.id;
                    const canDelCmt = isOwn || canDeleteAny;
                    const canEditCmt = isOwn;
                    const isEditing = editingComment === c.id;
                    return (
                      <div key={c.id} className="cmt-box"
                        style={{ padding: '14px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', border: `1px solid ${isOwn ? 'var(--accent-light)' : 'var(--border)'}`, transition: 'border-color 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Avatar name={c.author?.name || '?'} size={28} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{c.author?.name}</span>
                                {isOwn && <span style={{ fontSize: '10px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '4px', padding: '1px 5px', fontWeight: '600' }}>You</span>}
                                <span style={{ fontSize: '10px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', borderRadius: '4px', padding: '1px 5px' }}>{c.author?.role}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatRelative(c.createdAt)}</span>
                                {c.isEdited && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>edited</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            {canEditCmt && !isEditing && (
                              <button onClick={() => { setEditingComment(c.id); setEditContent(c.content); }} style={actionBtn}>Edit</button>
                            )}
                            {isEditing && (
                              <>
                                <button onClick={() => handleSaveEdit(c.id)} style={{ ...actionBtn, color: '#10b981', fontWeight: '700' }}>Save</button>
                                <button onClick={() => { setEditingComment(null); setEditContent(''); }} style={{ ...actionBtn, color: 'var(--text-muted)' }}>Cancel</button>
                              </>
                            )}
                            {canDelCmt && !isEditing && (
                              <button onClick={() => handleDeleteComment(c.id)} style={{ ...actionBtn, color: '#ef4444' }}>Delete</button>
                            )}
                          </div>
                        </div>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea className="task-detail-textarea" value={editContent} onChange={e => setEditContent(e.target.value)}
                              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', minHeight: '72px', boxSizing: 'border-box', lineHeight: '1.5', fontFamily: 'inherit' }} />
                            {c.commentFileName && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{getFileIcon(c.commentFileType)} {c.commentFileName}</span>
                                <button onClick={async () => { try { await api.delete(`/comments/${c.id}/attachment`); toast.success('Attachment removed'); fetchAll(); } catch (e) { toast.error('Failed to remove attachment'); } }}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', fontWeight: '500' }}>Remove attachment</button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.content}</p>
                        )}
                        {c.commentFileName && !isEditing && (
                          <button onClick={() => handleDownloadCommentAttachment(c.id, c.commentFileName)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '6px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--accent)', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                            {getFileIcon(c.commentFileType)} {c.commentFileName}
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({fmtSize(c.commentFileSize || 0)})</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ════ RIGHT COLUMN ════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Status */}
            <div style={card}>
              <h3 style={{ ...sectionTitle, marginBottom: '14px' }}>Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['To Do', 'In Progress', 'Completed'].map(s => (
                  <button key={s} className="status-btn" disabled={updating}
                    onClick={() => updateStatus(s)}
                    style={{ textAlign: 'left', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid', borderColor: task.status === s ? statusColor[s] : 'var(--border)', backgroundColor: task.status === s ? `${statusColor[s]}15` : 'transparent', color: task.status === s ? statusColor[s] : 'var(--text-primary)', fontSize: '13px', fontWeight: task.status === s ? '700' : '400', cursor: updating ? 'not-allowed' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor[s], flexShrink: 0 }} />
                    {s}
                    {task.status === s && (
                      <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div style={card}>
              <h3 style={{ ...sectionTitle, marginBottom: '14px' }}>Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Created by', value: task.creator?.name },
                  { label: 'Priority', value: <span style={{ color: priorityColor[task.priority], fontWeight: '600' }}>{task.priority}</span> },
                  { label: 'Due Date', value: task.dueDate ? (() => {
                    const due  = new Date(task.dueDate);
                    const diff = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24));
                    const col  = diff < 0 ? '#ef4444' : diff <= 3 ? '#f59e0b' : 'var(--text-primary)';
                    return <span style={{ color: col, fontWeight: '500' }}>{due.toLocaleDateString()}{diff < 0 ? ' (Overdue)' : diff === 0 ? ' (Today)' : diff <= 3 ? ` (${diff}d left)` : ''}</span>;
                  })() : 'Not set' },
                  { label: 'Created',      value: formatRelative(task.createdAt) },
                  { label: 'Last updated', value: formatRelative(task.updatedAt) },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>{row.label}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', textAlign: 'right' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignees */}
            {task.assignees?.length > 0 && (
              <div style={card}>
                <h3 style={{ ...sectionTitle, marginBottom: '14px' }}>
                  Assignees
                  <span style={countBadge}>{task.assignees.length}</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {task.assignees.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Avatar name={a.name} size={30} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>{a.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{a.role}</p>
                      </div>
                      {canManageMembers && (
                        <button onClick={() => handleRemoveMember(a.id)} disabled={removingMemberId === a.id}
                          title="Remove member"
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '4px 6px', borderRadius: '6px', opacity: removingMemberId === a.id ? 0.5 : 1 }}>
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {canManageMembers && (
                  <button onClick={openMemberPanel}
                    style={{ marginTop: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px dashed var(--accent)', borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    + Add Member
                  </button>
                )}
              </div>
            )}

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ ...card, textAlign: 'center', padding: '16px' }}>
                <p style={{ fontSize: '22px', fontWeight: '700', color: 'var(--accent)', margin: '0 0 4px' }}>{comments.length}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Comments</p>
              </div>
              <div style={{ ...card, textAlign: 'center', padding: '16px' }}>
                <p style={{ fontSize: '22px', fontWeight: '700', color: '#10b981', margin: '0 0 4px' }}>{attachments.length}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Files</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════ Add Member Panel (slide-in overlay) ════ */}
      {showMemberPanel && (
        <div onClick={() => setShowMemberPanel(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '420px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Add Members</h3>
              <button onClick={() => setShowMemberPanel(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>×</button>
            </div>

            {/* Search input */}
            <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search by name or email..."
              style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />

            {/* User list */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTeamUsers.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}>
                  {memberSearch ? 'No users match your search' : 'All available users are already assigned'}
                </p>
              ) : (
                filteredTeamUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}>
                    <Avatar name={u.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>{u.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email} · {u.role}</p>
                    </div>
                    <button onClick={() => handleAddMember(u.id)} disabled={addingMember}
                      style={{ padding: '6px 14px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: addingMember ? 'not-allowed' : 'pointer', opacity: addingMember ? 0.7 : 1, flexShrink: 0 }}>
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>

            <button onClick={() => setShowMemberPanel(false)}
              style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              Done
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

const card = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: '14px',
  padding: '20px',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)'
};
const sectionTitle = {
  fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)',
  margin: 0, display: 'flex', alignItems: 'center', gap: '6px'
};
const countBadge = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: '20px', height: '20px', backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border)', borderRadius: '20px',
  fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', padding: '0 6px'
};
const linkBtn = {
  background: 'none', border: 'none', color: 'var(--accent)',
  fontSize: '11px', fontWeight: '500', cursor: 'pointer',
  padding: '4px 6px', borderRadius: '5px',
  display: 'inline-flex', alignItems: 'center', gap: '3px'
};
const actionBtn = {
  background: 'none', border: 'none', fontSize: '11px',
  fontWeight: '500', cursor: 'pointer', padding: '4px 8px',
  borderRadius: '6px', color: 'var(--text-muted)'
};
const emptyState = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: '32px', textAlign: 'center'
};