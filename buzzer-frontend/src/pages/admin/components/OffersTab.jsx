import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../api/client';

export default function OffersTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminOffers'],
    queryFn: () => api.get('/admin/offers')
  });

  if (isLoading) return <p>Loading offers...</p>;
  if (error) return <div style={{ color: 'red' }}>Error: {error.message}</div>;

  const offers = data?.offers || [];

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>All Active Offers</h3>
      
      {offers.length === 0 ? (
        <p>No active offers found.</p>
      ) : (
        <div style={{ overflowX: 'auto', width: '100%', background: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Shop</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Title</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Discount</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{o.shop_name}</td>
                  <td style={{ padding: '10px' }}>{o.title}</td>
                  <td style={{ padding: '10px' }}>{o.offer_type.replace(/_/g, ' ').toUpperCase()}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>
                    {o.is_percentage ? `${o.discount_value}%` : `₹${o.discount_value}`} off
                  </td>
                  <td style={{ padding: '10px' }}>
                    {o.is_active ? (
                      <span style={{ padding: '4px 8px', background: '#198754', color: '#fff', borderRadius: '4px', fontSize: '0.8rem' }}>Active</span>
                    ) : (
                      <span style={{ padding: '4px 8px', background: '#6c757d', color: '#fff', borderRadius: '4px', fontSize: '0.8rem' }}>Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
