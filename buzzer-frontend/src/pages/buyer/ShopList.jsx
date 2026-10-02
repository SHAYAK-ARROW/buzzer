import FloatingCart from '../../components/FloatingCart';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getShops } from '../../api/browse';

export default function ShopList() {
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => {
          setGeoError('Location permission denied. Showing default area shops.');
          setLocation({ lat: 22.9, lng: 88.4 }); 
        }
      );
    } else {
      setGeoError('Geolocation is not supported by your browser.');
      setLocation({ lat: 22.9, lng: 88.4 });
    }
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['shops', location.lat, location.lng],
    queryFn: () => getShops(location.lat, location.lng),
    enabled: !!location.lat,
  });

  if (!location.lat && !geoError) return <p>📍 Getting your location...</p>;
  if (isLoading) return <p>⏳ Loading shops near you...</p>;
  if (error) return <p style={{ color: 'red' }}>Error loading shops: {error.message}</p>;

  const shops = data?.shops || [];

  return (
    <div>
      {geoError && (
        <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
          ⚠️ {geoError}
        </div>
      )}

      {shops.length === 0 ? (
        <p>No shops available in your area right now.</p>
      ) : (
        <div style={styles.grid}>
          {shops.map((shop) => (
            <Link to={`/buyer/shops/${shop.id}`} key={shop.id} style={styles.card}>
              <div style={styles.status(shop.is_open_now)}>
                {shop.is_open_now ? '🟢 Open' : '🔴 Closed'}
              </div>
              <h3 style={styles.shopName}>{shop.name}</h3>
              <p style={styles.info}>📞 {shop.phone}</p>
              <p style={styles.info}>📍 {shop.address}</p>
              <div style={styles.footer}>
                <span style={styles.badge}>Surge: {shop.surge_multiplier}x</span>
                {shop.distance_km && (
                  <span style={styles.distance}>{(shop.distance_km).toFixed(2)} km away</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      <FloatingCart />
    </div>
  );
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  card: { display: 'block', textDecoration: 'none', color: 'inherit', background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', position: 'relative', transition: 'transform 0.2s' },
  status: (isOpenNow) => ({ position: 'absolute', top: '15px', right: '15px', fontSize: '0.8rem', fontWeight: 'bold', color: isOpenNow ? '#28a745' : '#dc3545', background: isOpenNow ? '#e6f4ea' : '#fce8e6', padding: '4px 8px', borderRadius: '12px' }),
  shopName: { margin: '0 0 10px 0', fontSize: '1.2rem', color: '#333', paddingRight: '60px' },
  info: { margin: '5px 0', color: '#666', fontSize: '0.9rem' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' },
  badge: { background: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' },
  distance: { color: '#0056b3', fontSize: '0.9rem', fontWeight: '500' }
};
