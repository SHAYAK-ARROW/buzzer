import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import Swal from 'sweetalert2';

export default function OffersTab() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sellerOffers'],
    queryFn: () => api.get('/seller/offers'),
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    offer_type: 'cart_discount_threshold',
    threshold_amount: '',
    discount_value: '',
    is_percentage: false,
  });

  const createOfferMutation = useMutation({
    mutationFn: (newOffer) => api.post('/seller/offers', newOffer),
    onSuccess: () => {
      queryClient.invalidateQueries(['sellerOffers']);
      Swal.fire('Success', 'Offer created successfully!', 'success');
      setFormData({
        title: '',
        description: '',
        offer_type: 'cart_discount_threshold',
        threshold_amount: '',
        discount_value: '',
        is_percentage: false,
      });
    },
    onError: (err) => Swal.fire('Error', err.error || 'Failed to create offer', 'error')
  });

  const deleteOfferMutation = useMutation({
    mutationFn: (id) => api.delete(`/seller/offers/${id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['sellerOffers']);
      Swal.fire('Deleted', res.message || 'Offer deleted!', 'info');
    },
    onError: (err) => Swal.fire('Error', err.error || 'Failed to delete offer', 'error')
  });

  const toggleOfferMutation = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/seller/offers/${id}`, { is_active }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['sellerOffers']);
      Swal.fire('Updated', res.message || 'Offer status updated!', 'success');
    },
    onError: (err) => Swal.fire('Error', err.error || 'Failed to update offer', 'error')
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.threshold_amount || !formData.discount_value) {
      return Swal.fire('Warning', 'Please fill required fields (Title, Threshold, Discount)', 'warning');
    }
    createOfferMutation.mutate({
      ...formData,
      threshold_amount: parseFloat(formData.threshold_amount),
      discount_value: parseFloat(formData.discount_value)
    });
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) deleteOfferMutation.mutate(id);
    });
  };

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading offers...</div>;

  const offers = data?.offers || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      
      <h3 style={{ marginBottom: '1.5rem', color: '#333' }}>Manage Promotional Offers</h3>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {/* Create Offer Form */}
        <div className="card" style={{ flex: '1 1 300px', alignSelf: 'start', background: '#f8f9fa' }}>
          <h4 style={{ margin: '0 0 15px 0' }}>Create New Offer</h4>
          <form onSubmit={handleCreate}>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Offer Title</label>
              <input 
                type="text" 
                placeholder="e.g. 20% Off on ₹1500"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="input-field"
                style={{ width: '100%', padding: '8px' }} 
                required
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Description (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Grab it before it's gone!"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="input-field"
                style={{ width: '100%', padding: '8px' }} 
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Offer Type</label>
              <select 
                value={formData.offer_type}
                onChange={(e) => setFormData({...formData, offer_type: e.target.value})}
                className="input-field"
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="cart_discount_threshold">Cart Discount</option>
                <option value="free_delivery_threshold">Free Delivery on Order</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Minimum Cart Value (₹)</label>
              <input 
                type="number" 
                placeholder="e.g. 500"
                value={formData.threshold_amount}
                onChange={(e) => setFormData({...formData, threshold_amount: e.target.value})}
                className="input-field"
                style={{ width: '100%', padding: '8px' }} 
                required
              />
            </div>

            {formData.offer_type === 'cart_discount_threshold' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Discount Value</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="number" 
                    placeholder="e.g. 50"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                    className="input-field"
                    style={{ flexGrow: 1, padding: '8px' }} 
                    required
                  />
                  <select 
                    value={formData.is_percentage ? 'true' : 'false'}
                    onChange={(e) => setFormData({...formData, is_percentage: e.target.value === 'true'})}
                    className="input-field"
                    style={{ padding: '8px' }}
                  >
                    <option value="false">₹ (Flat)</option>
                    <option value="true">% (Percent)</option>
                  </select>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="btn"
              disabled={createOfferMutation.isPending}
              style={{ width: '100%', padding: '10px', background: 'var(--primary, #0d6efd)', color: '#fff' }}
            >
              Add Offer
            </button>
          </form>
        </div>

        {/* Active Offers List */}
        <div style={{ flex: '2 1 400px' }}>
          {offers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#666' }}>
              No offers yet. Create one to attract buyers!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {offers.map(o => {
                const isActive = o.is_active !== false; // handle null as true
                return (
                  <div key={o.id} className="card" style={{ borderLeft: `4px solid ${isActive ? '#28a745' : '#6c757d'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: '0 0 5px 0' }}>{o.title}</h4>
                      <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: isActive ? '#d4edda' : '#e2e3e5', color: isActive ? '#155724' : '#383d41', fontWeight: 'bold' }}>
                        {isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem' }}>{o.description}</p>
                    
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem', marginBottom: '15px' }}>
                      <div><strong>Type:</strong> {o.offer_type.replace(/_/g, ' ')}</div>
                      <div><strong>Discount:</strong> {o.is_percentage ? o.discount_value + '%' : '₹' + o.discount_value}</div>
                      {o.threshold_amount && <div><strong>Min Cart Value:</strong> ₹{o.threshold_amount}</div>}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                      <button 
                        className="btn"
                        onClick={() => toggleOfferMutation.mutate({ id: o.id, is_active: !isActive })}
                        disabled={toggleOfferMutation.isPending}
                        style={{ background: isActive ? '#ffc107' : '#28a745', color: isActive ? '#000' : '#fff', padding: '5px 15px', fontSize: '0.9rem' }}
                      >
                        {isActive ? '⏸️ Pause Offer' : '▶️ Resume Offer'}
                      </button>
                      <button 
                        className="btn"
                        onClick={() => handleDelete(o.id)}
                        disabled={deleteOfferMutation.isPending}
                        style={{ background: '#dc3545', color: '#fff', padding: '5px 15px', fontSize: '0.9rem' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
