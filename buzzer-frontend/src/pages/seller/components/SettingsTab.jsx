import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';

import Swal from 'sweetalert2';

export default function SettingsTab() {
  const queryClient = useQueryClient();

  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ['sellerShop'],
    queryFn: () => api.get('/seller/shop'),
  });

  const { data: partnersData, isLoading: partnersLoading } = useQuery({
    queryKey: ['sellerPartners'],
    queryFn: () => api.get('/seller/shop/trusted-partners'),
  });

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    payment_mode: 'wallet_settlement',
  });
  
  const [partnerEmail, setPartnerEmail] = useState('');

  // Update form data when shop data loads
  useEffect(() => {
    if (shop) {
      setFormData({
        name: shop.name || '',
        address: shop.address || '',
        payment_mode: shop.payment_mode || 'wallet_settlement',
      });
    }
  }, [shop]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => api.patch('/seller/shop/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sellerShop']);
      Swal.fire('Success', 'Settings saved successfully!', 'success');
    },
    onError: (err) => {
      Swal.fire('Error', err.response?.data?.error || 'Failed to update settings', 'error');
    }
  });

  const addPartnerMutation = useMutation({
    mutationFn: (email) => api.post('/seller/shop/trusted-partners', { email }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['sellerPartners']);
      Swal.fire('Success', res.message || 'Partner added!', 'success');
      setPartnerEmail('');
    },
    onError: (err) => {
      Swal.fire('Error', err.response?.data?.error || 'Failed to add partner', 'error');
    }
  });

  const removePartnerMutation = useMutation({
    mutationFn: (id) => api.delete(`/seller/shop/trusted-partners/${id}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['sellerPartners']);
      Swal.fire('Removed', res.message || 'Partner removed!', 'info');
    },
    onError: (err) => {
      Swal.fire('Error', err.response?.data?.error || 'Failed to remove partner', 'error');
    }
  });

  if (shopLoading || partnersLoading) return (
    <div>
      
      <div style={{ padding: '2rem', textAlign: 'center' }}>Loading settings...</div>
    </div>
  );

  const partners = partnersData?.trusted_partners || [];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
      
      {/* Shop Settings */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Shop Settings</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Shop Name</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="input-field"
            style={{ width: '100%', padding: '8px' }} 
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Address</label>
          <input 
            type="text" 
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            className="input-field"
            style={{ width: '100%', padding: '8px' }} 
          />
        </div>

        <div style={{ marginBottom: '25px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Delivery Payment Mode</label>
          <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 10px 0' }}>How do you want delivery boys to pay you for the goods?</p>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="payment_mode" 
                value="wallet_settlement" 
                checked={formData.payment_mode === 'wallet_settlement'}
                onChange={() => setFormData({...formData, payment_mode: 'wallet_settlement'})}
                style={{ marginTop: '4px' }} 
              />
              <div>
                <strong>Wallet Settlement (Digital)</strong>
                <p style={{ fontSize: '0.85rem', color: '#555', margin: '2px 0' }}>System automatically deducts money from delivery boy's wallet and adds it to your Shop Wallet when the order is delivered.</p>
              </div>
            </label>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="radio" 
                name="payment_mode" 
                value="cash_purchase" 
                checked={formData.payment_mode === 'cash_purchase'}
                onChange={() => setFormData({...formData, payment_mode: 'cash_purchase'})}
                style={{ marginTop: '4px' }} 
              />
              <div>
                <strong>Cash Purchase (Direct)</strong>
                <p style={{ fontSize: '0.85rem', color: '#555', margin: '2px 0' }}>Delivery boy MUST pay you in CASH at your shop before taking the package. No digital wallet deduction occurs.</p>
              </div>
            </label>
          </div>
        </div>

        <button 
          className="btn"
          onClick={() => updateSettingsMutation.mutate(formData)}
          disabled={updateSettingsMutation.isLoading}
          style={{ width: '100%', padding: '10px 20px', background: 'var(--primary, #0d6efd)', color: '#fff' }}
        >
          Save Settings
        </button>
      </div>

      {/* Trusted Partners */}
      <div className="card">
        <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>Trusted Delivery Boys (10s Head Start)</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 15px 0' }}>Add delivery boys here to give them a 10-second priority head-start to accept your orders before they appear to the general public.</p>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input 
            type="email" 
            placeholder="Delivery Boy's Email" 
            value={partnerEmail}
            onChange={(e) => setPartnerEmail(e.target.value)}
            className="input-field"
            style={{ flexGrow: 1, padding: '8px' }} 
          />
          <button 
            className="btn"
            onClick={() => {
              if(!partnerEmail) return Swal.fire('Warning', 'Enter an email', 'warning');
              addPartnerMutation.mutate(partnerEmail);
            }}
            disabled={addPartnerMutation.isLoading}
            style={{ padding: '8px 16px', background: '#28a745', color: '#fff' }}
          >
            Add Trusted Boy
          </button>
        </div>

        <div>
          {partners.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>You haven't added any trusted delivery boys yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {partners.map(p => (
                <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                    <small style={{ color: '#666' }}>{p.email} | {p.phone || 'No phone'}</small>
                  </div>
                  <button 
                    className="btn"
                    onClick={() => {
                      Swal.fire({
                        title: 'Remove partner?',
                        text: "They will no longer get a 10s head-start on your orders.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#dc3545',
                        confirmButtonText: 'Yes, remove'
                      }).then((result) => {
                        if (result.isConfirmed) {
                          removePartnerMutation.mutate(p.id);
                        }
                      });
                    }}
                    style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#dc3545', color: '#fff' }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
