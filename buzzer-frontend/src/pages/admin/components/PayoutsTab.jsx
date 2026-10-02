import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import api from '../../../api/client';

const styles = {
  th: { padding: '10px', background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', borderBottom: '1px solid #eee' },
  btn: { padding: '5px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }
};

export default function PayoutsTab() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminPayouts'],
    queryFn: () => api.get('/admin/withdrawals')
  });

  const updateWithdrawal = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/withdrawals/${id}`, { status }),
    onSuccess: (_, variables) => {
      Swal.fire('Success', `Request marked as ${variables.status}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['adminPayouts'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const handleUpdate = async (id, status) => {
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: `Mark this request as ${status}?`,
      icon: 'question',
      showCancelButton: true
    });
    if (confirm.isConfirmed) {
      updateWithdrawal.mutate({ id, status });
    }
  };

  if (isLoading) return <p>Loading payouts...</p>;
  if (error) return <div style={{ color: 'red' }}>Error: {error.message}</div>;

  const withdrawals = data?.withdrawals || [];

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Payout Requests</h3>
      
      {withdrawals.length === 0 ? (
        <p>No payout requests found.</p>
      ) : (
        <div style={{ overflowX: 'auto', width: '100%', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Details</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map(w => (
                <tr key={w.id}>
                  <td style={styles.td}>{new Date(w.created_at).toLocaleString()}</td>
                  <td style={styles.td}>{w.user_name}</td>
                  <td style={styles.td}>{w.user_role}</td>
                  <td style={styles.td}>₹{w.amount}</td>
                  <td style={styles.td}>{w.payment_details}</td>
                  <td style={styles.td}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', color: '#fff',
                      background: w.status === 'pending' ? '#ffc107' : w.status === 'paid' ? '#198754' : '#dc3545'
                    }}>
                      {w.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...styles.td, display: 'flex', gap: '5px' }}>
                    {w.status === 'pending' ? (
                      <>
                        <button style={{ ...styles.btn, background: '#198754', color: '#fff' }} onClick={() => handleUpdate(w.id, 'paid')}>Mark Paid</button>
                        <button style={{ ...styles.btn, background: '#6c757d', color: '#fff' }} onClick={() => handleUpdate(w.id, 'rejected')}>Reject</button>
                      </>
                    ) : w.resolved_at ? (
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(w.resolved_at).toLocaleString()}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
