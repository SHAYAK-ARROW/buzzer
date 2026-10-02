import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/client';

const styles = {
  th: { padding: '10px', background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', borderBottom: '1px solid #eee' }
};

export default function AuditLogsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: () => api.get('/admin/audit-logs')
  });

  if (isLoading) return <div>Loading audit logs...</div>;
  if (error) return <div style={{color: 'red'}}>Error loading logs: {error.message}</div>;

  const logs = data?.logs || [];

  return (
    <div>
      <h3 style={{marginTop: 0, marginBottom: '20px'}}>Admin Action Audit Logs</h3>
      
      {logs.length === 0 ? (
        <p>No logs found.</p>
      ) : (
        <div style={{ overflowX: 'auto', width: '100%', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Admin</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={styles.td}>{new Date(l.created_at).toLocaleString()}</td>
                  <td style={styles.td}>{l.admin_name} <span style={{color:'#666'}}>(#{l.admin_id})</span></td>
                  <td style={styles.td}>
                    <span style={{background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem'}}>
                      {l.action}
                    </span>
                  </td>
                  <td style={styles.td}>{l.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
