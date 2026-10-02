import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/client';
import useSocket from '../../../hooks/useSocket';
import Swal from 'sweetalert2';

// ---- Live Location Modal using Leaflet ----
function LiveLocationModal({ user, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !user) return;

    const lat = user.current_latitude;
    const lng = user.current_longitude;
    const hasLocation = lat && lng;

    import('leaflet').then(L => {
      import('leaflet/dist/leaflet.css');

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const center = hasLocation ? [lat, lng] : [22.5726, 88.3639]; // Kolkata default
      const map = L.default.map(mapRef.current).setView(center, hasLocation ? 15 : 11);
      mapInstanceRef.current = map;

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);

      if (hasLocation) {
        const icon = L.default.divIcon({
          className: '',
          html: `<div style="background:#28a745;color:#fff;padding:6px 10px;border-radius:20px;font-weight:bold;font-size:0.85rem;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap">🚲 ${user.name || 'Delivery Boy'}</div>`
        });
        markerRef.current = L.default.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${user.name}</b><br>Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}`)
          .openPopup();
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [user]);

  // Auto-refresh every 10s to update location
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await api.get(`/admin/users/${user.id}`);
        const lat = fresh?.current_latitude;
        const lng = fresh?.current_longitude;
        if (lat && lng && markerRef.current && mapInstanceRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          // Don't pan every time to avoid annoying UX
        }
      } catch (_) { /* silent */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;
  const hasLocation = user.current_latitude && user.current_longitude;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '700px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ background: 'linear-gradient(135deg, #28a745, #20c997)', color: '#fff', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>🚲 Live Location — {user.name}</h3>
            <small style={{ opacity: 0.85 }}>
              {hasLocation
                ? `📍 Lat: ${user.current_latitude?.toFixed(4)}, Lng: ${user.current_longitude?.toFixed(4)} · Auto-updates every 10s`
                : '⚠️ Location not available — Delivery boy may be offline'}
            </small>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
        <div ref={mapRef} style={{ width: '100%', height: '450px' }}></div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa' }}>
          <span style={{ fontSize: '0.85rem', color: '#666' }}>
            {hasLocation ? '🟢 Location available' : '🔴 No location data'}
          </span>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function UsersTab({ activeSubTab, setActiveSubTab }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');

  // Modal States
  const [detailsModalUser, setDetailsModalUser] = useState(null);
  const [locationModalUser, setLocationModalUser] = useState(null);
  
  const [notifyModalUserId, setNotifyModalUserId] = useState(null);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifyChannels, setNotifyChannels] = useState({ push: true, sms: false, email: false });

  const subTabs = ['All', 'User', 'Seller', 'Delivery Boy', 'Admin', 'Deleted'];

  // Determine API params based on state
  
  useEffect(() => {
    setPage(1);
  }, [activeSubTab]);

  const isDeleted = activeSubTab === 'Deleted';
  const role = isDeleted ? '' : 
               activeSubTab === 'All' ? 'all' : 
               activeSubTab === 'Delivery Boy' ? 'delivery' : 
               (activeSubTab || '').toLowerCase();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminUsers', activeSubTab, searchQuery, page],
    queryFn: () => api.get('/admin/users', { 
      params: { 
        is_deleted: isDeleted,
        role: role,
        search: searchQuery,
          page,
          per_page: 50
      }
    }),
    staleTime: 5 * 60 * 1000,
  });

  useSocket('users_update', () => refetch());

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleToggleSuspend = async (user) => {
    const actionText = user.is_suspended ? 'Unsuspend' : 'Suspend';
    const confirmResult = await Swal.fire({
      title: `Are you sure?`,
      text: `Do you want to ${actionText.toLowerCase()} ${user.name || user.email}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: user.is_suspended ? '#1e7e34' : '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Yes, ${actionText} it!`
    });

    if (!confirmResult.isConfirmed) return;

    try {
      await api.patch(`/admin/users/${user.id}/suspend`, { suspend: !user.is_suspended });
      Swal.fire('Success!', `User has been ${actionText.toLowerCase()}ed.`, 'success');
      refetch();
    } catch (err) {
      Swal.fire('Error', "Failed: " + (err.response?.data?.message || err.message), 'error');
    }
  };

  
  const handleApproveUser = async (user) => {
    const confirmResult = await Swal.fire({
      title: 'Approve User?',
      text: 'Do you want to approve so they can start working?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1e7e34',
      confirmButtonText: 'Yes, Approve!'
    });
    if (!confirmResult.isConfirmed) return;
    try {
      await api.patch(`/admin/users/${user.id}/approve`);
      Swal.fire('Success', 'User has been approved to work.', 'success');
      refetch();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || err.message, 'error');
    }
  };

  const handleToggleVerify = async (user) => {
    const confirmResult = await Swal.fire({
      title: 'Verify Partner?',
      text: `Do you want to toggle verification for ${user.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0d6efd',
      confirmButtonText: 'Yes, Toggle it!'
    });
    if (!confirmResult.isConfirmed) return;
    try {
      const res = await api.patch(`/admin/users/${user.id}/verify`);
      Swal.fire('Success', res.message || 'Verification toggled.', 'success');
      refetch();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || err.message, 'error');
    }
  };

  const handleTopup = async (user) => {
    const { value: amount } = await Swal.fire({
      title: 'Top-up Wallet',
      input: 'number',
      inputLabel: `Enter amount to top-up for ${user.name}`,
      inputPlaceholder: 'e.g. 500',
      showCancelButton: true,
      confirmButtonColor: '#ffc107',
      inputValidator: (value) => {
        if (!value || value <= 0) return 'Please enter a valid positive number';
      }
    });
    if (!amount) return;
    try {
      await api.post(`/admin/wallet/topup`, { user_id: user.id, amount: parseFloat(amount) });
      Swal.fire('Success', `₹${amount} added to wallet!`, 'success');
      refetch();
    } catch (err) {
      Swal.fire('Error', err.error || err.message, 'error');
    }
  };

  const handleEdit = async (user) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit User',
      html:
        `<div style="text-align: left; font-size: 0.9rem; margin-bottom: 5px;"><strong>Name:</strong></div>` +
        `<input id="swal-edit-name" class="swal2-input" style="margin-top:0; margin-bottom:15px;" placeholder="Name" value="${user.name || ''}">` +
        `<div style="text-align: left; font-size: 0.9rem; margin-bottom: 5px;"><strong>Nickname:</strong></div>` +
        `<input id="swal-edit-nickname" class="swal2-input" style="margin-top:0; margin-bottom:15px;" placeholder="Nickname" value="${user.nickname || ''}">` +
        `<div style="text-align: left; font-size: 0.9rem; margin-bottom: 5px;"><strong>Phone:</strong></div>` +
        `<input id="swal-edit-phone" class="swal2-input" style="margin-top:0;" placeholder="Phone" value="${user.phone || ''}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#ffc107',
      confirmButtonText: 'Save Changes',
      preConfirm: () => {
        return {
          name: document.getElementById('swal-edit-name').value,
          nickname: document.getElementById('swal-edit-nickname').value,
          phone: document.getElementById('swal-edit-phone').value
        }
      }
    });

    if (formValues) {
      try {
        await api.patch(`/admin/users/${user.id}`, formValues);
        Swal.fire('Saved!', 'User details updated successfully.', 'success');
        refetch();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || err.message, 'error');
      }
    }
  };

  const handleSendNotification = async () => {
    if (!notifyMessage.trim()) {
      return Swal.fire('Wait!', 'Message cannot be empty', 'warning');
    }
    
    const channels = [];
    if (notifyChannels.push) channels.push('push');
    if (notifyChannels.sms) channels.push('sms');
    if (notifyChannels.email) channels.push('email');

    try {
      await api.post('/notifications/broadcast', {
        title: 'Admin Notification',
        body: notifyMessage,
        target_type: 'specific_users',
        target_user_ids: [notifyModalUserId],
        channels: channels
      });
      Swal.fire('Sent!', 'Notification sent successfully!', 'success');
      setNotifyModalUserId(null);
      setNotifyMessage('');
    } catch (err) {
      Swal.fire('Failed', "Failed to send notification: " + (err.response?.data?.message || err.message), 'error');
    }
  };

  const users = data?.users || [];
  const total = data?.pagination?.total || users.length;

  return (
    <div>
      <style>{`
        @media (max-width: 768px) {
          .desktop-subtabs {
            display: none !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
          .uid-cell {
            max-width: 60px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: pointer;
          }
          .uid-cell.expanded {
            max-width: none;
            white-space: normal;
          }
        }
        
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5); z-index: 1000;
          display: flex; justify-content: center; align-items: center;
        }
        .modal-content {
          background: white; padding: 25px; border-radius: 8px; width: 90%; max-width: 500px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          max-height: 90vh; overflow-y: auto;
        }
      `}</style>

      {/* Details Modal */}
      {detailsModalUser && (
        <div className="modal-overlay" onClick={() => setDetailsModalUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{marginTop: 0}}>User Details</h3>
            <p><strong>Name:</strong> {detailsModalUser.name || 'N/A'}</p>
            <p><strong>Nickname:</strong> {detailsModalUser.nickname || 'N/A'}</p>
            <p><strong>Email:</strong> {detailsModalUser.email}</p>
            <p><strong>Role:</strong> {detailsModalUser.role.toUpperCase()}</p>
            <p><strong>UID:</strong> {detailsModalUser.uid}</p>
            <p><strong>Phone:</strong> {detailsModalUser.phone || 'N/A'}</p>
            <p><strong>Wallet Balance:</strong> ₹{detailsModalUser.wallet_balance}</p>
            <p><strong>Status:</strong> {detailsModalUser.is_suspended ? 'Suspended' : 'Active'}</p>
            <p><strong>Joined:</strong> {new Date(detailsModalUser.created_at).toLocaleString()}</p>
            
            <button style={{...styles.actionBtn, background: '#6c757d', color: 'white', marginTop: '15px', padding: '8px'}} onClick={() => setDetailsModalUser(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Notify Modal */}
      {notifyModalUserId && (
        <div className="modal-overlay" onClick={() => setNotifyModalUserId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{marginTop: 0}}>Send Notification</h3>
            <textarea 
              value={notifyMessage}
              onChange={e => setNotifyMessage(e.target.value)}
              style={{width: '100%', height: '100px', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc'}}
              placeholder="Enter message..."
            />
            <div style={{marginBottom: '15px'}}>
              <label style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>Channels:</label>
              <div><input type="checkbox" checked={notifyChannels.push} onChange={e => setNotifyChannels({...notifyChannels, push: e.target.checked})} /> Push Notification</div>
              <div><input type="checkbox" checked={notifyChannels.sms} onChange={e => setNotifyChannels({...notifyChannels, sms: e.target.checked})} /> SMS</div>
              <div><input type="checkbox" checked={notifyChannels.email} onChange={e => setNotifyChannels({...notifyChannels, email: e.target.checked})} /> Email</div>
            </div>
            <div style={{display: 'flex', gap: '10px'}}>
              <button style={{...styles.actionBtn, background: '#0d6efd', color: 'white', padding: '8px'}} onClick={handleSendNotification}>Send Notification</button>
              <button style={{...styles.actionBtn, background: '#6c757d', color: 'white', padding: '8px'}} onClick={() => setNotifyModalUserId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>Manage Users <span style={{fontSize: '0.9rem', color: '#666', fontWeight: 'normal'}}>({total} total)</span></h3>
        <button style={styles.newAdminBtn}>+ Add New Admin</button>
      </div>

      {/* Toolbar (Sub-tabs + Search) */}
      <div style={styles.toolbar}>
        <div style={styles.subTabsContainer} className="desktop-subtabs">
          {subTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              style={activeSubTab === tab ? styles.activeSubTab : styles.subTab}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input 
            type="text" 
            placeholder="Search name / email / UID..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchBtn}>🔍</button>
        </form>
      </div>

      {/* Loading & Error */}
      {isLoading && <p>Loading users...</p>}
      {error && <p style={{color: 'red'}}>Error: {error.message}</p>}

      {/* Data Table */}
      {!isLoading && !error && (
        <>
        <div style={{ overflowX: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>UID</th>
                <th style={styles.th}>Name</th>
                <th style={{...styles.th}} className="hide-on-mobile">Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Status</th>
                <th style={{...styles.th}} className="hide-on-mobile">Phone</th>
                <th style={{...styles.th}} className="hide-on-mobile">Verification</th>
                <th style={{...styles.th}} className="hide-on-mobile">Wallet</th>
                <th style={{...styles.th}} className="hide-on-mobile">Complaints</th>
                <th style={{...styles.th}} className="hide-on-mobile">Live Track</th>
                <th style={{...styles.th, width: '150px', textAlign: 'center'}}>Details</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={styles.tr}>
                  <td 
                    style={styles.td} 
                    className="uid-cell"
                    onClick={(e) => e.currentTarget.classList.toggle('expanded')}
                    title="Click to expand"
                  >
                    {user.uid}
                  </td>
                  <td style={{...styles.td, fontWeight: 'bold'}}>
                    {user.name || 'N/A'}
                    {user.nickname && (
                      <><br/><span style={{fontSize: '0.8rem', color: '#666', fontWeight: 'normal'}}>({user.nickname})</span></>
                    )}
                  </td>
                  <td style={styles.td} className="hide-on-mobile">{user.email}</td>
                  
                  <td style={styles.td}>
                    <strong>{user.role.toUpperCase()}</strong><br/>
                    <span style={{color: '#1e7e34', fontSize: '0.8rem'}}>● Online</span>
                  </td>
                  
                  <td style={styles.td}>
                    {user.is_suspended ? 
                      <span style={{color: '#dc3545', fontWeight: 'bold'}}>Suspended</span> : 
                      <span style={{color: '#1e7e34', fontWeight: 'bold'}}>Active</span>
                    }
                  </td>
                  
                  <td style={styles.td} className="hide-on-mobile">{user.phone || 'N/A'}</td>
                  
                  <td style={styles.td} className="hide-on-mobile">
                    {(user.role === 'delivery' || user.role === 'seller') ? (
                      <button 
                        style={{...styles.verifyBtn, background: user.is_platform_verified ? '#ffc107' : '#0d6efd', color: user.is_platform_verified ? 'black' : 'white'}} 
                        onClick={() => handleToggleVerify(user)}
                      >
                        {user.is_platform_verified ? 'Unverify' : 'Verify'}
                      </button>
                    ) : '-'}
                  </td>
                  
                  <td style={styles.td} className="hide-on-mobile">
                    {(user.role === 'delivery' || user.role === 'seller') ? (
                      <button style={styles.topupBtn} onClick={() => handleTopup(user)}>Top-up</button>
                    ) : '-'}
                  </td>
                  
                  <td style={styles.td} className="hide-on-mobile">
                    <span style={styles.badge}>0</span>
                  </td>
                  
                  <td style={{...styles.td, verticalAlign: 'top'}}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '140px', margin: '0 auto'}}>
                      <button 
                        style={{...styles.actionBtn, background: '#0d6efd', color: 'white'}}
                        onClick={() => setDetailsModalUser(user)}
                      >
                        View Details
                      </button>
                      <button 
                        style={{...styles.actionBtn, background: '#ffc107', color: 'black'}}
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </button>
                      {user.role === 'delivery' && (
                        <button 
                          style={{...styles.actionBtn, background: '#6f42c1', color: 'white'}}
                          onClick={() => setLocationModalUser(user)}
                        >
                          📍 Location
                        </button>
                      )}
                      <button 
                        style={{...styles.actionBtn, background: user.is_suspended ? '#1e7e34' : '#dc3545', color: 'white'}}
                        onClick={() => handleToggleSuspend(user)}
                      >
                        {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                      <button 
                        style={{...styles.actionBtn, background: '#0f6674', color: 'white'}}
                        onClick={() => setNotifyModalUserId(user.id)}
                      >
                        Notify User
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>No users found.</p>}
        </div>
        </>
      )}

      {/* Live Location Modal */}
      {locationModalUser && (
        <LiveLocationModal user={locationModalUser} onClose={() => setLocationModalUser(null)} />
      )}
    </div>
  );
}

const styles = {
  newAdminBtn: {
    background: '#0d6efd',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  toolbar: {
    display: 'flex',
    gap: '15px',
    marginBottom: '15px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  subTabsContainer: {
    display: 'flex',
    gap: '4px',
  },
  subTab: {
    background: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    borderRadius: '2px',
  },
  activeSubTab: {
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    borderRadius: '2px',
    fontWeight: 'bold',
  },
  searchForm: {
    display: 'flex',
    flex: 1,
    minWidth: '300px',
  },
  searchInput: {
    flex: 1,
    padding: '6px 12px',
    border: '1px solid #ced4da',
    borderRight: 'none',
    borderRadius: '4px 0 0 4px',
    outline: 'none',
  },
  searchBtn: {
    background: '#495057',
    border: '1px solid #495057',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '0 4px 4px 0',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'white',
    fontSize: '0.9rem',
  },
  theadRow: {
    background: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
  },
  th: {
    padding: '12px 8px',
    textAlign: 'left',
    color: '#212529',
    fontWeight: 'bold',
  },
  tr: {
    borderBottom: '1px solid #dee2e6',
  },
  td: {
    padding: '12px 8px',
    verticalAlign: 'middle',
  },
  verifyBtn: {
    background: '#0d6efd',
    color: 'white',
    border: 'none',
    padding: '4px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  topupBtn: {
    background: '#ffc107',
    color: 'black',
    border: 'none',
    padding: '4px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
  },
  badge: {
    background: '#1e7e34',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
  },
  actionBtn: {
    border: 'none',
    padding: '4px 0',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  }
};
