import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../../components/Navbar';
import { searchGrocery } from '../../api/browse';
import Swal from 'sweetalert2';

export default function ProductSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  
  const [location, setLocation] = useState({ lat: null, lng: null });

  // Get location for search context
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 22.9, lng: 88.4 }) // Default fallback
      );
    } else {
      setLocation({ lat: 22.9, lng: 88.4 });
    }
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['searchGrocery', query, location.lat, location.lng],
    queryFn: () => searchGrocery(query, location.lat, location.lng),
    enabled: !!query && !!location.lat,
  });

  const handleAddToCart = (product, shopId) => {
    // Basic cart logic (to be expanded later)
    Swal.fire({
      icon: 'success',
      title: 'Added to Cart',
      text: `${product.specification} added from shop!`,
      timer: 1500,
      showConfirmButton: false
    });
  };

  if (!query) {
    return (
      <div>
        <Navbar />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Please enter a search term.</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      <Navbar />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <button onClick={() => navigate('/buyer')} className="btn" style={{ marginBottom: '20px', background: '#6c757d', color: '#fff' }}>
          ⬅ Back to Home
        </button>
        
        <h2 style={{ marginBottom: '1.5rem' }}>Search Results for "{query}"</h2>

        {!location.lat ? (
          <p>Getting location context...</p>
        ) : isLoading ? (
          <p>Searching...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>Error: {error.message}</p>
        ) : (
          <div>
            {data?.shops?.length > 0 && (
              <div style={{ marginBottom: '3rem' }}>
                <h3 style={{ borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '5px' }}>🏪 Matching Shops</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '15px' }}>
                  {data.shops.map((shop, idx) => (
                    <div key={idx} onClick={() => navigate(`/buyer/shops/${shop.shop_id}`)} style={{ background: '#fff', padding: '15px', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                      <h4 style={{ margin: '0 0 5px 0' }}>{shop.shop_name}</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>{shop.address}</p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#0056b3', fontWeight: 'bold' }}>{shop.distance_km ? `${shop.distance_km.toFixed(1)} km away` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data?.items?.length > 0 && (
              <div>
                <h3 style={{ borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '5px' }}>📦 Matching Products</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '15px' }}>
                  {data.items.map((item, idx) => (
                    <div key={idx} style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flexGrow: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0' }}>{item.specification}</h4>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#666' }}>{item.company} | {item.quantity_type}</p>
                        
                        <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '6px', fontSize: '0.9rem' }}>
                          <div><strong>Sold By:</strong> {item.shop_name}</div>
                          <div><strong>Distance:</strong> {item.distance_km ? `${item.distance_km.toFixed(1)} km` : 'N/A'}</div>
                          <div style={{ color: item.is_available ? '#28a745' : '#dc3545', fontWeight: 'bold', marginTop: '5px' }}>
                            {item.is_available ? 'In Stock' : 'Out of Stock'}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>₹{item.price}</span>
                        <button 
                          onClick={() => handleAddToCart(item, item.shop_id)}
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
              </div>
            )}

            {data?.shops?.length === 0 && data?.items?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '8px' }}>
                <h3 style={{ color: '#666' }}>No results found for "{query}"</h3>
                <p>Try searching for a different product or shop name.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
