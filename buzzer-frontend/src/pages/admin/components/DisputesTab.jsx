import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import api from '../../../api/client';

export default function DisputesTab() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['stuckOrders'],
    queryFn: () => api.get('/admin/orders/stuck')
  });

  const markAbsconded = useMutation({
    mutationFn: (orderId) => api.post(`/admin/orders/${orderId}/mark-absconded`),
    onSuccess: (res) => {
      Swal.fire('Success', `Shop compensated with ₹${res.compensation}. Partner suspended.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['stuckOrders'] });
    },
    onError: (err) => {
      Swal.fire('Error', err.error || err.message, 'error');
    }
  });

  const handleMarkAbsconded = (order) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "WARNING: Are you sure you want to mark this delivery partner as absconded? This will deduct their locked wallet deposit, compensate the shop, and SUSPEND the partner's account.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, mark absconded!'
    }).then((result) => {
      if (result.isConfirmed) {
        markAbsconded.mutate(order.id);
      }
    });
  };

  if (isLoading) return <div>Loading disputed orders...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error.message}</div>;

  const orders = data?.orders || [];

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Disputed/Stuck Orders</h3>
        <p style={{ color: '#666', margin: 0 }}>
          Orders stuck in "Picked Up" or "Pending Redelivery" states. If a delivery partner has absconded with the goods, mark them as absconded here to compensate the shop.
        </p>
      </div>

      {orders.length === 0 ? (
        <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ color: '#666', margin: 0 }}>No stuck orders found. Everything looks good!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {orders.map(o => (
            <div key={o.id} style={{
              background: '#fff',
              border: '1px solid #ddd',
              borderLeft: '4px solid #dc3545',
              borderRadius: '8px',
              padding: '15px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <strong style={{ fontSize: '1.1rem' }}>Order #{o.id}</strong>
                <span style={{ 
                  background: '#f8d7da', 
                  color: '#721c24', 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '0.8rem', 
                  fontWeight: 'bold' 
                }}>
                  {o.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <div><strong>Shop:</strong> {o.shop_name}</div>
                <div><strong>Delivery Partner:</strong> {o.delivery_partner_name}</div>
                <div><strong>Items Total:</strong> ₹{o.items_total}</div>
                <div>
                  <strong>Locked Deposit %:</strong> {(o.locked_deposit_percentage * 100).toFixed(0)}% <br/>
                  <span style={{ color: '#28a745', fontSize: '0.9rem' }}>
                    (Compensation: ₹{(o.items_total * o.locked_deposit_percentage).toFixed(2)})
                  </span>
                </div>
                <div><strong>Payment Mode:</strong> {o.is_cash_on_delivery ? (o.payment_mode || 'wallet_settlement') : 'Prepaid'}</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button 
                  onClick={() => handleMarkAbsconded(o)}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                  disabled={markAbsconded.isLoading}
                >
                  {markAbsconded.isLoading ? 'Processing...' : 'Mark as Absconded'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
