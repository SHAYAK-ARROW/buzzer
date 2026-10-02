import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function DeliveryTabs() {
  const location = useLocation();
  
  return (
    <div style={{ background: '#fff', borderBottom: '2px solid #eee', marginBottom: '20px' }}>
      <div style={{ width: '95%', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexWrap: 'wrap' }}>
        <Link 
          to="/delivery" 
          style={{ 
            padding: '15px 20px', 
            textDecoration: 'none', 
            fontWeight: 'bold', 
            color: location.pathname === '/delivery' ? '#0d6efd' : '#555',
            borderBottom: location.pathname === '/delivery' ? '3px solid #0d6efd' : '3px solid transparent'
          }}>
          📊 Dashboard
        </Link>
        <Link 
          to="/delivery/available" 
          style={{ 
            padding: '15px 20px', 
            textDecoration: 'none', 
            fontWeight: 'bold', 
            color: location.pathname === '/delivery/available' ? '#0d6efd' : '#555',
            borderBottom: location.pathname === '/delivery/available' ? '3px solid #0d6efd' : '3px solid transparent'
          }}>
          🛒 Available Orders
        </Link>
        <Link 
          to="/delivery/wallet" 
          style={{ 
            padding: '15px 20px', 
            textDecoration: 'none', 
            fontWeight: 'bold', 
            color: location.pathname === '/delivery/wallet' ? '#0d6efd' : '#555',
            borderBottom: location.pathname === '/delivery/wallet' ? '3px solid #0d6efd' : '3px solid transparent'
          }}>
          💰 Wallet
        </Link>
      </div>
    </div>
  );
}
