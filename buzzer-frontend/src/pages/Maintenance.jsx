import React from 'react';

export default function Maintenance() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff3cd',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px',
        borderTop: '6px solid #ffc107'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🛠️</div>
        <h1 style={{ color: '#856404', margin: '0 0 15px 0' }}>Under Maintenance</h1>
        <p style={{ color: '#555', fontSize: '1.1rem', lineHeight: '1.6' }}>
          The platform is currently paused for scheduled maintenance or emergency updates. 
        </p>
        <p style={{ color: '#666', marginTop: '15px' }}>
          We are working hard to bring it back online shortly. Please check back later!
        </p>
        
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '30px',
            padding: '10px 30px',
            background: '#ffc107',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
