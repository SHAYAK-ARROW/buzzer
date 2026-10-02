import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../../components/Navbar';
import DeliveryTabs from './DeliveryTabs';
import api from '../../api/client';

export default function DeliveryWallet() {
  const { data, isLoading } = useQuery({
    queryKey: ['deliveryWallet'],
    queryFn: () => api.get('/delivery/wallet'),
  });

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '50px' }}>
      <Navbar />
      <DeliveryTabs />
      
      <div style={{ width: '95%', maxWidth: '1600px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h2 style={{ marginBottom: '20px' }}>Delivery Wallet</h2>

        {isLoading ? (
          <p>Loading your wallet...</p>
        ) : (
          <>
            <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Your Balance</h3>
              <h1 style={{ margin: 0, fontSize: '3rem', color: data?.wallet_balance < 0 ? '#dc3545' : 'var(--primary)' }}>
                ₹{data?.wallet_balance?.toFixed(2) || '0.00'}
              </h1>
              {data?.wallet_balance < 0 && (
                <p style={{ color: '#dc3545', fontWeight: 'bold', marginTop: '10px' }}>
                  You owe money to the platform (from COD orders). Please settle your balance.
                </p>
              )}
            </div>

            <h3 style={{ marginBottom: '15px' }}>Transaction History</h3>
            
            {!data?.transactions || data.transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px' }}>
                <p style={{ color: '#666' }}>No transactions yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.transactions.map((tx) => {
                  const isIncoming = tx.to_type === 'delivery_partner' && tx.to_id === data.user_id; // approximate check
                  // Wait, backend response already tells us amount sign logic implicitly, or we can just check if amount > 0 if the API signs it?
                  // Actually the API doesn't sign it. Let's just determine color by from/to.
                  // Since we are the delivery partner, if to_type == 'delivery_partner', we got money (+)
                  const isMoneyIn = tx.to_type === 'delivery_partner';

                  return (
                    <div key={tx.id} style={{ background: '#fff', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${isMoneyIn ? '#28a745' : '#dc3545'}` }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{tx.transaction_type.replace(/_/g, ' ').toUpperCase()}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>{new Date(tx.created_at).toLocaleString()}</div>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: isMoneyIn ? '#28a745' : '#dc3545' }}>
                        {isMoneyIn ? '+' : '-'}₹{tx.amount.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
