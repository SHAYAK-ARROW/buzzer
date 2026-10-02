import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import api from '../../../api/client';

const styles = {
  th: { padding: '10px', background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', borderBottom: '1px solid #eee' },
  btn: { padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', fontSize: '0.85rem' }
};

export default function OrdersTab() {
  const queryClient = useQueryClient();

  const [dateFilter, setDateFilter] = useState('all_dates');
  const [dateCustom, setDateCustom] = useState('');
  const [status, setStatus] = useState('all');
  const [searchField, setSearchField] = useState('uid');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminOrders', dateFilter, dateCustom, status, searchField, searchQuery, page],
    queryFn: () => {
      const params = {
        status,
        search_field: searchField,
        search_query: searchQuery,
        date_filter: dateFilter,
        page,
        limit: 50,
      };
      if (dateFilter === 'custom' && dateCustom) {
        params.date_custom = dateCustom;
      }
      return api.get('/admin/orders', { params });
    }
  });

  const forceCancel = useMutation({
    mutationFn: ({ orderId, reason }) => api.post(`/admin/orders/${orderId}/force-cancel`, { reason }),
    onSuccess: () => {
      Swal.fire('Success', 'Order force-cancelled successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const assignDelivery = useMutation({
    mutationFn: ({ orderId, partnerId }) => api.post(`/admin/orders/${orderId}/assign-delivery`, { delivery_partner_id: partnerId }),
    onSuccess: () => {
      Swal.fire('Success', 'Delivery partner assigned! They have been notified.', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const resolveComplaint = useMutation({
    mutationFn: (complaintId) => api.patch(`/admin/complaints/${complaintId}/resolve`),
    onSuccess: () => {
      Swal.fire('Success', 'Complaint resolved.', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const addComplaint = useMutation({
    mutationFn: ({ orderId, payload }) => api.post(`/admin/orders/${orderId}/complaints`, payload),
    onSuccess: () => {
      Swal.fire('Success', 'Complaint added successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const handleForceCancel = async (orderId) => {
    const { value: reason } = await Swal.fire({
      title: 'Force Cancel Order',
      input: 'text',
      inputLabel: 'Enter reason (will be saved in audit log):',
      inputPlaceholder: 'Reason...',
      showCancelButton: true
    });
    if (!reason || !reason.trim()) return;

    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: `Force cancel Order #${orderId}? If paid online, buyer will be refunded.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, force cancel!'
    });
    if (confirm.isConfirmed) {
      forceCancel.mutate({ orderId, reason: reason.trim() });
    }
  };

  const handleAssignDelivery = async (orderId) => {
    const { value: partnerIdStr } = await Swal.fire({
      title: 'Assign Delivery Partner',
      input: 'number',
      inputLabel: "Enter the Delivery Boy's User ID (U_ID number from the table):",
      showCancelButton: true
    });
    if (!partnerIdStr) return;
    const partnerId = parseInt(partnerIdStr.trim());
    if (isNaN(partnerId)) return Swal.fire('Error', 'Invalid ID. Enter a number.', 'error');

    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: `Assign delivery partner ID ${partnerId} to Order #${orderId}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, assign'
    });
    if (confirm.isConfirmed) {
      assignDelivery.mutate({ orderId, partnerId });
    }
  };

  const showItems = (items) => {
    const itemsStr = JSON.stringify(items, null, 2);
    Swal.fire({
      title: 'Order Items',
      html: `<pre style="text-align:left; font-size:0.85rem; max-height:400px; overflow:auto;">${itemsStr}</pre>`,
      width: 600
    });
  };

  const showComplaints = (complaints) => {
    // We create a custom HTML string for SweetAlert
    let html = `<div style="max-height: 60vh; overflow-y: auto; text-align: left;">`;
    complaints.forEach(c => {
      const statusColor = c.status === 'resolved' ? '#1e7e34' : '#dc3545';
      html += `
        <div style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:5px; border-left: 4px solid ${statusColor};">
          <div style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">Complaint #${c.id} - ${new Date(c.created_at).toLocaleString()}</div>
          <div style="margin-bottom: 5px;"><strong>Reported By:</strong> ${c.reporter_name || 'System'} (${(c.reporter_role || 'System').toUpperCase()})</div>
          <div style="margin-bottom: 5px;"><strong>Type:</strong> ${c.complaint_type || 'General'}</div>
          <div style="margin-bottom: 5px;"><strong>Against:</strong> ${c.against_role ? c.against_role.toUpperCase() : 'N/A'}</div>
          <div style="margin-bottom: 5px; background: #f8f9fa; padding: 8px; border-radius: 4px;"><strong>Reason:</strong><br>${c.reason}</div>
          <div style="margin-top:10px; color:${statusColor}; font-weight:bold; text-align:center;">
             ${c.status === 'pending' ? `<button class="swal2-confirm swal2-styled resolve-btn" data-id="${c.id}" style="background-color:#1e7e34; margin:0;">Mark as Resolved</button>` : 'Resolved'}
          </div>
        </div>
      `;
    });
    html += `</div>`;

    Swal.fire({
      title: 'Complaints',
      html: html,
      width: 600,
      showCloseButton: true,
      showConfirmButton: false,
      didOpen: () => {
        const btns = Swal.getHtmlContainer().querySelectorAll('.resolve-btn');
        btns.forEach(btn => {
          btn.addEventListener('click', () => {
            resolveComplaint.mutate(btn.getAttribute('data-id'));
            Swal.close();
          });
        });
      }
    });
  };

  const handleAddComplaint = async (orderId) => {
    const { value: formValues } = await Swal.fire({
      title: `Add Complaint to Order #${orderId}`,
      html: `
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display:block; font-weight:bold; margin-bottom:5px;">Complaint Filed By</label>
          <select id="swal-who" class="swal2-select" style="display:flex; width:100%; margin:0;">
            <option value="user">Buyer / Customer</option>
            <option value="delivery">Delivery Boy</option>
            <option value="seller">Seller / Shop</option>
          </select>
        </div>
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display:block; font-weight:bold; margin-bottom:5px;">Against</label>
          <select id="swal-against" class="swal2-select" style="display:flex; width:100%; margin:0;">
            <option value="user">Buyer / Customer</option>
            <option value="delivery">Delivery Boy</option>
            <option value="seller">Seller / Shop</option>
          </select>
        </div>
        <div style="text-align: left;">
          <label style="display:block; font-weight:bold; margin-bottom:5px;">Complaint Details</label>
          <textarea id="swal-reason" class="swal2-textarea" style="display:flex; width:100%; margin:0;" placeholder="Enter details..."></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const who = document.getElementById('swal-who').value;
        const against = document.getElementById('swal-against').value;
        const reason = document.getElementById('swal-reason').value;
        if (!reason) {
          Swal.showValidationMessage('Reason is required');
          return null;
        }
        return { who_filed: who, against_role: against, reason };
      }
    });

    if (formValues) {
      addComplaint.mutate({ orderId, payload: formValues });
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      setSearchQuery(searchInput); setPage(1);
    }
  };

  const orders = data?.orders || [];
  const statusOpts = [
    {v:'pending', l:'Pending'}, {v:'confirmed', l:'Confirmed'}, {v:'ready', l:'Ready'},
    {v:'on_delivery', l:'On Delivery'}, {v:'completed', l:'Completed'},
    {v:'cancelled', l:'Cancelled'}, {v:'reported', l:'Complained'}, {v:'all', l:'All'}
  ];

  return (
    <div>
      {/* Header & Filters */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>System Orders</h3>
          <span style={{ color: '#888', fontSize: '0.9rem' }}>{orders.length} orders found</span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-start' }}>
          
          {/* Date Filter */}
          <div>
            <strong style={{ display: 'block', fontSize: '0.8rem', color: '#555', marginBottom: '6px' }}>📅 DATE</strong>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button 
                style={{...styles.btn, background: dateFilter === 'today' ? '#0d6efd' : '#e9ecef', color: dateFilter === 'today' ? '#fff' : '#333'}}
                onClick={() => { setDateFilter('today'); setDateCustom(''); setPage(1); }}
              >Today</button>
              <button 
                style={{...styles.btn, background: dateFilter === 'yesterday' ? '#0d6efd' : '#e9ecef', color: dateFilter === 'yesterday' ? '#fff' : '#333'}}
                onClick={() => { setDateFilter('yesterday'); setDateCustom(''); setPage(1); }}
              >Yesterday</button>
              <button 
                style={{...styles.btn, background: dateFilter === 'all_dates' ? '#0d6efd' : '#e9ecef', color: dateFilter === 'all_dates' ? '#fff' : '#333'}}
                onClick={() => { setDateFilter('all_dates'); setDateCustom(''); setPage(1); }}
              >All Dates</button>
              <input 
                type="date" 
                style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.85rem' }}
                value={dateCustom}
                onChange={(e) => { setDateFilter('custom'); setDateCustom(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div style={{ borderLeft: '1px solid #eee', paddingLeft: '15px' }}>
            <strong style={{ display: 'block', fontSize: '0.8rem', color: '#555', marginBottom: '6px' }}>🔍 STATUS</strong>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {statusOpts.map(s => (
                <label key={s.v} style={{ fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input 
                    type="radio" 
                    name="order_status" 
                    value={s.v} 
                    checked={status === s.v}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    style={{marginRight: '4px'}}
                  />
                  {s.l}
                </label>
              ))}
            </div>
          </div>

          {/* Search Filter */}
          <div style={{ borderLeft: '1px solid #eee', paddingLeft: '15px' }}>
            <strong style={{ display: 'block', fontSize: '0.8rem', color: '#555', marginBottom: '6px' }}>🔎 SEARCH</strong>
            <div style={{ display: 'flex', gap: '5px' }}>
              <select 
                style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
              >
                <option value="uid">Order UID</option>
                <option value="id">Order ID</option>
                <option value="user_id">User ID</option>
                <option value="shop_id">Shop ID</option>
                <option value="delivery_boy_id">Delivery Boy ID</option>
              </select>
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                style={{ padding: '4px 8px', width: '130px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.85rem' }}
              />
              <button 
                style={{...styles.btn, background: '#0d6efd', color: '#fff'}}
                onClick={() => { setSearchQuery(searchInput); setPage(1); setPage(1); }}
              >Go</button>
            </div>
          </div>

        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <p>Loading orders...</p>
      ) : error ? (
        <div style={{color: 'red'}}>Error: {error.message}</div>
      ) : orders.length === 0 ? (
        <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ color: '#666', margin: 0 }}>No orders found.</p>
        </div>
      ) : (
        <>
        <div style={{ overflowX: 'auto', width: '100%', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={styles.th}>User Name</th>
                <th style={styles.th}>User Nickname</th>
                <th style={styles.th}>Ordered From</th>
                <th style={styles.th}>Pay Method</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Delivery Boy</th>
                <th style={styles.th}>Items</th>
                <th style={styles.th}>Complaints</th>
                <th style={styles.th}>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={styles.td}>
                    <strong>{o.user_name}</strong><br/>
                    <span style={{fontSize: '0.8rem', color: '#666'}}>
                      UID: {o.uid}<br/>U_ID: {o.user_id}
                    </span>
                  </td>
                  <td style={styles.td}>{o.user_nickname || '-'}</td>
                  <td style={styles.td}>
                    {o.shop_name}<br/>
                    <span style={{fontSize: '0.8rem', color: '#666'}}>S_ID: {o.shop_id}</span>
                  </td>
                  <td style={styles.td}>
                    {o.payment_method === 'online' ? (
                      <b style={{color: '#1e7e34'}}>ONLINE</b>
                    ) : (
                      <b style={{color: '#dc3545'}}>COD</b>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{fontSize: '0.85rem'}}>{new Date(o.created_at).toLocaleString()}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', display: 'inline-block'}}>
                      {o.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {o.delivery_partner_id ? (
                      <>
                        {o.delivery_partner_name}<br/>
                        <span style={{fontSize: '0.8rem', color: '#666'}}>D_ID: {o.delivery_partner_id}</span>
                      </>
                    ) : (
                      <i>Unassigned</i>
                    )}
                  </td>
                  <td style={styles.td}>
                    {(!o.items || o.items.length === 0) ? '-' : (
                      o.items.length === 1 ? `1x P#${o.items[0].product_id}` : (
                        <button 
                          style={{...styles.btn, background: '#e9ecef'}}
                          onClick={() => showItems(o.items)}
                        >
                          View {o.items.length} Items
                        </button>
                      )
                    )}
                  </td>
                  <td style={styles.td}>
                    {o.complaints && o.complaints.length > 0 && (
                      (() => {
                        const hasPending = o.complaints.some(c => c.status === 'pending');
                        const btnColor = hasPending ? '#dc3545' : '#1e7e34';
                        const btnText = hasPending ? 'View (Pending)' : 'View (Solved)';
                        return (
                          <button 
                            style={{...styles.btn, background: btnColor, color: '#fff', width: '100%', marginBottom: '5px'}}
                            onClick={() => showComplaints(o.complaints)}
                          >
                            {btnText}
                          </button>
                        );
                      })()
                    )}
                    <button 
                      style={{...styles.btn, background: '#6c757d', color: '#fff', width: '100%'}}
                      onClick={() => handleAddComplaint(o.id)}
                    >
                      + Add
                    </button>
                  </td>
                  <td style={{...styles.td, minWidth: '130px'}}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {o.status === 'picked_up' && (
                        <button 
                          style={{...styles.btn, background: '#0f6674', color: '#fff', width: '100%'}}
                          onClick={() => Swal.fire('Tracking', 'Tracking UI not implemented in this snippet.', 'info')}
                        >
                          📍 Track Delivery
                        </button>
                      )}
                      {!['delivered', 'cancelled'].includes(o.status) ? (
                        <>
                          <button 
                            style={{...styles.btn, background: '#dc3545', color: '#fff', width: '100%'}}
                            onClick={() => handleForceCancel(o.id)}
                          >
                            ❌ Force Cancel
                          </button>
                          <button 
                            style={{...styles.btn, background: '#6f42c1', color: '#fff', width: '100%'}}
                            onClick={() => handleAssignDelivery(o.id)}
                          >
                            🛵 Assign Delivery
                          </button>
                        </>
                      ) : (
                        <span style={{ color: '#888', fontSize: '0.8rem', textAlign: 'center' }}>Completed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {/* Pagination Controls */}
      {data?.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
          <button 
            style={{...styles.btn, background: page > 1 ? '#0d6efd' : '#e9ecef', color: page > 1 ? '#fff' : '#aaa', cursor: page > 1 ? 'pointer' : 'not-allowed'}}
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            &laquo; Previous
          </button>
          <span style={{ fontSize: '0.9rem', color: '#555' }}>
            Page <strong>{data.page}</strong> of <strong>{data.pages}</strong> (Total {data.total} orders)
          </span>
          <button 
            style={{...styles.btn, background: page < data.pages ? '#0d6efd' : '#e9ecef', color: page < data.pages ? '#fff' : '#aaa', cursor: page < data.pages ? 'pointer' : 'not-allowed'}}
            disabled={page >= data.pages}
            onClick={() => setPage(p => p + 1)}
          >
            Next &raquo;
          </button>
        </div>
      )}

        </>
      )}
    </div>
  );
}
