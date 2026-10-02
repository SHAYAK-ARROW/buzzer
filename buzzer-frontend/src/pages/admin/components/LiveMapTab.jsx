import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/client';

export default function LiveMapTab() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const [selectedBoy, setSelectedBoy] = useState(null);

  // Fetch all delivery boys with location
  const { data, refetch } = useQuery({
    queryKey: ['adminDeliveryBoyLocations'],
    queryFn: () => api.get('/admin/users?role=delivery&per_page=200'),
    refetchInterval: 10000, // refresh every 10s
  });

  const deliveryBoys = (data?.users || []).filter(u =>
    u.current_latitude && u.current_longitude
  );

  // Load Leaflet from CDN
  useEffect(() => {
    if (!document.getElementById('leaflet-css-admin')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-admin';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const loadLeaflet = () => new Promise((resolve) => {
      if (window.L) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = resolve;
      document.body.appendChild(script);
    });

    loadLeaflet().then(() => {
      if (!mapRef.current || mapInstance.current) return;
      const map = window.L.map(mapRef.current).setView([22.9, 88.4], 12);
      mapInstance.current = map;
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markersRef.current = {};
      }
    };
  }, []);

  // Update markers whenever data changes
  useEffect(() => {
    if (!mapInstance.current || !window.L || deliveryBoys.length === 0) return;

    const currentIds = new Set(deliveryBoys.map(b => b.id));

    // Remove stale markers
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(parseInt(id))) {
        mapInstance.current.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    deliveryBoys.forEach(boy => {
      const lat = boy.current_latitude;
      const lng = boy.current_longitude;

      const updatedAt = boy.location_updated_at
        ? new Date(boy.location_updated_at)
        : null;
      const minsAgo = updatedAt
        ? Math.floor((Date.now() - updatedAt.getTime()) / 60000)
        : null;

      const isRecent = minsAgo !== null && minsAgo < 5;
      const color = isRecent ? '#28a745' : '#ffc107';
      const statusText = minsAgo === null
        ? 'No update'
        : minsAgo < 1
          ? 'Just now'
          : `${minsAgo}m ago`;

      const icon = window.L.divIcon({
        className: '',
        html: `<div style="background:${color};color:#fff;padding:5px 10px;border-radius:20px;font-weight:bold;font-size:0.78rem;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;cursor:pointer">🛵 ${boy.name}</div>`
      });

      if (markersRef.current[boy.id]) {
        markersRef.current[boy.id].setLatLng([lat, lng]);
        markersRef.current[boy.id].setIcon(icon);
        markersRef.current[boy.id]
          .getPopup()?.setContent(`<b>${boy.name}</b><br>📞 ${boy.phone || 'N/A'}<br>⏱️ ${statusText}<br>📍 ${lat?.toFixed(5)}, ${lng?.toFixed(5)}`);
      } else {
        const marker = window.L.marker([lat, lng], { icon })
          .addTo(mapInstance.current)
          .bindPopup(`<b>${boy.name}</b><br>📞 ${boy.phone || 'N/A'}<br>⏱️ ${statusText}<br>📍 ${lat?.toFixed(5)}, ${lng?.toFixed(5)}`);

        marker.on('click', () => setSelectedBoy(boy));
        markersRef.current[boy.id] = marker;
      }
    });

    // If only one boy, zoom to them
    if (deliveryBoys.length === 1) {
      mapInstance.current.setView(
        [deliveryBoys[0].current_latitude, deliveryBoys[0].current_longitude], 14
      );
    }
  }, [deliveryBoys]);

  const focusOnBoy = (boy) => {
    setSelectedBoy(boy);
    if (mapInstance.current && boy.current_latitude) {
      mapInstance.current.setView([boy.current_latitude, boy.current_longitude], 16);
      markersRef.current[boy.id]?.openPopup();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '16px', height: '75vh' }}>
      {/* Sidebar: List of boys */}
      <div style={{
        width: '220px', minWidth: '180px', background: '#f8f9fa',
        borderRadius: '8px', padding: '12px', overflowY: 'auto',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '0.9rem', color: '#333' }}>
          🛵 Active Delivery Boys ({deliveryBoys.length})
        </div>

        {deliveryBoys.length === 0 ? (
          <div style={{ color: '#888', fontSize: '0.85rem', textAlign: 'center', marginTop: '30px' }}>
            <div style={{ fontSize: '2rem' }}>😴</div>
            No delivery boys online right now
          </div>
        ) : (
          deliveryBoys.map(boy => {
            const minsAgo = boy.location_updated_at
              ? Math.floor((Date.now() - new Date(boy.location_updated_at).getTime()) / 60000)
              : null;
            const isRecent = minsAgo !== null && minsAgo < 5;

            return (
              <div
                key={boy.id}
                onClick={() => focusOnBoy(boy)}
                style={{
                  padding: '8px 10px', borderRadius: '6px', marginBottom: '6px',
                  background: selectedBoy?.id === boy.id ? '#007bff' : '#fff',
                  color: selectedBoy?.id === boy.id ? '#fff' : '#333',
                  cursor: 'pointer', border: '1px solid #e9ecef',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                  <span style={{
                    display: 'inline-block', width: '8px', height: '8px',
                    borderRadius: '50%', background: isRecent ? '#28a745' : '#ffc107',
                    marginRight: '6px'
                  }}/>
                  {boy.name}
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '2px' }}>
                  {minsAgo === null ? 'Location unknown' : minsAgo < 1 ? 'Just now' : `${minsAgo}m ago`}
                </div>
              </div>
            );
          })
        )}

        <button
          onClick={() => refetch()}
          style={{
            width: '100%', marginTop: '10px', padding: '6px',
            background: '#0d6efd', color: '#fff', border: 'none',
            borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem'
          }}
        >
          🔄 Refresh
        </button>

        <div style={{ fontSize: '0.72rem', color: '#aaa', textAlign: 'center', marginTop: '8px' }}>
          Auto-refreshes every 10s
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
