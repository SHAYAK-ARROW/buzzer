import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import api from '../../../api/client';

export default function BroadcastTab() {
  const [role, setRole] = useState('all');
  const [message, setMessage] = useState('');
  const [push, setPush] = useState(true);
  const [sms, setSms] = useState(false);
  const [email, setEmail] = useState(false);

  const sendBroadcast = useMutation({
    mutationFn: (payload) => api.post('/admin/notifications/broadcast', payload),
    onSuccess: () => {
      Swal.fire('Sent!', 'Broadcast notification has been queued.', 'success');
      setMessage('');
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return Swal.fire('Error', 'Message cannot be empty.', 'error');
    if (!push && !sms && !email) return Swal.fire('Error', 'Select at least one channel.', 'error');
    
    sendBroadcast.mutate({
      role,
      message: message.trim(),
      channels: { push, sms, email }
    });
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}><i className="fas fa-bullhorn" style={{ color: '#e83e8c' }}></i> Global Broadcast Notification</h3>
      
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', maxWidth: '600px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Send To</label>
            <select style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} value={role} onChange={e => setRole(e.target.value)}>
              <option value="all">All Users (Everyone)</option>
              <option value="user">Buyers Only</option>
              <option value="seller">Sellers Only</option>
              <option value="delivery">Delivery Boys Only</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Message</label>
            <textarea 
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '100px', boxSizing: 'border-box' }}
              placeholder="Enter broadcast message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            ></textarea>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Channels (How to send?)</label>
            <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="checkbox" checked={push} onChange={e => setPush(e.target.checked)} /> In-App Push
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="checkbox" checked={sms} onChange={e => setSms(e.target.checked)} /> SMS
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)} /> Email
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={sendBroadcast.isPending}
            style={{ padding: '12px', background: '#e83e8c', color: '#fff', fontSize: '1.1rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '10px' }}
          >
            {sendBroadcast.isPending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </form>
      </div>
    </div>
  );
}
