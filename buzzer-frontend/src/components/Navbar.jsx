import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { removeToken, getUserRole } from '../utils/token';
import api from '../api/client';

export default function Navbar() {
  const navigate = useNavigate();
  const role = getUserRole();
  const queryClient = useQueryClient();
  const [showNotifs, setShowNotifs] = useState(false);

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => api.get('/notifications/unread-count').then(res => res.data || res),
    refetchInterval: 30000 // poll every 30s
  });

  // Fetch notifications
  const { data: notifsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(res => res.data || res),
    enabled: showNotifs
  });

  // Mark as read mutation
  
    const markAllAsRead = useMutation({
      mutationFn: () => api.patch('/notifications/read-all'),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      }
    });

const markAsRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    }
  });

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const unreadCount = unreadData?.unread_count || 0;
  const notifications = notifsData?.notifications || [];

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <Link to={`/${role}`} style={styles.logo}>Buzzer</Link>
      </div>
      
      <div style={styles.links}>
        {role === 'user' && (
          <>
            <Link to="/buyer" style={styles.link}>Shops</Link>
            <Link to="/buyer/orders" style={styles.link}>My Orders</Link>
            <Link to="/buyer/wishlist" style={styles.link}>Wishlist</Link>
            <Link to="/buyer/wallet" style={styles.link}>Wallet</Link>
          </>
        )}
        
        {role === 'seller' && (
          <>
            <Link to="/seller" style={styles.link}>Dashboard</Link>
          </>
        )}
        
        {role === 'delivery' && (
          <>
            
            
            <Link to="/delivery/wallet" style={styles.link}>Wallet</Link>
          </>
        )}

        <div style={{display: 'flex', alignItems: 'center', gap: '20px', marginLeft: '10px'}}>
          {/* Notification Bell */}
          <div style={{position: 'relative', cursor: 'pointer'}} onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unreadCount > 0) markAllAsRead.mutate(); }}>
            <span style={{fontSize: '1.5rem'}}>🔔</span>
            {unreadCount > 0 && (
              <span style={styles.badge}>{unreadCount}</span>
            )}
            
            {/* Notification Dropdown */}
            {showNotifs && (
              <div style={styles.notifDropdown}>
                <h4 style={{margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>Notifications</h4>
                <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                  {notifications.length === 0 ? (
                    <p style={{fontSize: '0.9rem', color: '#666', textAlign: 'center'}}>No notifications.</p>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        style={{...styles.notifItem, opacity: n.is_read ? 0.6 : 1, background: n.is_read ? 'white' : '#f0f4ff'}}
                        onClick={() => {
                          if (!n.is_read) markAsRead.mutate(n.id);
                        }}
                      >
                        <strong style={{display: 'block', fontSize: '0.9rem'}}>{n.title}</strong>
                        <div style={{fontSize: '0.8rem', color: '#555', marginTop: '4px'}}>{n.message}</div>
                        <div style={{fontSize: '0.7rem', color: '#999', marginTop: '6px'}}>
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Icon */}
          <div 
            style={styles.profileIcon}
            onClick={handleProfileClick}
            title="My Profile"
          >
            👤
          </div>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
    position: 'relative',
    zIndex: 1000,
  },
  brand: {
    fontWeight: 'bold',
    fontSize: '1.5rem',
  },
  logo: {
    textDecoration: 'none',
    color: '#4f46e5',
  },
  links: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center',
  },
  link: {
    textDecoration: 'none',
    color: '#333',
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    background: '#ffc107',
    color: '#000',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '0.7rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
  },
  notifDropdown: {
    position: 'absolute',
    top: '40px',
    right: '-10px',
    background: 'white',
    width: '300px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    borderRadius: '8px',
    padding: '15px',
    zIndex: 1001,
    border: '1px solid #ddd'
  },
  notifItem: {
    padding: '10px',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    borderRadius: '4px',
    marginBottom: '5px'
  },
  profileIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#4f46e5',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.2rem',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  }
};

