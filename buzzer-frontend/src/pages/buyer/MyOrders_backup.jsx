import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '../../components/Navbar';
import api from '../../api/client';
import Swal from 'sweetalert2';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// ─────────────────────────────────────────────
// Live Tracking Modal with Leaflet (no install needed)
// ─────────────────────────────────────────────
function LiveTrackMap({ order, onClose }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const socketRef = useRef(null);
  const [deliveryPos, setDeliveryPos] = useState(
    order.delivery_partner_lat && order.delivery_partner_lng
      ? { lat: order.delivery_partner_lat, lng: order.delivery_partner_lng }
      : null
  );
  const [connected, setConnected] = useState(false);

  // Load Leaflet dynamically (CDN, no npm install)
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const loadLeaflet = () => {
      return new Promise((resolve) => {
        if (window.L) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = resolve;
        document.body.appendChild(script);
      });
    };

    loadLeaflet().then(() => {
      if (!mapRef.current || mapInstance.current) return;

      const defaultLat = deliveryPos?.lat || order.shop_lat || 22.9;
      const defaultLng = deliveryPos?.lng || order.shop_lng || 88.4;

      const map = window.L.map(mapRef.current).setView([defaultLat, defaultLng], 15);
      mapInstance.current = map;

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);

      // Shop marker
      if (order.shop_lat && order.shop_lng) {
        const shopIcon = window.L.divIcon({
          className: '',
          html: `<div style="background:#28a745;color:#fff;padding:6px 10px;border-radius:20px;font-weight:bold;font-size:0.8rem;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap">🏪 Shop</div>`
        });
        window.L.marker([order.shop_lat, order.shop_lng], { icon: shopIcon })
          .addTo(map)
          .bindPopup(`<b>${order.shop?.name || 'Shop'}</b>`);
      }

      // Buyer location marker
      if (order.buyer_lat && order.buyer_lng) {
        const buyerIcon = window.L.divIcon({
          className: '',
          html: `<div style="background:#007bff;color:#fff;padding:6px 10px;border-radius:20px;font-weight:bold;font-size:0.8rem;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap">📍 You</div>`
        });
        window.L.marker([order.buyer_lat, order.buyer_lng], { icon: buyerIcon })
          .addTo(map)
          .bindPopup('Your Location');
      }

      // Delivery boy marker (initial position)
      if (deliveryPos) {
        const dbIcon = window.L.divIcon({
          className: '',
          html: `<div style="background:#dc3545;color:#fff;padding:6px 10px;border-radius:20px;font-weight:bold;font-size:0.8rem;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap">🛵 ${order.delivery_partner_name || 'Delivery'}</div>`
        });
        markerRef.current = window.L.marker([deliveryPos.lat, deliveryPos.lng], { icon: dbIcon })
          .addTo(map)
          .bindPopup(`<b>${order.delivery_partner_name}</b><br>📞 ${order.delivery_partner_phone || ''}`);
        map.setView([deliveryPos.lat, deliveryPos.lng], 15);
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // WebSocket for live updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_order_room', { order_id: order.id, token });
    });

    socket.on('location_update', (data) => {
      const { lat, lng } = data;
      setDeliveryPos({ lat, lng });

      if (mapInstance.current && window.L) {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const dbIcon = window.L.divIcon({
            className: '',
            html: `<div style="background:#dc3545;color:#fff;padding:6px 10px;border-radius:20px;font-weight:bold;font-size:0.8rem;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap">🛵 ${order.delivery_partner_name || 'Delivery'}</div>`
          });
          markerRef.current = window.L.marker([lat, lng], { icon: dbIcon })
            .addTo(mapInstance.current);
        }
        mapInstance.current.setView([lat, lng], 15);
      }
    });

    socket.on('disconnect', () => setConnected(false));

    return () => { socket.disconnect(); };
  }, [order.id]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 9999,
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #007bff, #0056b3)',
        color: '#fff', padding: '15px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
            🛵 Live Tracking — Order #{order.uid}
          </div>
          <small style={{ opacity: 0.85 }}>
            {connected
              ? `✅ Live — ${order.delivery_partner_name || 'Delivery Boy'}`
              : '⏳ Connecting...'}
          </small>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none',
          color: '#fff', borderRadius: '50%', width: '36px',
          height: '36px', cursor: 'pointer', fontSize: '1.2rem'
        }}>✕</button>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, width: '100%' }} />

      {/* Bottom info */}
      <div style={{
        background: '#fff', padding: '12px 20px',
        display: 'flex', gap: '20px', flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#dc3545', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>🛵</span>
          <span style={{ fontSize: '0.85rem' }}>Delivery Boy</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#28a745', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>🏪</span>
          <span style={{ fontSize: '0.85rem' }}>Shop</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#007bff', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>📍</span>
          <span style={{ fontSize: '0.85rem' }}>Your Location</span>
        </div>
        {order.delivery_partner_phone && (
          <a href={`tel:${order.delivery_partner_phone}`} style={{
            marginLeft: 'auto', background: '#28a745', color: '#fff',
            padding: '6px 14px', borderRadius: '20px', textDecoration: 'none',
            fontSize: '0.85rem', fontWeight: 'bold'
          }}>
            📞 Call Delivery Boy
          </a>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:                { bg: '#ffc107', color: '#000', label: '⏳ Pending' },
    awaiting_buyer_decision:{ bg: '#dc3545', color: '#fff', label: '⚠️ Action Required' },
    confirmed:              { bg: '#17a2b8', color: '#fff', label: '👨‍🍳 Preparing' },
    out_for_delivery:       { bg: '#007bff', color: '#fff', label: '🛵 On the Way' },
    delivery_partner_assigned:{ bg: '#6f42c1', color: '#fff', label: '🛵 Assigned' },
    picked_up:              { bg: '#fd7e14', color: '#fff', label: '🛵 Picked Up' },
    delivered:              { bg: '#28a745', color: '#fff', label: '✅ Delivered' },
    cancelled:              { bg: '#6c757d', color: '#fff', label: '❌ Cancelled' },
    ready:                  { bg: '#20c997', color: '#fff', label: '✅ Ready' },
  };
  const s = map[status] || { bg: '#eee', color: '#333', label: status };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// Main MyOrders Component
// ─────────────────────────────────────────────
export default function MyOrders() {
  const queryClient = useQueryClient();
  const [trackingOrder, setTrackingOrder] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['myOrders'],
    queryFn: () => api.get('/orders'),
    refetchInterval: 30000,
  });

  const decisionMutation = useMutation({
    mutationFn: ({ orderId, decision }) =>
      api.post(`/orders/${orderId}/buyer-decision`, { decision }),
    onSuccess: (res) => {
      Swal.fire('Success', res.message || 'Done!', 'success');
      queryClient.invalidateQueries(['myOrders']);
    },
    onError: (err) => {
      Swal.fire('Error', err?.error || err?.message || 'Something went wrong', 'error');
    }
  });

  const handleDecision = (orderId, decision) => {
    Swal.fire({
      title: decision === 'continue_partial' ? 'Accept Partial Order?' : 'Cancel Full Order?',
      text: decision === 'continue_partial'
        ? 'You will only receive and pay for the available items.'
        : 'The entire order will be cancelled.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Confirm',
    }).then((res) => {
      if (res.isConfirmed) decisionMutation.mutate({ orderId, decision });
    });
  };

  const canTrack = (order) =>
    ['delivery_partner_assigned', 'picked_up', 'out_for_delivery'].includes(order.status) &&
    order.delivery_partner_id;

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '60px' }}>
      <Navbar />

      {/* Live Tracking Modal */}
      {trackingOrder && (
        <LiveTrackMap order={trackingOrder} onClose={() => setTrackingOrder(null)} />
      )}

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        <h2 style={{ marginBottom: '20px' }}>🛍️ My Orders</h2>

        {isLoading ? (
          <p>Loading your orders...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>Error loading orders.</p>
        ) : !data?.orders?.length ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px' }}>
            <div style={{ fontSize: '3rem' }}>📦</div>
            <h3 style={{ color: '#666' }}>No orders yet</h3>
            <p>You haven't placed any orders.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {data.orders.map((order) => (
              <div key={order.id} style={{
                background: '#fff', padding: '20px',
                borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: '12px',
                  borderBottom: '1px solid #eee', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px'
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0' }}>Order #{order.uid}</h4>
                    <span style={{ fontSize: '0.82rem', color: '#888' }}>
                      {new Date(order.created_at).toLocaleString()}
                    </span>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Action Required Banner */}
                {order.status === 'awaiting_buyer_decision' && (
                  <div style={{
                    background: '#fff3cd', border: '1px solid #ffc107',
                    padding: '14px', borderRadius: '8px', marginBottom: '14px'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>⚠️ Some items are unavailable!</h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#856404' }}>
                      The shop has marked some items as out of stock. Do you want to continue with available items or cancel?
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleDecision(order.id, 'continue_partial')}
                        style={{ flex: 1, padding: '10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                      >✅ Accept Partial</button>
                      <button
                        onClick={() => handleDecision(order.id, 'cancel_full')}
                        style={{ flex: 1, padding: '10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                      >❌ Cancel Order</button>
                    </div>
                  </div>
                )}

                {/* Order Info */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
                  fontSize: '0.9rem', marginBottom: '12px'
                }}>
                  <div><strong>🏪 Shop:</strong> {order.shop?.name || 'N/A'}</div>
                  <div><strong>📦 Type:</strong> {order.delivery_type === 'instant_delivery' ? 'Home Delivery' : 'Self Pickup'}</div>
                  <div><strong>💰 Total:</strong> ৳{order.total_amount}</div>
                  <div><strong>💳 Payment:</strong> {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online'}</div>
                  {order.delivery_partner_name && (
                    <div><strong>🛵 Delivery:</strong> {order.delivery_partner_name}</div>
                  )}
                </div>

                {/* Items */}
                <div style={{
                  background: '#f8f9fa', padding: '10px',
                  borderRadius: '8px', marginBottom: '12px'
                }}>
                  <strong style={{ fontSize: '0.85rem', color: '#555' }}>Items:</strong>
                  <ul style={{ paddingLeft: '18px', margin: '6px 0 0 0', fontSize: '0.88rem', color: '#555' }}>
                    {order.items?.map((item, idx) => (
                      <li key={idx} style={{
                        textDecoration: item.is_missing ? 'line-through' : 'none',
                        color: item.is_missing ? '#dc3545' : 'inherit'
                      }}>
                        {item.quantity}x {item.product_name} — ৳{item.unit_price}
                        {item.is_missing ? ' (Out of Stock)' : ''}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Live Track Button */}
                {canTrack(order) && (
                  <button
                    onClick={() => setTrackingOrder(order)}
                    style={{
                      width: '100%', padding: '12px',
                      background: 'linear-gradient(135deg, #007bff, #0056b3)',
                      color: '#fff', border: 'none', borderRadius: '8px',
                      fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,123,255,0.3)'
                    }}
                  >
                    🗺️ Track Live Location
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
