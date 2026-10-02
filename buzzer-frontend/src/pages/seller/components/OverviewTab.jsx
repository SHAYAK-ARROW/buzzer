import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';

import Swal from 'sweetalert2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function OverviewTab() {
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState(''); // '' means today by default, or we can use 'all'

  // Fetch Shop Profile
  const { data: shopData, isLoading: shopLoading } = useQuery({
    queryKey: ['sellerShop'],
    queryFn: () => api.get('/seller/shop'),
  });
  const shop = shopData?.shop;

  // Fetch Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['sellerStats', dateFilter],
    queryFn: () => api.get(`/seller/stats${dateFilter ? `?date=${dateFilter}` : ''}`),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (newStatus) => api.patch('/seller/status', { is_active: newStatus }),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['sellerShop'], (old) => {
        if (!old || !old.shop) return old;
        return {
          ...old,
          shop: {
            ...old.shop,
            is_active: variables
          }
        };
      });
      Swal.fire('Success', 'Shop status updated!', 'success');
    },
    onError: (err) => {
      Swal.fire('Error', err.error || 'Failed to update status', 'error');
    }
  });

  const handleToggleStatus = () => {
    if (!shop) return;
    const newStatus = !shop.is_active;
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to turn your shop ${newStatus ? 'ON' : 'OFF'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, turn ${newStatus ? 'ON' : 'OFF'}`
    }).then((result) => {
      if (result.isConfirmed) {
        toggleStatusMutation.mutate(newStatus);
      }
    });
  };

  if (shopLoading || statsLoading) return (
    <div>
      <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard...</div>
    </div>
  );

  const totalOrders = stats?.total_orders || 0;
  const pending = stats?.pending_orders || 0;
  const cancelled = stats?.cancelled_orders || 0;
  const readyDelivered = totalOrders - pending - cancelled;
  const hasData = totalOrders > 0;

  const pieChartData = {
    labels: ['Pending', 'Ready/Delivered', 'Cancelled'],
    datasets: [
      {
        data: [pending, readyDelivered, cancelled],
        backgroundColor: ['#ffc107', '#28a745', '#dc3545'],
        borderWidth: 1,
      },
    ],
  };

  const barChartData = {
    labels: ['Total Orders', 'Pending', 'Ready/Delivered', 'Cancelled'],
    datasets: [
      {
        label: 'Order Count',
        data: [totalOrders, pending, readyDelivered, cancelled],
        backgroundColor: ['#0d6efd', '#ffc107', '#28a745', '#dc3545'],
      },
    ],
  };

  return (
    <div>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        


        {/* Filters */}
        <div style={{ marginBottom: '1.5rem' }}>
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ccc' }}
          >
            <option value="">Today</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={statCardStyle}>
            <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Total Revenue</h4>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
              ₹{stats?.revenue?.toFixed(2) || '0.00'}
            </div>
          </div>
          <div style={statCardStyle}>
            <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Total Orders</h4>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0d6efd' }}>
              {stats?.total_orders || 0}
            </div>
          </div>
          <div style={statCardStyle}>
            <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>Pending Orders</h4>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>
              {stats?.pending_orders || 0}
            </div>
          </div>
        </div>

        {/* Analytics Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 20px 0', color: '#666', textAlign: 'center' }}>Orders Breakdown</h4>
            {hasData ? (
              <Pie data={pieChartData} />
            ) : (
              <p style={{ textAlign: 'center', color: '#999', marginTop: '2rem' }}>No data to display</p>
            )}
          </div>
          
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 20px 0', color: '#666', textAlign: 'center' }}>Order Status Counts</h4>
            {hasData ? (
              <Bar 
                data={barChartData} 
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }} 
              />
            ) : (
              <p style={{ textAlign: 'center', color: '#999', marginTop: '2rem' }}>No data to display</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const statCardStyle = {
  background: '#fff',
  padding: '1.5rem',
  borderRadius: '12px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center'
};
