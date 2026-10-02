import React from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';

export default function FloatingCart() {
  const navigate = useNavigate();
  const { items, getTotalPrice } = useCartStore();

  if (items.length === 0) return null;

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div 
      onClick={() => navigate('/checkout')}
      style={{
        position: 'fixed',
        bottom: '80px', // above mobile nav if any
        right: '20px',
        background: '#ff5722',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        zIndex: 9999,
        fontWeight: 'bold'
      }}
    >
      <div style={{ background: '#fff', color: '#ff5722', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
        {totalItems}
      </div>
      <div>
        Cart • ₹{getTotalPrice().toFixed(2)}
      </div>
    </div>
  );
}
