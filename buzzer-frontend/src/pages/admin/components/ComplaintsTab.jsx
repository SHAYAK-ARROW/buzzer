import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import api from '../../../api/client';

const styles = {
  th: { padding: '8px', background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left' },
  td: { padding: '8px', borderBottom: '1px solid #eee' },
  btn: { padding: '5px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  tabBtn: { padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
};

export default function ComplaintsTab() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState('complained'); // 'complained' or 'suspended'
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminComplaints', activeSubTab, page],
    queryFn: () => {
      const params = { is_deleted: false, page, per_page: 50 };
      if (activeSubTab === 'complained') {
        params.has_complaints = true;
      } else {
        params.is_suspended = true;
      }
      return api.get('/admin/users', { params });
    }
  });

  const toggleSuspend = useMutation({
    mutationFn: ({ userId, suspend }) => api.patch(`/admin/users/${userId}/suspend`, { suspend }),
    onSuccess: () => {
      Swal.fire('Success', 'User suspension status updated.', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const notifySuspended = useMutation({
    mutationFn: (userId) => api.post(`/admin/users/${userId}/notify`, {
      message: "Your account has been suspended by the Admin. Please contact support for more information.",
      channels: ["push"]
    }),
    onSuccess: () => Swal.fire('Success', 'Suspension notification sent.', 'success'),
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const handleNotifySuspended = async (userId) => {
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'Send suspension notification to this user?',
      icon: 'question',
      showCancelButton: true
    });
    if (confirm.isConfirmed) {
      notifySuspended.mutate(userId);
    }
  };

  const handleToggleSuspend = async (user, suspend) => {
    const action = suspend ? 'Suspend' : 'Unsuspend';
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: `${action} ${user.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: suspend ? '#dc3545' : '#1e7e34'
    });
    if (confirm.isConfirmed) {
      toggleSuspend.mutate({ userId: user.id, suspend });
    }
  };

  const handleViewComplaints = async (role, targetId) => {
    try {
      const res = await api.get('/admin/complaints', { params: { role, target_id: targetId } });
      const complaints = res.complaints || [];
      if (complaints.length === 0) return Swal.fire('Info', 'No complaints found.', 'info');

      let html = `<div style="max-height: 60vh; overflow-y: auto; text-align: left;">`;
      complaints.forEach(c => {
        const statusColor = c.status === 'resolved' ? '#1e7e34' : '#dc3545';
        html += `
          <div style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:5px; border-left: 4px solid ${statusColor};">
            <div style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">Order #${c.order_id} | Complaint #${c.id} - ${new Date(c.created_at).toLocaleString()}</div>
            <div style="margin-bottom: 5px;"><strong>Reported By:</strong> ${c.reporter_name || 'System'} (${(c.reporter_role || 'System').toUpperCase()})</div>
            <div style="margin-bottom: 5px;"><strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold">${c.status.toUpperCase()}</span></div>
            <div style="margin-bottom: 5px; background: #f8f9fa; padding: 8px; border-radius: 4px;"><strong>Reason:</strong><br>${c.reason}</div>
          </div>
        `;
      });
      html += `</div>`;

      Swal.fire({ title: `Complaints against ${role.toUpperCase()}`, html, width: 600, showCloseButton: true, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', err.error || err.message, 'error');
    }
  };

  const users = data?.users || [];

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Complaints & Suspensions</h3>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
        <button 
          style={{ ...styles.tabBtn, background: activeSubTab === 'complained' ? '#ffc107' : '#666', color: activeSubTab === 'complained' ? '#000' : '#fff' }}
          onClick={() => { setActiveSubTab('complained'); setPage(1); }}
        >
          Users with Complaints
        </button>
        <button 
          style={{ ...styles.tabBtn, background: activeSubTab === 'suspended' ? '#dc3545' : '#666', color: '#fff' }}
          onClick={() => { setActiveSubTab('suspended'); setPage(1); }}
        >
          Suspended Users
        </button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <div style={{ color: 'red' }}>Error: {error.message}</div>
      ) : activeSubTab === 'suspended' ? (
        <div>
          <h3 style={{ color: '#dc3545', borderBottom: '2px solid #dc3545', paddingBottom: '5px' }}>Suspended Users</h3>
          {users.length === 0 ? (
            <p>No suspended users found.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto', width: '100%', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={styles.th}>UID</th>
                      <th style={styles.th}>Name / Email</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ ...styles.td, fontFamily: 'monospace' }}>{u.uid}</td>
                        <td style={styles.td}>
                          <strong>{u.name}</strong><br />
                          <span style={{ color: '#666' }}>{u.email}</span>
                        </td>
                        <td style={styles.td}><strong>{u.role.toUpperCase()}</strong></td>
                        <td style={{ ...styles.td, display: 'flex', gap: '10px' }}>
                          <button style={{ ...styles.btn, background: '#0f6674', color: '#fff' }} onClick={() => handleNotifySuspended(u.id)}>
                            Notify as Suspended
                          </button>
                          <button style={{ ...styles.btn, background: '#1e7e34', color: '#fff' }} onClick={() => handleToggleSuspend(u, false)}>
                            Unsuspend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        <div>
          <h3 style={{ color: '#ffc107', borderBottom: '2px solid #ffc107', paddingBottom: '5px' }}>Users with Complaints</h3>
          {users.length === 0 ? (
            <p>No active users with complaints found.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto', width: '100%', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th style={styles.th}>UID</th>
                      <th style={styles.th}>Name / Email</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Total Complaints</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ ...styles.td, fontFamily: 'monospace' }}>{u.uid}</td>
                        <td style={styles.td}>
                          <strong>{u.name}</strong><br />
                          <span style={{ color: '#666' }}>{u.email}</span>
                        </td>
                        <td style={styles.td}><strong>{u.role.toUpperCase()}</strong></td>
                        <td style={styles.td}>
                          <span style={{ background: '#dc3545', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                            {u.complaints_count}
                          </span>
                        </td>
                        <td style={{ ...styles.td, display: 'flex', gap: '10px' }}>
                          <button style={{ ...styles.btn, background: '#0f6674', color: '#fff' }} onClick={() => handleViewComplaints(u.role, u.id)}>
                            View Complaints
                          </button>
                          <button style={{ ...styles.btn, background: '#dc3545', color: '#fff' }} onClick={() => handleToggleSuspend(u, true)}>
                            Suspend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pagination */}
      {data?.pagination && data.pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
          <button 
            style={{...styles.btn, background: page > 1 ? '#0d6efd' : '#e9ecef', color: page > 1 ? '#fff' : '#aaa', cursor: page > 1 ? 'pointer' : 'not-allowed'}}
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            &laquo; Previous
          </button>
          <span style={{ fontSize: '0.9rem', color: '#555' }}>
            Page <strong>{data.pagination.page}</strong> of <strong>{data.pagination.pages}</strong> (Total {data.pagination.total})
          </span>
          <button 
            style={{...styles.btn, background: page < data.pagination.pages ? '#0d6efd' : '#e9ecef', color: page < data.pagination.pages ? '#fff' : '#aaa', cursor: page < data.pagination.pages ? 'pointer' : 'not-allowed'}}
            disabled={page >= data.pagination.pages}
            onClick={() => setPage(p => p + 1)}
          >
            Next &raquo;
          </button>
        </div>
      )}
    </div>
  );
}
