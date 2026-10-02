import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/client';


export default function WalletTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['sellerWallet'],
    queryFn: () => api.get('/seller/wallet'),
  });

  if (isLoading) return (
    <div>
      
      <div style={{ padding: '2rem', textAlign: 'center' }}>Loading wallet...</div>
    </div>
  );

  const balance = data?.balance || 0;
  const transactions = data?.transactions || [];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      
      <div className="card" style={{ textAlign: 'center', marginBottom: '20px', background: '#e9ecef' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Available Wallet Balance</h3>
        <h1 style={{ color: 'var(--primary, #0d6efd)', fontSize: '2.5rem', margin: '10px 0' }}>
          ₹{balance.toFixed(2)}
        </h1>
      </div>

      <h3 style={{ marginBottom: '15px', color: '#333' }}>Transaction History</h3>
      
      {transactions.length === 0 ? (
        <p style={{ color: '#666' }}>No transactions yet.</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px 15px' }}>Date</th>
                <th style={{ padding: '12px 15px' }}>Description</th>
                <th style={{ padding: '12px 15px' }}>Amount</th>
                <th style={{ padding: '12px 15px' }}>Balance After</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => {
                const isIncoming = tx.to_type === 'shop';
                return (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px 15px', fontSize: '0.9rem' }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 15px', fontSize: '0.9rem' }}>
                      {tx.description}
                    </td>
                    <td style={{ padding: '12px 15px', fontWeight: 'bold', color: isIncoming ? '#28a745' : '#dc3545' }}>
                      {isIncoming ? '+' : '-'}₹{tx.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 15px', color: '#666' }}>
                      ₹{tx.balance_after.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
