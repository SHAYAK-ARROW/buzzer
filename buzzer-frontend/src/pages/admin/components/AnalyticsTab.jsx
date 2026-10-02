import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// ---- Leaflet Heatmap Component ----
function HeatmapSection({ heatmap }) {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    import('leaflet').then(L => {
      import('leaflet/dist/leaflet.css');
      const map = L.default.map(mapRef.current).setView([23.8103, 90.4125], 11);
      mapInstanceRef.current = map;

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      const bounds = [];
      if (heatmap) {
        // Shops — orange store icon
        (heatmap.shops || []).forEach(s => {
          if (s.lat && s.lng) {
            const icon = L.default.divIcon({ className: '', html: '<span style="font-size:1.3rem;text-shadow:1px 1px 2px #fff">🏪</span>' });
            L.default.marker([s.lat, s.lng], { icon }).addTo(map).bindPopup(`<b>Shop:</b> ${s.name}`);
            bounds.push([s.lat, s.lng]);
          }
        });

        // Active Delivery — green motorcycle
        (heatmap.active_delivery || []).forEach(d => {
          if (d.lat && d.lng) {
            const icon = L.default.divIcon({ className: '', html: '<span style="font-size:1.2rem">🟢🚲</span>' });
            L.default.marker([d.lat, d.lng], { icon }).addTo(map).bindPopup(`<b>Active Delivery:</b> ${d.name}`);
            bounds.push([d.lat, d.lng]);
          }
        });

        // Inactive Delivery — red motorcycle
        (heatmap.inactive_delivery || []).forEach(d => {
          if (d.lat && d.lng) {
            const lastActive = d.last_active ? new Date(d.last_active).toLocaleString() : 'Unknown';
            const icon = L.default.divIcon({ className: '', html: '<span style="font-size:1rem;opacity:0.6">🔴🚲</span>' });
            L.default.marker([d.lat, d.lng], { icon }).addTo(map)
              .bindPopup(`<b>Offline Delivery:</b> ${d.name}<br><small>Last seen: ${lastActive}</small>`);
            bounds.push([d.lat, d.lng]);
          }
        });

        // Buyers — blue circles
        (heatmap.buyers || []).forEach(b => {
          if (b.lat && b.lng) {
            L.default.circle([b.lat, b.lng], {
              color: '#3388ff', fillColor: '#3388ff', fillOpacity: 0.2, radius: 1200, weight: 1
            }).addTo(map);
            bounds.push([b.lat, b.lng]);
          }
        });

        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [heatmap]);

  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', position: 'relative' }}>
      <h4 style={{ margin: '0 0 15px 0' }}>🗺️ Selected Range Heatmap</h4>
      <div style={{ position: 'absolute', top: '20px', right: '20px', background: '#ffeb3b', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', zIndex: 1000 }}>
        Orders in this range: {heatmap?.total_range_orders || 0}
      </div>
      <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
        <span>🏪 Shops</span>
        <span>🟢🚲 Active Delivery</span>
        <span>🔴🚲 Offline Delivery</span>
        <span style={{ color: '#3388ff' }}>● Buyer Areas</span>
      </div>
      <div ref={mapRef} style={{ width: '100%', height: '450px', borderRadius: '8px', zIndex: 1 }}></div>
    </div>
  );
}



export default function AnalyticsTab() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('overview');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminAnalytics', startDate, endDate],
    queryFn: () => {
      let url = '/admin/analytics';
      if (startDate && endDate) url += `?start_date=${startDate}&end_date=${endDate}`;
      return api.get(url);
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  useEffect(() => {
    if (data?.range && !startDate && !endDate) {
      setStartDate(data.range.start);
      setEndDate(data.range.end);
    }
  }, [data]);

  const handleFilter = () => refetch();

  if (isLoading) return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>📊 Analytics Dashboard</h3>
        <div style={{ background: '#f0f0f0', borderRadius: '20px', padding: '5px 20px', height: '32px', width: '300px' }}></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ background: '#e9ecef', borderRadius: '12px', height: '100px', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
        ))}
      </div>
      <div style={{ background: '#e9ecef', borderRadius: '12px', height: '350px', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
  if (!data) return null;

  const { summary: s, delivery_stats: ds, revenue_by_day, orders_by_status, shop_analytics, delivery_analytics, buyer_analytics } = data;

  // Chart Data
  const lineChartData = {
    labels: revenue_by_day?.map(d => d.date) || [],
    datasets: [{
      label: 'Revenue (₹)',
      data: revenue_by_day?.map(d => d.revenue) || [],
      borderColor: '#667eea',
      backgroundColor: 'rgba(102, 126, 234, 0.2)',
      tension: 0.3,
      fill: true
    }]
  };

  // orders_by_status is [{status: "delivered", count: 5}, ...] from backend
  const statusColors = {
    delivered:  '#28a745',
    pending:    '#ffc107',
    accepted:   '#17a2b8',
    picked_up:  '#6f42c1',
    cancelled:  '#dc3545',
    on_the_way: '#fd7e14',
  };

  const pieChartData = {
    labels: (orders_by_status || []).map(d => d.status.replace(/_/g, ' ').toUpperCase()),
    datasets: [{
      data: (orders_by_status || []).map(d => d.count),
      backgroundColor: (orders_by_status || []).map(d => statusColors[d.status] || '#6c757d'),
      borderWidth: 2,
    }]
  };

  const peakHoursChartData = {
    labels: buyer_analytics?.peak_hours?.map(p => p.hour + ':00') || [],
    datasets: [{
      label: 'Orders',
      data: buyer_analytics?.peak_hours?.map(p => p.count) || [],
      backgroundColor: '#17a2b8',
    }]
  };

  const chartOptions = { responsive: true, maintainAspectRatio: false };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}><i className="fas fa-chart-bar" style={{ color: '#28a745' }}></i> Analytics Dashboard</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8f9fa', padding: '5px 15px', borderRadius: '20px', border: '1px solid #ddd' }}>
          <label style={{ fontWeight: 'bold', fontSize: '0.9rem', margin: 0 }}>Range:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.85rem' }} />
          <span style={{ fontSize: '0.9rem' }}>to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.85rem' }} />
          <button onClick={handleFilter} style={{ background: '#0d6efd', color: '#fff', padding: '4px 12px', fontSize: '0.85rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Apply</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px', overflowX: 'auto' }}>
        <button style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#fff', background: activeSubTab === 'overview' ? '#0d6efd' : '#6c757d' }} onClick={() => setActiveSubTab('overview')}>Overview</button>
        <button style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#fff', background: activeSubTab === 'shops' ? '#0d6efd' : '#6c757d' }} onClick={() => setActiveSubTab('shops')}>Sellers</button>
        <button style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#fff', background: activeSubTab === 'delivery' ? '#0d6efd' : '#6c757d' }} onClick={() => setActiveSubTab('delivery')}>Delivery Boys</button>
        <button style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#fff', background: activeSubTab === 'buyers' ? '#0d6efd' : '#6c757d' }} onClick={() => setActiveSubTab('buyers')}>Buyers</button>
        <button style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#fff', background: activeSubTab === 'heatmap' ? '#0d6efd' : '#6c757d' }} onClick={() => setActiveSubTab('heatmap')}>Heatmap</button>
      </div>

      {activeSubTab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '25px' }}>
            <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(102,126,234,0.4)' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>Total Gross Sales (GMV)</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '5px' }}>₹{s?.total_revenue?.toLocaleString() || 0}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '4px' }}>Total value of goods sold on platform</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #fa709a, #fee140)', color: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(250,112,154,0.4)' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>Platform Net Earnings</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '5px' }}>₹{s?.platform_commission?.toLocaleString() || 0}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '4px' }}>Your actual profit (Commission)</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)', color: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(245,87,108,0.4)' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>Cash With Riders (COD)</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '5px' }}>₹{ds?.total_cod_collected?.toLocaleString() || 0}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '4px' }}>Cash collected by delivery boys</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Gross Sales by Day</h4>
              <div style={{ height: '300px' }}>
                <Line data={lineChartData} options={chartOptions} />
              </div>
            </div>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Orders by Status</h4>
              <div style={{ height: '300px' }}>
                <Pie data={pieChartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'shops' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
          <h4 style={{ margin: '0 0 15px 0' }}>Seller Performance & Response</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Shop Name</th>
                <th style={{ padding: '10px' }}>Total Orders</th>
                <th style={{ padding: '10px' }}>Delivered</th>
                <th style={{ padding: '10px' }}>Success Rate</th>
                <th style={{ padding: '10px' }}>Response Rate</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {shop_analytics?.length > 0 ? shop_analytics.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: '10px' }}>{s.total_orders}</td>
                  <td style={{ padding: '10px' }}>{s.delivered}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: s.success_rate > 80 ? '#28a745' : (s.success_rate > 50 ? '#ffc107' : '#dc3545') }}>{s.success_rate}%</td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: s.response_rate > 80 ? '#28a745' : (s.response_rate > 50 ? '#ffc107' : '#dc3545') }}>{s.response_rate}%</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', background: s.is_active ? '#d4edda' : '#f8d7da', color: s.is_active ? '#155724' : '#721c24' }}>
                      {s.is_active ? 'Online' : 'Offline'}
                    </span>
                  </td>
                </tr>
              )) : <tr><td colSpan="6" style={{ padding: '10px', textAlign: 'center' }}>No data available</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'delivery' && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
          <h4 style={{ margin: '0 0 15px 0' }}>Delivery Boy Activity & Trust</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Delivery Boy</th>
                <th style={{ padding: '10px' }}>Total Delivered</th>
                <th style={{ padding: '10px' }}>Trusted By</th>
                <th style={{ padding: '10px' }}>Location</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {delivery_analytics?.length > 0 ? delivery_analytics.map(d => (
                <tr key={d.id || d.name} style={{ borderBottom: '1px solid #f9f9f9' }}>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{d.name}</td>
                  <td style={{ padding: '10px' }}>{d.total_delivered}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ background: '#e0f3ff', color: '#007bff', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                      {d.trusted_by_shops} Shops
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    {d.lat ? <span style={{ color: '#28a745' }}>Active</span> : <span style={{ color: '#dc3545' }}>Inactive</span>}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', background: d.is_active ? '#d4edda' : '#f8d7da', color: d.is_active ? '#155724' : '#721c24' }}>
                      {d.is_active ? 'Online' : 'Offline'}
                    </span>
                  </td>
                </tr>
              )) : <tr><td colSpan="5" style={{ padding: '10px', textAlign: 'center' }}>No data available</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'buyers' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '25px' }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
              <h4 style={{ margin: '0 0 15px 0' }}>Total Active Buyers</h4>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: '#0d6efd' }}>{s?.active_buyers || 0}</div>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Registered & active customers.</p>
            </div>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Peak Ordering Hours</h4>
              <div style={{ height: '200px' }}>
                <Bar data={peakHoursChartData} options={chartOptions} />
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', overflowX: 'auto' }}>
            <h4 style={{ margin: '0 0 15px 0' }}>Top Buyers (by Order Count)</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Name</th>
                  <th style={{ padding: '10px' }}>Total Orders</th>
                  <th style={{ padding: '10px' }}>Total Spent</th>
                  <th style={{ padding: '10px' }}>Delivery Charge Paid</th>
                  <th style={{ padding: '10px' }}>Favorite Shop</th>
                </tr>
              </thead>
              <tbody>
                {buyer_analytics?.top_buyers?.length > 0 ? buyer_analytics.top_buyers.map(b => (
                  <tr key={b.id || b.name} style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{b.name}</td>
                    <td style={{ padding: '10px' }}>{b.total_orders}</td>
                    <td style={{ padding: '10px', color: '#28a745', fontWeight: 'bold' }}>₹{b.total_spent.toFixed(2)}</td>
                    <td style={{ padding: '10px', color: '#dc3545' }}>₹{b.total_delivery.toFixed(2)}</td>
                    <td style={{ padding: '10px' }}><span style={{ background: '#e9ecef', padding: '3px 10px', borderRadius: '12px' }}>{b.favorite_shop}</span></td>
                  </tr>
                )) : <tr><td colSpan="5" style={{ padding: '10px', textAlign: 'center' }}>No buyer data available</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSubTab === 'heatmap' && (
        <HeatmapSection heatmap={data.heatmap} />
      )}
    </div>
  );
}
