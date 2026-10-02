import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../../components/Navbar';
import FloatingCart from '../../components/FloatingCart';
import { getShopProducts } from '../../api/browse';
import Swal from 'sweetalert2';
import useCartStore from '../../store/cartStore';

export default function ProductList() {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['shopProducts', shopId],
    queryFn: () => getShopProducts(shopId),
  });

  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (product, targetShopId) => {
    try {
      addItem(product, targetShopId);
      Swal.fire({
        icon: 'success',
        title: 'Added to Cart',
        text: `${product.global_item?.specification || product.name || 'Item'} added to your cart!`,
        timer: 1000,
        showConfirmButton: false
      });
    } catch(e) {
      Swal.fire({ icon: 'error', title: 'Cart Error', text: e.message });
    }
  };

  if (isLoading) {
    return (
      <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <Navbar />
        <div style={{ padding: '2rem', textAlign: 'center' }}>⏳ Loading shop and products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <Navbar />
        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
          Error: {error.message}
        </div>
      </div>
    );
  }

  const shop = data?.shop;
  const products = data?.products || [];

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      <Navbar />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <button onClick={() => navigate('/buyer')} className="btn" style={{ marginBottom: '20px', background: '#6c757d', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer' }}>
          ⬅️ Back to Home
        </button>

        {shop && (
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 10px 0' }}>🏪 {shop.name}</h2>
                <p style={{ margin: '5px 0', color: '#555' }}>📍 {shop.address}</p>
                <p style={{ margin: '5px 0', color: '#555' }}>📞 {shop.phone}</p>
              </div>
              <div style={{ padding: '5px 15px', borderRadius: '20px', background: shop.is_active ? '#e6f4ea' : '#fce8e6', color: shop.is_active ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                {shop.is_active ? '🟢 Open' : '🔴 Closed'}
              </div>
            </div>
          </div>
        )}

        <h3 style={{ borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '5px' }}>
          📦 Products Available ({products.length})
        </h3>

        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '8px', marginTop: '20px' }}>
            <h4 style={{ color: '#666' }}>No products available in this shop.</h4>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {products.map((item) => (
              <div key={item.id} style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flexGrow: 1 }}>
                  {item.image_url && (
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                      <img src={item.image_url} alt="Product" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=No+Image'; }} style={{ maxWidth: '100%', height: '120px', objectFit: 'contain', borderRadius: '4px' }} />
                    </div>
                  )}

                  <h4 style={{ margin: '0 0 5px 0' }}>{item.global_item?.specification || "Unnamed Product"}</h4>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#666' }}>
                    {item.global_item?.company || ""} | {item.unit_value ? `${item.unit_value} ${item.unit_measure}` : ""}
                  </p>
                  
                  <div style={{ color: item.is_available ? '#28a745' : '#dc3545', fontWeight: 'bold', marginTop: '10px', fontSize: '0.9rem' }}>
                    {item.is_available ? 'In Stock' : 'Out of Stock'}
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>₹{item.price}</span>
                  <button 
                    onClick={() => handleAddToCart(item, shopId)}
                    disabled={!item.is_available}
                    style={{
                      background: item.is_available ? 'var(--primary)' : '#ccc',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 15px',
                      borderRadius: '4px',
                      cursor: item.is_available ? 'pointer' : 'not-allowed',
                      fontWeight: 'bold'
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <FloatingCart />
    </div>
  );
}