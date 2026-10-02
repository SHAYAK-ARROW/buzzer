import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/client';

const styles = {
  th: { padding: '10px', background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', borderBottom: '1px solid #eee' }
};

export default function TransactionsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminTransactions'],
    queryFn: () => api.get('/admin/transactions')
  });

  if (isLoading) return <div>Loading transactions...</div>;
  if (error) return <div style={{color: 'red'}}>Error loading transactions: {error.message}</div>;

  const transactions = data?.transactions || [];

  return (
    <div>
      <h3 style={{marginTop: 0, marginBottom: '20px'}}>System Wallet Transactions</h3>
      
      {transactions.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        <div style={{ overflowX: 'auto', width: '100%', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={styles.th}>ID & UID</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Type / Description</th>
                <th style={styles.th}>From &rarr; To</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Balance After</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td style={styles.td}>
                    <strong>#{t.id}</strong><br/>
                    <span style={{fontFamily: 'monospace', fontSize: '0.8rem', background: '#eee', padding: '2px 4px', borderRadius: '4px'}}>
                      UID: {t.uid}
                    </span>
                  </td>
                  <td style={styles.td}>{new Date(t.created_at).toLocaleString()}</td>
                  <td style={styles.td}>
                    <strong>{t.transaction_type}</strong><br/>
                    <span style={{color: '#555', fontSize: '0.85rem'}}>
                      {t.description || (t.order_id ? `Order #${t.order_id}` : '-')}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      <span style={{background: '#f8d7da', color: '#721c24', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', width: 'fit-content', fontSize: '0.8rem'}}>
                        Out: {t.from_type} ({t.from_id})
                      </span>
                      <span style={{background: '#d4edda', color: '#155724', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', width: 'fit-content', fontSize: '0.8rem'}}>
                        In: {t.to_type} ({t.to_id})
                      </span>
                    </div>
                  </td>
                  <td style={{...styles.td, fontWeight: 'bold', color: '#0d6efd'}}>
                    ₹{t.amount?.toFixed(2)}
                  </td>
                  <td style={{...styles.td, color: '#666', fontSize: '0.85rem'}}>
                    {t.balance_after !== null && t.balance_after !== undefined ? `₹${Number(t.balance_after).toFixed(2)}` : '-'}
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
