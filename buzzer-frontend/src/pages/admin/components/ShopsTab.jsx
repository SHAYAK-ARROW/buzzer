import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/client';
import useSocket from '../../../hooks/useSocket';
import Swal from 'sweetalert2';

export default function ShopsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  
  // Modal states
  const [statsModalShop, setStatsModalShop] = useState(null);
  const [statsData, setStatsData] = useState(null);
  
  const [notifyModalUserId, setNotifyModalUserId] = useState(null);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifyChannels, setNotifyChannels] = useState({ push: true, sms: false, email: false });

  const [complaintsModalShop, setComplaintsModalShop] = useState(null);
  const [complaintsData, setComplaintsData] = useState(null);

  const [ownerProfileModal, setOwnerProfileModal] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminShops', searchQuery, page],
    queryFn: () => api.get('/admin/shops', {
      params: { 
        is_deleted: false,
        search: searchQuery,
          page,
          per_page: 50
      }
    }),
    staleTime: 5 * 60 * 1000,
  });

  useSocket('shops_update', () => refetch());

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleViewStats = async (shop) => {
    setStatsModalShop(shop);
    setStatsData('loading');
    try {
      const res = await api.get(`/admin/shops/${shop.id}/response-stats`);
      setStatsData(res);
    } catch (err) {
      setStatsData({ error: err.response?.data?.message || err.message });
    }
  };

  const handleViewComplaints = async (shop) => {
    setComplaintsModalShop(shop);
    setComplaintsData('loading');
    try {
      const res = await api.get(`/admin/complaints`, {
        params: { role: 'seller', target_id: shop.owner_id }
      });
      setComplaintsData(res.data?.complaints || []);
    } catch (err) {
      setComplaintsData({ error: err.response?.data?.message || err.message });
    }
  };

  const handleOwnerProfile = async (shop) => {
    setOwnerProfileModal('loading');
    try {
      const res = await api.get(`/admin/users/${shop.owner_id}`);
      setOwnerProfileModal(res.user);
    } catch (err) {
      setOwnerProfileModal({ error: err.error || err.message });
    }
  };

  const handleSendNotification = async () => {
    if (!notifyMessage.trim()) return Swal.fire('Wait!', 'Message cannot be empty', 'warning');
    
    // Convert boolean flags to array of channels expected by API
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

  const shops = data?.shops || [];
  const total = data?.pagination?.total || shops.length;

  return (
    <div>
      <style>{`
        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none !important;
          }
          .expandable-cell {
            max-width: 80px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: pointer;
          }
          .expandable-cell.expanded {
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

      {/* Owner Profile Modal */}
      {ownerProfileModal && (
        <div className="modal-overlay" onClick={() => setOwnerProfileModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{marginTop: 0}}>Owner Details</h3>
            <p><strong>Name:</strong> {ownerProfileModal.name || 'N/A'}</p>
            <p><strong>Nickname:</strong> {ownerProfileModal.nickname || 'N/A'}</p>
            <p><strong>Email:</strong> {ownerProfileModal.email}</p>
            <p><strong>UID:</strong> {ownerProfileModal.uid}</p>
            <p><strong>Phone:</strong> {ownerProfileModal.phone || 'N/A'}</p>
            <p><strong>Wallet Balance:</strong> ₹{ownerProfileModal.wallet_balance}</p>
            <p><strong>Status:</strong> {ownerProfileModal.is_suspended ? 'Suspended' : 'Active'}</p>
            <p><strong>Joined:</strong> {new Date(ownerProfileModal.created_at).toLocaleString()}</p>
            
            <button style={{...styles.actionBtn, background: '#6c757d', color: 'white', marginTop: '15px', padding: '8px'}} onClick={() => setOwnerProfileModal(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Complaints Modal */}
      {complaintsModalShop && (
        <div className="modal-overlay" onClick={() => setComplaintsModalShop(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{marginTop: 0}}>Complaints: {complaintsModalShop.name}</h3>
            {complaintsData === 'loading' ? <p>Loading complaints...</p> : 
             complaintsData?.error ? <p style={{color: 'red'}}>{complaintsData.error}</p> :
             complaintsData?.length === 0 ? <p style={{color: '#1e7e34', fontWeight: 'bold'}}>No complaints found for this shop!</p> :
             (
               <div>
                 {complaintsData.map(c => (
                   <div key={c.id} style={{padding: '10px', borderBottom: '1px solid #eee', marginBottom: '10px'}}>
                     <p style={{margin: '0 0 5px 0', fontSize: '0.85rem', color: '#666'}}>Order #{c.order_id} - {new Date(c.created_at).toLocaleString()}</p>
                     <p style={{margin: '0 0 5px 0'}}><strong>Reason:</strong> {c.reason}</p>
                     <p style={{margin: '0', fontSize: '0.85rem'}}><strong>Status:</strong> <span style={{color: c.status === 'resolved' ? '#1e7e34' : '#dc3545', fontWeight: 'bold'}}>{c.status.toUpperCase()}</span></p>
                   </div>
                 ))}
               </div>
             )}
            <button style={{...styles.actionBtn, background: '#6c757d', color: 'white', marginTop: '15px', padding: '8px'}} onClick={() => setComplaintsModalShop(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {statsModalShop && (
        <div className="modal-overlay" onClick={() => setStatsModalShop(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{marginTop: 0}}>Shop Stats: {statsModalShop.name}</h3>
            {statsData === 'loading' ? <p>Loading stats...</p> : 
             statsData?.error ? <p style={{color: 'red'}}>{statsData.error}</p> :
             statsData?.last_30_days ? (
               <div style={{display: 'flex', gap: '20px', flexDirection: 'column'}}>
                 <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '5px'}}>
                   <h4 style={{marginTop: 0, marginBottom: '10px', color: '#495057'}}>Last 30 Days</h4>
                   <p style={{margin: '5px 0'}}><strong>Total Orders:</strong> {statsData.last_30_days.total_orders}</p>
                   <p style={{margin: '5px 0'}}><strong>Accepted Orders:</strong> {statsData.last_30_days.accepted_orders}</p>
                   <p style={{margin: '5px 0'}}><strong>Delivered Orders:</strong> {statsData.last_30_days.completed_orders}</p>
                   <p style={{margin: '5px 0'}}><strong>Ignored / Missed:</strong> {statsData.last_30_days.seller_no_response_cancellations}</p>
                   <p style={{margin: '5px 0'}}><strong>Total Revenue:</strong> ₹{statsData.last_30_days.total_revenue}</p>
                   <p style={{margin: '5px 0'}}><strong>Response Rate:</strong> <span style={{color: statsData.last_30_days.response_rate >= 80 ? '#1e7e34' : '#dc3545', fontWeight: 'bold'}}>{statsData.last_30_days.response_rate}%</span></p>
                 </div>
                 
                 <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '5px'}}>
                   <h4 style={{marginTop: 0, marginBottom: '10px', color: '#495057'}}>Overall</h4>
                   <p style={{margin: '5px 0'}}><strong>Active Products:</strong> {statsData.all_time?.active_products || 0}</p>
                   <p style={{margin: '5px 0'}}><strong>Average Rating:</strong> {statsData.all_time?.avg_rating > 0 ? `⭐ ${statsData.all_time.avg_rating}` : 'No ratings yet'}</p>
                 </div>
               </div>
             ) : null}
            <button style={{...styles.actionBtn, background: '#6c757d', color: 'white', marginTop: '15px', padding: '8px'}} onClick={() => setStatsModalShop(null)}>Close</button>
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
        <h3 style={{ margin: 0 }}>Manage Shops <span style={{fontSize: '0.9rem', color: '#666', fontWeight: 'normal'}}>({total} total)</span></h3>
        <button style={styles.newShopBtn}>+ Add New Shop</button>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input 
            type="text" 
            placeholder="Search shop name, owner, UID..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchBtn}>🔍</button>
        </form>
      </div>

      {/* Loading & Error */}
      {isLoading && <p>Loading shops...</p>}
      {error && <p style={{color: 'red'}}>Error: {error.message}</p>}

      {/* Data Table */}
      {!isLoading && !error && (
        <>
        <div style={{ overflowX: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Shop Name & Address</th>
                <th style={styles.th}>Owner Name</th>
                <th style={styles.th}>UID</th>
                <th style={styles.th}>Status</th>
                <th style={{...styles.th, width: '200px', textAlign: 'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shops.map(shop => (
                <tr key={shop.id} style={styles.tr}>
                  <td style={styles.td}>{shop.id}</td>
                  
                  <td style={styles.td}>
                    <strong>{shop.name}</strong><br/>
                    <small style={{color: '#666'}}>{shop.address}</small>
                  </td>
                  
                  <td style={styles.td}>
                    <strong>{shop.owner_name || 'N/A'}</strong>
                  </td>

                  <td 
                    style={styles.td}
                    className="expandable-cell"
                    onClick={(e) => e.currentTarget.classList.toggle('expanded')}
                    title="Click to expand"
                  >
                    {shop.owner_uid}
                    <br/><small style={{color: '#999'}}>U_ID: {shop.owner_id}</small>
                  </td>
                  
                  <td style={styles.td}>
                    {shop.is_approved ? 
                      <span style={{color: '#1e7e34', fontWeight: 'bold'}}>Approved</span> : 
                      <span style={{color: '#dc3545', fontWeight: 'bold'}}>Pending</span>
                    }
                  </td>
                  
                  <td style={{...styles.td, verticalAlign: 'top'}}>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '180px', margin: '0 auto'}}>
                      <button 
                        style={{...styles.actionBtn, background: '#0d6efd', color: 'white'}}
                        onClick={() => handleOwnerProfile(shop)}
                      >
                        Owner Profile
                      </button>
                      <button 
                        style={{...styles.actionBtn, background: '#0f6674', color: 'white'}}
                        onClick={() => handleViewStats(shop)}
                      >
                        View Stats
                      </button>
                      <button 
                        style={{...styles.actionBtn, background: '#dc3545', color: 'white'}}
                        onClick={() => handleViewComplaints(shop)}
                      >
                        View Complaints
                      </button>
                      <button 
                        style={{...styles.actionBtn, background: '#ffc107', color: 'black'}}
                        onClick={() => setNotifyModalUserId(shop.owner_id)}
                      >
                        Notify User
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shops.length === 0 && <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>No shops found.</p>}
        </div>
        </>
      )}
    </div>
  );
}

const styles = {
  newShopBtn: {
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
  actionBtn: {
    border: 'none',
    padding: '4px 0',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    transition: 'opacity 0.2s',
  }
};


