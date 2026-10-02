import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '../../components/Navbar';
import api from '../../api/client';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

export default function Wishlist() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist'),
  });

  const toggleMutation = useMutation({
    mutationFn: (productId) => api.post(`/wishlist/toggle/${productId}`),
    onSuccess: (res) => {
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: res.data?.message || 'Wishlist updated!', showConfirmButton: false, timer: 1500 });
      queryClient.invalidateQueries(['wishlist']);
    },
    onError: (err) => {
      Swal.fire('Error', err.response?.data?.message || err.message || 'Failed to update wishlist', 'error');
    }
  });

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '50px' }}>
      <Navbar />
      <div style={{ width: '95%', maxWidth: '1200px', margin: '2rem auto' }}>
        <h2><i className="fas fa-heart" style={{color: '#e83e8c'}}></i> আমার উইশলিস্ট</h2>

        {isLoading ? (
          <p>লোড হচ্ছে...</p>
        ) : !data?.data?.wishlist || data.data.wishlist.length === 0 ? (
          <div style={{textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px'}}>
            <p style={{fontSize: '1.2rem', color: '#666'}}>আপনার উইশলিস্ট খালি।</p>
            <button className="btn" style={{marginTop: '1rem'}} onClick={() => navigate('/buyer')}>শপিং করুন</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {data.data.wishlist.map(w => (
              <div key={w.id} style={{ background: '#fff', borderRadius: '12px', padding: '15px', position: 'relative', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                <button
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: '#e83e8c', fontSize: '1.2rem', cursor: 'pointer' }}
                  onClick={() => toggleMutation.mutate(w.product_id)}
                  title="উইশলিস্ট থেকে সরান"
                >
                  <i className="fas fa-heart"></i>
                </button>
                <div style={{height: '150px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  {w.product?.image_url ? (
                    <img src={w.product.image_url} style={{maxHeight:'100%', maxWidth:'100%', objectFit:'contain'}} alt="product" />
                  ) : <i className="fas fa-image" style={{fontSize: '3rem', color: '#ccc'}}></i>}
                </div>
                <h4 style={{margin: '0 0 10px 0'}}>{w.product?.global_item?.name || w.product?.name || 'Product'}</h4>
                <p style={{margin: '0 0 15px 0', fontWeight: 'bold', color: 'var(--primary)'}}>&#2547; {w.product?.price}</p>
                <button
                  className="btn"
                  style={{width: '100%'}}
                  onClick={() => navigate(`/buyer/shop/${w.product?.shop_id}/products`)}
                >
                  দোকানে যান
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
