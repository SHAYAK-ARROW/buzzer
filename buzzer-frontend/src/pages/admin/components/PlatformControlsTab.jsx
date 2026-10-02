import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import api from '../../../api/client';

export default function PlatformControlsTab() {
  const queryClient = useQueryClient();

  const [cod, setCod] = useState(true);
  const [online, setOnline] = useState(false);
  const [selfDelivery, setSelfDelivery] = useState(true);
  const [paused, setPaused] = useState(false);
  const [pauseMsg, setPauseMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['platformSettings'],
    queryFn: () => api.get('/admin/platform-settings')
  });

  useEffect(() => {
    if (data) {
      setCod(data.cod_enabled);
      setOnline(data.online_payment_enabled);
      if (data.self_delivery_enabled !== undefined) setSelfDelivery(data.self_delivery_enabled);
      setPaused(data.platform_paused);
      setPauseMsg(data.pause_message || '');
    }
  }, [data]);

  const saveSettings = useMutation({
    mutationFn: (payload) => api.patch('/admin/platform-settings', payload),
    onSuccess: () => {
      Swal.fire('Success', 'Platform settings updated!', 'success');
      queryClient.invalidateQueries({ queryKey: ['platformSettings'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const handleSave = (e) => {
    e.preventDefault();
    saveSettings.mutate({
      cod_enabled: cod,
      online_payment_enabled: online,
      self_delivery_enabled: selfDelivery,
      platform_paused: paused,
      pause_message: pauseMsg
    });
  };

  if (isLoading) return <p>Loading platform settings...</p>;

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Platform Controls</h3>
      
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', maxWidth: '600px' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Cash on Delivery (COD)</label>
            <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={cod} onChange={e => setCod(e.target.checked)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Online Payment (Wallet)</label>
            <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={online} onChange={e => setOnline(e.target.checked)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Self Delivery Allowed</label>
            <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={selfDelivery} onChange={e => setSelfDelivery(e.target.checked)} />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #ddd' }} />

          <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeeba', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#856404' }}>Platform Paused (Maintenance)</label>
            <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={paused} onChange={e => setPaused(e.target.checked)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Pause Message (Visible to Buyers when paused)</label>
            <input 
              type="text" 
              style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} 
              value={pauseMsg} 
              onChange={e => setPauseMsg(e.target.value)} 
              placeholder="e.g. We are closed today." 
            />
          </div>

          <button type="submit" style={{ padding: '12px', background: '#0d6efd', color: '#fff', fontSize: '1.1rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}
