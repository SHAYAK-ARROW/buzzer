import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '../../components/Navbar';
import DeliveryTabs from './DeliveryTabs';
import api from '../../api/client';
import Swal from 'sweetalert2';

export default function DeliveryAvailableOrders() {
  const queryClient = useQueryClient();
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [radius, setRadius] = useState(5);

  // 1. Get Location periodically
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        // Optional: Send to backend immediately
        api.post('/delivery/location', { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {});
      });
      
      const watchId = navigator.geolocation.watchPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // 2. Fetch Available Orders
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['availableOrders', radius],
    queryFn: () => api.get('/delivery/available-orders?radius=' + radius),
    refetchInterval: 10000, // auto-refresh every 10 seconds
  });

  // 3. Accept Order Mutation
  const acceptMutation = useMutation({
    mutationFn: (orderId) => api.post(`/delivery/orders/${orderId}/accept`),
    onSuccess: (res) => {
      Swal.fire('Accepted!', res.message, 'success');
      queryClient.invalidateQueries(['availableOrders']);
      queryClient.invalidateQueries(['myDeliveryOrders']);
    },
    onError: (err) => {
      Swal.fire('Error', err.response?.data?.error || err.message, 'error');
    }
  });

  const handleAccept = (orderId) => {
    Swal.fire({
      title: 'Accept this order?',
      text: "You will be responsible for delivering it.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Accept'
    }).then((res) => {
      if (res.isConfirmed) {
        acceptMutation.mutate(orderId);
      }
    });
  };

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '50px' }}>
      <Navbar />
      <DeliveryTabs />
      
      <div style={{ width: '95%', maxWidth: '1600px', margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Available Orders</h2>
          <button 
            onClick={() => refetch()}
            style={{ padding: '8px 15px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Refresh
          </button>
        </div>

        {!location.lat && (
          <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#856404' }}>
            ⚠️ Waiting for GPS location. Orders distance might be inaccurate.
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Looking for nearby orders...</div>
        ) : !data?.orders || data.orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px' }}>
            <h3 style={{ color: '#666' }}>No orders right now</h3>
            <p>Wait for shops to prepare orders. They will appear here when ready.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {data.orders.map((o) => (
              <div key={o.id} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0 }}>{o.shop_name}</h3>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.2rem' }}>
                    Earning: ₹{o.delivery_charge}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '15px' }}>
                  <div>📍 <strong>Pickup:</strong> {o.shop_address}</div>
                  <div>📏 <strong>Distance to Shop:</strong> {o.distance_km ? `${o.distance_km.toFixed(2)} km` : 'Calculating...'}</div>
                  <div style={{ marginTop: '5px' }}>
                    💰 <strong>Order Value:</strong> ₹{o.total_amount} {o.is_cash_on_delivery ? '(Collect Cash)' : '(Pre-paid)'}
                  </div>
                  <div style={{ marginTop: '5px' }}>
                    🛡️ <strong>Access:</strong> {o.trust_tier}
                  </div>
                </div>

                <button 
                  onClick={() => handleAccept(o.id)}
                  disabled={acceptMutation.isPending}
                  style={{ width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                  {acceptMutation.isPending ? 'Accepting...' : 'Accept Order'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
