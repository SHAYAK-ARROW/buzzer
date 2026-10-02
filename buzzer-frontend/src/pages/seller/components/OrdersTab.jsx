import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import Swal from 'sweetalert2';

export default function OrdersTab() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('Pending');
  // Track which items are unchecked (unavailable) per order
  const [uncheckedItems, setUncheckedItems] = useState({}); // { [orderId]: Set of item ids }

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sellerOrders'],
    queryFn: () => api.get('/seller/orders?page=1&limit=50'),
    refetchInterval: 30000, // auto refresh every 30s
  });

  const invalidate = () => {
    queryClient.invalidateQueries(['sellerOrders']);
    queryClient.invalidateQueries(['sellerWallet']);
  };

  const confirmAllMutation = useMutation({
    mutationFn: (orderId) => api.patch(`/seller/orders/${orderId}/confirm-all`),
    onSuccess: () => { invalidate(); Swal.fire('Success', 'Order accepted!', 'success'); },
    onError: (err) => Swal.fire('Error', err.error || 'Action failed', 'error')
  });

  const markUnavailableMutation = useMutation({
    mutationFn: ({ orderId, unavailableIds }) =>
      api.patch(`/seller/orders/${orderId}/mark-unavailable`, { unavailable_item_ids: unavailableIds }),
    onSuccess: (_, { orderId }) => {
      invalidate();
      setUncheckedItems(prev => { const n = { ...prev }; delete n[orderId]; return n; });
      Swal.fire('Done', 'Availability updated. Awaiting buyer decision or cancelled if all unavailable.', 'success');
    },
    onError: (err) => Swal.fire('Error', err.error || 'Action failed', 'error')
  });

  const markReadyMutation = useMutation({
    mutationFn: (orderId) => api.patch(`/seller/orders/${orderId}/ready`),
    onSuccess: () => { invalidate(); Swal.fire('Success', 'Order marked as Ready!', 'success'); },
    onError: (err) => Swal.fire('Error', err.error || 'Action failed', 'error')
  });

  const selfDeliverMutation = useMutation({
    mutationFn: ({ orderId, status }) =>
      api.patch(`/seller/orders/${orderId}/self-deliver-status`, { status }),
    onSuccess: () => { invalidate(); },
    onError: (err) => Swal.fire('Error', err.error || 'Action failed', 'error')
  });

  const approveShortMutation = useMutation({
    mutationFn: (orderId) => api.post(`/seller/orders/${orderId}/approve-shortage`),
    onSuccess: () => { invalidate(); Swal.fire('Done', 'Shortage approved. Order handed over.', 'success'); },
    onError: (err) => Swal.fire('Error', err.error || 'Action failed', 'error')
  });

  const claimPaymentMutation = useMutation({
    mutationFn: (orderId) => api.post(`/seller/orders/${orderId}/claim-payment`),
    onSuccess: () => { invalidate(); Swal.fire('Success', 'Payment received and added to your wallet!', 'success'); },
    onError: (err) => Swal.fire('Error', err.error || 'Action failed', 'error')
  });

  const handleItemCheck = (orderId, itemId, checked) => {
    setUncheckedItems(prev => {
      const set = new Set(prev[orderId] || []);
      if (!checked) set.add(itemId);
      else set.delete(itemId);
      return { ...prev, [orderId]: set };
    });
  };

  const handleMarkUnavailable = async (order) => {
    const unchecked = [...(uncheckedItems[order.id] || [])];
    if (unchecked.length === 0) {
      return Swal.fire('Warning', "You haven't unchecked any items. Uncheck the items that are NOT available.", 'warning');
    }
    const result = await Swal.fire({
      title: 'Confirm?',
      text: `You marked ${unchecked.length} item(s) as unavailable. Proceed?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Update'
    });
    if (result.isConfirmed) {
      markUnavailableMutation.mutate({ orderId: order.id, unavailableIds: unchecked });
    }
  };

  const handleConfirmAll = async (orderId) => {
    const result = await Swal.fire({
      title: 'Accept Order?',
      text: 'Confirm all items are available and accept this order?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Accept All'
    });
    if (result.isConfirmed) confirmAllMutation.mutate(orderId);
  };

  const handleApproveShortage = async (orderId) => {
    const result = await Swal.fire({
      title: 'Approve Shortage?',
      text: 'Delivery Boy reported missing items. Accept the shortage penalty?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Yes, Approve'
    });
    if (result.isConfirmed) approveShortMutation.mutate(orderId);
  };

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading orders...</div>;

  const orders = data?.orders || [];

  const filterTabs = ['Pending', 'Confirmed', 'Ready', 'Delivered', 'All'];
  const filteredOrders = orders.filter(o => {
    if (activeFilter === 'Pending') return o.status === 'pending';
    if (activeFilter === 'Confirmed') return o.status === 'confirmed';
    if (activeFilter === 'Ready') return ['ready', 'ready_for_pickup'].includes(o.status);
    if (activeFilter === 'Delivered') return o.status === 'delivered';
    return true;
  });

  const statusColor = (status) => {
    const map = {
      pending: '#ffc107',
      confirmed: '#17a2b8',
      ready: '#1e7e34',
      ready_for_pickup: '#1e7e34',
      delivered: '#28a745',
      cancelled: '#dc3545',
      awaiting_buyer_decision: '#fd7e14',
      awaiting_shortage_approval: '#dc3545',
      picked_up: '#6f42c1',
    };
    return map[status] || '#6c757d';
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <h3 style={{ marginBottom: '15px' }}>Manage Orders</h3>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
        {filterTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            style={{
              padding: '7px 18px',
              borderRadius: '20px',
              border: 'none',
              background: activeFilter === tab ? 'var(--primary, #0d6efd)' : '#e9ecef',
              color: activeFilter === tab ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: activeFilter === tab ? 'bold' : 'normal',
              whiteSpace: 'nowrap'
            }}
          >
            {tab}
          </button>
        ))}
        <button onClick={() => refetch()} style={{ marginLeft: 'auto', padding: '7px 14px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '20px', cursor: 'pointer' }}>
          🔄 Refresh
        </button>
      </div>

      {/* Orders */}
      {filteredOrders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#666' }}>
          No {activeFilter !== 'All' ? activeFilter.toLowerCase() : ''} orders found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {filteredOrders.map(order => {
            const itemUnchecked = uncheckedItems[order.id] || new Set();
            return (
              <div key={order.id} className="card" style={{ borderLeft: `4px solid ${statusColor(order.status)}` }}>

                {/* Order Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <strong style={{ fontSize: '1.1rem' }}>Order #{order.uid || order.id}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>{new Date(order.created_at).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      background: statusColor(order.status),
                      color: '#fff',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}>
                      {order.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <div style={{ fontWeight: 'bold', color: '#28a745', fontSize: '1.1rem', marginTop: '5px' }}>
                      ₹{order.total_amount?.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Order Info */}
                <p style={{ fontSize: '0.9rem', color: '#555', margin: '0 0 10px 0' }}>
                  <strong>Delivery:</strong> {order.delivery_type === 'self_delivery' ? 'Self Delivery (You deliver)' : 'Instant Delivery (Partner)'}
                  {' '} | <strong>COD:</strong> {order.is_cash_on_delivery ? 'Yes' : 'No'}
                </p>

                {/* Items with checkboxes (only for pending) */}
                <div style={{ margin: '10px 0' }}>
                  <strong>Items:</strong>
                  <ul style={{ listStyle: 'none', padding: 0, marginTop: '8px' }}>
                    {order.items?.map(item => (
                      <li key={item.id} style={{ marginBottom: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: order.status === 'pending' ? 'pointer' : 'default' }}>
                          <input
                            type="checkbox"
                            checked={!itemUnchecked.has(item.id)}
                            onChange={(e) => handleItemCheck(order.id, item.id, e.target.checked)}
                            disabled={order.status !== 'pending'}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <span style={{ color: itemUnchecked.has(item.id) ? '#dc3545' : '#333' }}>
                            {item.product_name} — {item.quantity}x @ ₹{item.unit_price}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '12px' }}>

                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleConfirmAll(order.id)}
                        disabled={confirmAllMutation.isPending}
                        className="btn"
                        style={{ background: '#28a745' }}
                      >
                        ✅ Confirm All (All Available)
                      </button>
                      <button
                        onClick={() => handleMarkUnavailable(order)}
                        disabled={markUnavailableMutation.isPending}
                        className="btn"
                        style={{ background: '#dc3545' }}
                      >
                        ⚠️ Update Availability (Uncheck missing items)
                      </button>
                    </>
                  )}

                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => markReadyMutation.mutate(order.id)}
                      disabled={markReadyMutation.isPending}
                      className="btn"
                      style={{ background: '#17a2b8' }}
                    >
                      📦 Mark as Ready
                    </button>
                  )}

                  {(order.status === 'ready' || order.status === 'ready_for_pickup') && order.delivery_type === 'self_delivery' && (
                    <button
                      onClick={() => selfDeliverMutation.mutate({ orderId: order.id, status: 'picked_up' })}
                      disabled={selfDeliverMutation.isPending}
                      className="btn"
                      style={{ background: '#ffc107', color: '#000' }}
                    >
                      🚶 Mark Picked Up
                    </button>
                  )}

                  {order.status === 'awaiting_shortage_approval' && (
                    <>
                      <div style={{ width: '100%', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', padding: '8px 12px', color: '#856404', fontSize: '0.9rem' }}>
                        ⚠️ Delivery Boy reported missing items!
                      </div>
                      <button
                        onClick={() => handleApproveShortage(order.id)}
                        disabled={approveShortMutation.isPending}
                        className="btn"
                        style={{ background: '#dc3545' }}
                      >
                        Approve Shortage
                      </button>
                    </>
                  )}

                  {order.status === 'picked_up' && order.delivery_type === 'self_delivery' && (
                    <span style={{ color: '#666', fontStyle: 'italic' }}>Waiting for buyer to confirm receipt...</span>
                  )}

                  {order.status === 'awaiting_buyer_decision' && (
                    <span style={{ color: '#666', fontStyle: 'italic' }}>Awaiting customer decision on missing items...</span>
                  )}

                  {order.status === 'delivered' && (
                    <>
                      <span style={{ color: 'green', fontWeight: 'bold' }}>✅ Delivered</span>
                      {!order.shop_payment_claimed ? (
                        <button
                          onClick={() => claimPaymentMutation.mutate(order.id)}
                          disabled={claimPaymentMutation.isPending}
                          className="btn"
                          style={{ background: '#28a745' }}
                        >
                          💰 Receive Payment
                        </button>
                      ) : (
                        <span style={{ color: '#666', fontSize: '0.85rem', fontStyle: 'italic' }}>(Payment Received ✅)</span>
                      )}
                    </>
                  )}

                  {order.status === 'cancelled' && (
                    <span style={{ color: '#dc3545', fontWeight: 'bold' }}>❌ Cancelled</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
