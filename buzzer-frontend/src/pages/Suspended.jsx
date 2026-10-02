import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Suspended() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8d7da',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px',
        borderTop: '6px solid #dc3545'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🚫</div>
        <h1 style={{ color: '#dc3545', margin: '0 0 15px 0' }}>Account Suspended</h1>
        <p style={{ color: '#555', fontSize: '1.1rem', lineHeight: '1.6' }}>
          Your account has been suspended by the administrator due to policy violations or security concerns.
        </p>
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginTop: '20px', color: '#666' }}>
          If you believe this is a mistake, please contact support immediately.
        </div>
        <button 
          onClick={() => navigate('/login')}
          style={{
            marginTop: '30px',
            padding: '10px 25px',
            background: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}
