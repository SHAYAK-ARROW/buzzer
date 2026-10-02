import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import api from '../../../api/client';

const styles = {
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
  btn: { padding: '10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  slabBox: { display: 'flex', alignItems: 'center', gap: '10px', background: '#f9f9f9', padding: '15px', borderRadius: '5px' },
  strong: { width: '60px' }
};

export default function DeliverySetupTab() {
  const queryClient = useQueryClient();

  const [s1To, setS1To] = useState('2.0');
  const [s1P, setS1P] = useState('20.0');
  const [s2To, setS2To] = useState('5.0');
  const [s2P, setS2P] = useState('40.0');
  const [s3To, setS3To] = useState('8.0');
  const [s3P, setS3P] = useState('70.0');
  const [overP, setOverP] = useState('10.0');
  const [surge, setSurge] = useState('1.0');
  const [surgeToggle, setSurgeToggle] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminDeliverySettings'],
    queryFn: () => api.get('/admin/delivery-settings')
  });

  useEffect(() => {
    if (data) {
      setS1To(data.delivery_slab1_to || '2.0');
      setS1P(data.delivery_slab1_price || '20.0');
      setS2To(data.delivery_slab2_to || '5.0');
      setS2P(data.delivery_slab2_price || '40.0');
      setS3To(data.delivery_slab3_to || '8.0');
      setS3P(data.delivery_slab3_price || '70.0');
      setOverP(data.delivery_over_per_km || '10.0');
      
      const s = data.delivery_surge_multiplier || '1.0';
      setSurge(s);
      setSurgeToggle(parseFloat(s) > 1.0);
    }
  }, [data]);

  const saveSettings = useMutation({
    mutationFn: (payload) => api.post('/admin/delivery-settings', payload),
    onSuccess: () => {
      Swal.fire('Success', 'Delivery slabs saved successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminDeliverySettings'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const handleSave = () => {
    saveSettings.mutate({
      delivery_slab1_to: s1To,
      delivery_slab1_price: s1P,
      delivery_slab2_to: s2To,
      delivery_slab2_price: s2P,
      delivery_slab3_to: s3To,
      delivery_slab3_price: s3P,
      delivery_over_per_km: overP,
      delivery_surge_multiplier: surgeToggle ? surge : '1.0'
    });
  };

  if (isLoading) return <p>Loading delivery settings...</p>;
  if (error) return <div style={{ color: 'red' }}>Error: {error.message}</div>;

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Delivery Setup (Slab System)</h3>
      
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', maxWidth: '700px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Slab 1 */}
          <div style={styles.slabBox}>
            <strong style={styles.strong}>Slab 1:</strong>
            <span>From 0 to</span>
            <input type="number" step="0.5" style={{...styles.input, width: '80px'}} value={s1To} onChange={e => setS1To(e.target.value)} />
            <span>KM &rarr; Price (₹)</span>
            <input type="number" style={{...styles.input, width: '100px'}} value={s1P} onChange={e => setS1P(e.target.value)} />
          </div>

          {/* Slab 2 */}
          <div style={styles.slabBox}>
            <strong style={styles.strong}>Slab 2:</strong>
            <span>From <span style={{fontWeight: 'bold'}}>{s1To}</span> to</span>
            <input type="number" step="0.5" style={{...styles.input, width: '80px'}} value={s2To} onChange={e => setS2To(e.target.value)} />
            <span>KM &rarr; Price (₹)</span>
            <input type="number" style={{...styles.input, width: '100px'}} value={s2P} onChange={e => setS2P(e.target.value)} />
          </div>

          {/* Slab 3 */}
          <div style={styles.slabBox}>
            <strong style={styles.strong}>Slab 3:</strong>
            <span>From <span style={{fontWeight: 'bold'}}>{s2To}</span> to</span>
            <input type="number" step="0.5" style={{...styles.input, width: '80px'}} value={s3To} onChange={e => setS3To(e.target.value)} />
            <span>KM &rarr; Price (₹)</span>
            <input type="number" style={{...styles.input, width: '100px'}} value={s3P} onChange={e => setS3P(e.target.value)} />
          </div>

          {/* Slab 4 (Over) */}
          <div style={{ ...styles.slabBox, background: '#fff3cd', border: '1px solid #ffeeba' }}>
            <strong style={styles.strong}>Over:</strong>
            <span><span style={{fontWeight: 'bold'}}>{s3To}</span> KM &rarr;</span>
            <input type="number" style={{...styles.input, width: '100px'}} value={overP} onChange={e => setOverP(e.target.value)} />
            <span>(₹) per extra KM</span>
          </div>

          <hr style={{ margin: '15px 0', borderColor: '#eee' }} />

          {/* Surge Settings */}
          <div style={{ background: '#cce5ff', padding: '15px', borderRadius: '8px', border: '1px solid #b8daff' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', cursor: 'pointer' }}>
              <span>⚡ Enable Surge / Extra Charge (Rain/Peak)</span>
              <input 
                type="checkbox" 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }} 
                checked={surgeToggle} 
                onChange={e => {
                  setSurgeToggle(e.target.checked);
                  if (!e.target.checked) setSurge('1.0');
                }} 
              />
            </label>
            
            {surgeToggle && (
              <div style={{ marginTop: '15px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '5px' }}>Multiplier (e.g. 1.5 = 50% extra charge)</label>
                <input type="number" step="0.1" min="1.0" style={{...styles.input, width: '100px'}} value={surge} onChange={e => setSurge(e.target.value)} />
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>This will multiply the total delivery charge.</p>
              </div>
            )}
          </div>

          <button onClick={handleSave} style={{ ...styles.btn, background: '#0d6efd', color: '#fff', fontSize: '1rem', marginTop: '10px' }}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
