import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Navbar from '../../components/Navbar';
import DeliveryTabs from './DeliveryTabs';
import api from '../../api/client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';
import Swal from 'sweetalert2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DeliveryDashboard() {
  const queryClient = useQueryClient();
  const [checkedItems, setCheckedItems] = useState({});
  const chartRef = useRef(null);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = new Date().toISOString().slice(0, 7);

  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(thisMonthStr);

  // 1. Get Location periodically & update backend
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
      
      const watchId = navigator.geolocation.watchPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
      
      // Send location to backend every 30 seconds, not on every GPS jitter
      const intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
          api.post('/delivery/location', { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {});
        });
      }, 30000);

      return () => {
        navigator.geolocation.clearWatch(watchId);
        clearInterval(intervalId);
      };
    }
  }, []);

  const { data: statsData, isFetching: isStatsFetching } = useQuery({
    placeholderData: keepPreviousData,
    queryKey: ['deliveryStats', selectedDay, selectedMonth],
    queryFn: () => api.get("/delivery/stats?day=" + selectedDay + "&month=" + selectedMonth),
    refetchInterval: 30000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['myDeliveryOrders'],
    queryFn: () => api.get('/delivery/orders'),
    refetchInterval: 15000,
  });

  const [activeTab, setActiveTab] = useState('analytics'); // active, history, analytics
  const activeOrders = data?.orders?.filter(o => ['delivery_partner_assigned', 'picked_up', 'pending_redelivery'].includes(o.status)) || [];
  const pastOrders = data?.orders?.filter(o => !['delivery_partner_assigned', 'picked_up', 'pending_redelivery'].includes(o.status)) || [];

  const actionMutation = useMutation({
    mutationFn: ({ orderId, action }) => {
      let endpoint = '';
      if (action === 'confirm_pickup') endpoint = `/delivery/orders/${orderId}/confirm-pickup`;
      if (action === 'mark_delivered') endpoint = `/delivery/orders/${orderId}/delivered`;
      if (action === 'attempt_failed') endpoint = `/delivery/orders/${orderId}/attempt-failed`;
      if (action === 'drop_order') endpoint = `/delivery/orders/${orderId}/drop`;
      return api.post(endpoint, {}); // Send empty body to prevent 415 error
    },
    onSuccess: (res) => {
      Swal.fire('Success', res.message, 'success');
      queryClient.invalidateQueries({ queryKey: ['myDeliveryOrders'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryStats'] });
    },
    onError: (err) => {
      Swal.fire('Error', err.response?.data?.error || err.message, 'error');
    }
  });

  const handleAction = (orderId, action, confirmMessage) => {
    Swal.fire({
      title: 'Are you sure?',
      text: confirmMessage,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Confirm'
    }).then((res) => {
      if (res.isConfirmed) {
        actionMutation.mutate({ orderId, action });
      }
    });
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'delivery_partner_assigned': return <span style={{ background: '#ffc107', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>🏃 Go to Shop</span>;
      case 'picked_up': return <span style={{ background: '#007bff', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>🛵 On the Way</span>;
      case 'delivered': return <span style={{ background: '#28a745', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>✅ Delivered</span>;
      case 'cancelled': return <span style={{ background: '#dc3545', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>❌ Cancelled</span>;
      case 'attempt_failed': return <span style={{ background: '#6c757d', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>⚠️ Failed</span>;
      default: return <span>{status}</span>;
    }
  };

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '50px' }}>
      <Navbar />
      <DeliveryTabs />
      
      <div style={{ width: '95%', maxWidth: '1600px', margin: '0 auto', padding: '0 1rem 2rem 1rem' }}>
        
        {/* Tabs Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px', flexWrap: 'wrap', overflowX: 'auto' }}>
          <button 
            onClick={() => setActiveTab('active')} 
            style={{ padding: '8px 16px', background: activeTab === 'active' ? '#0d6efd' : 'transparent', color: activeTab === 'active' ? 'white' : '#555', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
            Active ({activeOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            style={{ padding: '8px 16px', background: activeTab === 'history' ? '#0d6efd' : 'transparent', color: activeTab === 'history' ? 'white' : '#555', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
            History
          </button>
          <button 
            onClick={() => setActiveTab('analytics')} 
            style={{ padding: '8px 16px', background: activeTab === 'analytics' ? '#0d6efd' : 'transparent', color: activeTab === 'analytics' ? 'white' : '#555', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
            Analytics
          </button>
        </div>

        {!location.lat && activeTab === 'active' && (
          <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#856404' }}>
            ⚠️ GPS Location is off. Please enable location to track deliveries.
          </div>
        )}

        {/* Tab Content: Analytics */}
        {activeTab === 'analytics' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>Select Date (Day)</label>
                <input type="date" max={todayStr} value={selectedDay} onChange={e => setSelectedDay(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#555', marginBottom: '5px' }}>Select Month</label>
                <input type="month" max={thisMonthStr} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div>
                <button 
                  onClick={() => { setSelectedDay(todayStr); setSelectedMonth(thisMonthStr); }} 
                  style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '40px' }}
                  title="Reset to default">
                  🔄 Reset
                </button>
                {isStatsFetching && <span style={{marginLeft: '15px', color: '#0d6efd', fontWeight: 'bold'}}>⏳ Updating...</span>}
              </div>
            </div>

            {statsData ? (
              <>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, background: '#17a2b8', color: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', minWidth: '150px' }}>
                    <h4 style={{ margin: '0 0 5px 0', opacity: 0.9 }}>Daily Earnings</h4>
                    <h2 style={{ margin: 0 }}>₹{statsData.day_earned?.toFixed(2) || '0.00'}</h2>
                  </div>
                  <div style={{ flex: 1, background: '#0d6efd', color: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', minWidth: '150px' }}>
                    <h4 style={{ margin: '0 0 5px 0', opacity: 0.9 }}>Monthly Earnings</h4>
                    <h2 style={{ margin: 0 }}>₹{statsData.month_earned?.toFixed(2) || '0.00'}</h2>
                  </div>
                  <div style={{ flex: 1, background: '#28a745', color: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', minWidth: '150px' }}>
                    <h4 style={{ margin: '0 0 5px 0', opacity: 0.9 }}>All Time Earned</h4>
                    <h2 style={{ margin: 0 }}>₹{statsData.all_time_earned?.toFixed(2) || '0.00'}</h2>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
                  <div style={{ flex: 1, minWidth: '300px', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#333', textAlign: 'center' }}>Delivery Overview (Selected Day)</h3>
                    <div style={{ height: '250px', display: 'flex', justifyContent: 'center' }}>
                      {(() => {
                        const hasData = (statsData?.successful_deliveries || 0) + (statsData?.failed_deliveries || 0) + (statsData?.dropped_orders || 0) > 0;
                        return (
                          <Pie 
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: hasData, position: 'top' },
                                tooltip: { enabled: hasData }
                              },
                            }}
                            data={hasData ? {
                              labels: ['Successful', 'Failed Attempt', 'Dropped/Cancelled'],
                              datasets: [{
                                data: [statsData.successful_deliveries || 0, statsData.failed_deliveries || 0, statsData.dropped_orders || 0],
                                backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                                borderWidth: 1,
                              }],
                            } : {
                              labels: ['No Deliveries'],
                              datasets: [{ data: [1], backgroundColor: ['#e9ecef'], borderWidth: 0 }]
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: '300px', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}><h3 style={{ margin: 0, color: '#333' }}>Delivery Activity (Selected Month)</h3><button onClick={() => chartRef.current?.resetZoom()} style={{ padding: '4px 8px', fontSize: '12px', background: '#e9ecef', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🔍 Reset Zoom</button></div>
                    <div style={{ height: '300px' }}>
                      <Line 
                        ref={chartRef}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { 
                            legend: { display: true, position: 'top' },
                            zoom: {
                              pan: { enabled: true, mode: 'x' },
                              zoom: {
                                drag: {
                                  enabled: true,
                                  backgroundColor: 'rgba(13, 110, 253, 0.3)',
                                },
                                mode: 'x',
                              }
                            }
                          },
                          scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } }
                        }} 
                        data={{
                          labels: statsData.monthly_chart?.labels || [],
                          datasets: [
                            {
                              label: 'Total Platform Orders',
                              data: statsData.monthly_chart?.platform_total || [],
                              borderColor: '#adb5bd',
                              backgroundColor: 'rgba(173, 181, 189, 0.2)',
                              borderWidth: 2,
                              tension: 0
                            },
                            {
                              label: 'Assigned to You',
                              data: statsData.monthly_chart?.boy_taken || [],
                              borderColor: '#6f42c1',
                              backgroundColor: 'rgba(111, 66, 193, 0.2)',
                              borderWidth: 2, tension: 0
                            },
                            {
                              label: 'Successful by You',
                              data: statsData.monthly_chart?.boy_success || [],
                              borderColor: '#28a745',
                              backgroundColor: 'rgba(40, 167, 69, 0.2)',
                              borderWidth: 2, tension: 0
                            },
                            {
                              label: 'Dropped by You',
                              data: statsData.monthly_chart?.boy_dropped || [],
                              borderColor: '#dc3545',
                              backgroundColor: 'rgba(220, 53, 69, 0.2)',
                              borderWidth: 2, tension: 0
                            }
                          ]
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p>Loading analytics...</p>
            )}
          </div>
        )}

        {/* Tab Content: Active */}
        {activeTab === 'active' && (
          <div>
            {isLoading ? (
              <p>Loading your orders...</p>
            ) : activeOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px', marginBottom: '30px' }}>
                <h3 style={{ color: '#666' }}>No active deliveries</h3>
                <p>Go to 'Available Orders' to accept new deliveries.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
                {activeOrders.map((o) => (
                  <div key={o.id} style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #0d6efd', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <h3 style={{ margin: 0 }}>Order #{o.uid}</h3>
                      {getStatusBadge(o.status)}
                    </div>
                    <div style={{ background: '#f1f3f5', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                      <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>📦 Order Items (Checklist)</div>
                      {o.items?.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #ddd' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                            <input 
                              type="checkbox" 
                              checked={!!(checkedItems[o.id] && checkedItems[o.id][item.id])}
                              onChange={() => {
                                setCheckedItems(prev => ({
                                  ...prev, 
                                  [o.id]: {
                                    ...(prev[o.id] || {}), 
                                    [item.id]: !(prev[o.id] && prev[o.id][item.id])
                                  }
                                }))
                              }}
                              style={{ width: '18px', height: '18px', accentColor: '#28a745' }}
                            />
                            <span style={{ fontSize: '0.9rem', color: (checkedItems[o.id] && checkedItems[o.id][item.id]) ? '#6c757d' : '#000', textDecoration: (checkedItems[o.id] && checkedItems[o.id][item.id]) ? 'line-through' : 'none' }}>
                              {item.product_name} 
                              {item.variant_name && <span style={{fontSize: '0.8rem', color: '#666', marginLeft: '5px'}}>({item.variant_name})</span>}
                            </span>
                          </label>
                          <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '15px' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontWeight: 'bold', color: '#555', fontSize: '0.85rem', textTransform: 'uppercase' }}>Pickup From</div>
                        <div>🏪 {o.shop?.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>{o.shop?.address}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>📞 {o.shop?.phone}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontWeight: 'bold', color: '#555', fontSize: '0.85rem', textTransform: 'uppercase' }}>Deliver To</div>
                        <div>👤 {o.delivery_address || 'Customer Address'}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>📞 {o.customer?.phone}</div>
                        {o.delivery_notes && <div style={{ fontSize: '0.85rem', color: '#dc3545', fontWeight: 'bold' }}>Note: {o.delivery_notes}</div>}
                      </div>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>Order Total:</strong> ₹{o.total_amount} {o.payment_method === 'cod' ? <span style={{color: '#dc3545', fontWeight: 'bold'}}>(COLLECT CASH)</span> : <span style={{color: '#28a745', fontWeight: 'bold'}}>(PAID ONLINE)</span>}
                      </div>
                      <div>
                        <strong>Your Earning:</strong> ₹{o.delivery_charge}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {o.status === 'delivery_partner_assigned' && (
                        <>
                          {(() => {
                            const allChecked = o.items?.length > 0 && o.items.every(i => checkedItems[o.id] && checkedItems[o.id][i.id]);
                            return (
                              <button 
                                onClick={() => {
                                  if (!allChecked) {
                                    Swal.fire('Incomplete', 'Please check off all items before confirming pickup.', 'warning');
                                    return;
                                  }
                                  handleAction(o.id, 'confirm_pickup', 'Have you collected all items from the shop?')
                                }} 
                                style={{ flex: 1, padding: '10px', background: allChecked ? '#007bff' : '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: allChecked ? 'pointer' : 'not-allowed' }}
                              >
                                {allChecked ? 'Confirm Pickup' : 'Check All Items First'}
                              </button>
                            );
                          })()}
                          <button onClick={() => handleAction(o.id, 'drop_order', 'Are you sure you want to drop this order?')} style={{ padding: '10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Drop Order</button>
                        </>
                      )}
                      {(o.status === 'picked_up' || o.status === 'pending_redelivery') && (
                        <>
                          <button onClick={() => handleAction(o.id, 'mark_delivered', `Did you deliver the order and collect ₹${o.total_amount}?`)} style={{ flex: 1, padding: '10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}>Mark as Delivered</button>
                          <button onClick={() => handleAction(o.id, 'attempt_failed', 'Is the customer unavailable or rejecting the order?')} style={{ padding: '10px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Attempt Failed</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: History */}
        {activeTab === 'history' && (
          <div>
            {pastOrders.length === 0 ? (
              <p style={{ color: '#666' }}>No past deliveries yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pastOrders.map(o => (
                  <div key={o.id} style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>Order #{o.uid}</strong> - {o.shop?.name}
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>{new Date(o.created_at).toLocaleDateString()}</div>
                    </div>
                    <div>{getStatusBadge(o.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
