import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '../../components/Navbar';
import api from '../../api/client';
import Swal from 'sweetalert2';

export default function BuyerWallet() {
  const queryClient = useQueryClient();
  const [topupAmount, setTopupAmount] = useState('');

  const { data: authData, isLoading } = useQuery({
    queryKey: ['authMe'],
    queryFn: () => api.get('/auth/me'),
  });

  const topupMutation = useMutation({
    mutationFn: (amount) => api.post('/wallet/topup', { amount: parseFloat(amount) }),
    onSuccess: (res) => {
      Swal.fire('Success', res.message || 'Wallet topped up!', 'success');
      setTopupAmount('');
      queryClient.invalidateQueries(['authMe']);
    },
    onError: (err) => Swal.fire('Error', err.response?.data?.message || err.message || 'Topup failed', 'error')
  });

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '50px' }}>
      <Navbar />
      <div style={{ width: '95%', maxWidth: '800px', margin: '2rem auto' }}>
        <h2>My Wallet</h2>
        
        {isLoading ? (
          <p>Loading wallet...</p>
        ) : (
          <>
            <div style={{ background: '#e9ecef', padding: '2rem', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#666' }}>Available Balance</h3>
              <h1 style={{ color: 'var(--primary)', fontSize: '3rem', margin: '10px 0' }}>
                &#2547; {authData?.user?.wallet_balance?.toFixed(2) || '0.00'}
              </h1>
            </div>

            <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h3>Add Money to Wallet (Demo)</h3>
              <p style={{ color: '#666', marginBottom: '15px' }}>Enter amount to instantly add to your wallet balance.</p>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="number" 
                  value={topupAmount} 
                  onChange={e => setTopupAmount(e.target.value)} 
                  placeholder="Amount in BDT" 
                  style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} 
                />
                <button 
                  className="btn" 
                  disabled={!topupAmount || topupMutation.isPending}
                  onClick={() => topupMutation.mutate(topupAmount)}
                >
                  {topupMutation.isPending ? 'Processing...' : 'Top Up'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
