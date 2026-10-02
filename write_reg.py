import codecs

content = '''import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { register } from '../api/auth';
import api from '../api/client';

const ROLES = [
  { value: 'user', label: '🛒 Buyer (ক্রেতা)' },
  { value: 'seller', label: '🏪 Seller (দোকানদার)' },
  { value: 'delivery', label: '🛵 Delivery Boy' },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', role: 'user', otp: ''
  });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [step, setStep] = useState(1);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const registerMutation = useMutation({
    mutationFn: () => register(form),
    onSuccess: () => {
      alert('Registration successful! Please login.');
      navigate('/login');
    },
    onError: (err) => {
      setError(err?.response?.data?.error || err?.error || 'Registration failed.');
    },
  });

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!form.email || !form.name || !form.password || !form.phone) {
      setError('Please fill all basic details first.');
      return;
    }

    setIsSendingOtp(true);
    try {
      await api.post('/auth/send-otp', { email: form.email });
      setSuccessMsg('OTP sent to your email. Please check your inbox (and spam folder).');
      setStep(2);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setError('');
    if (!form.otp || form.otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    registerMutation.mutate();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>🐝 Buzzer</h1>
        <h2 style={styles.title}>Register</h2>

        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <input style={styles.input} type="text" placeholder="নাম" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input style={styles.input} type="email" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input style={styles.input} type="tel" placeholder="মোবাইল নম্বর" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <input style={styles.input} type="password" placeholder="Password" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required />

            <select style={styles.input} value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <button style={styles.button} type="submit" disabled={isSendingOtp}>
              {isSendingOtp ? 'Sending OTP...' : 'Next: Verify Email'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <p style={{textAlign: 'center', marginBottom: '15px'}}>Enter the 6-digit OTP sent to <strong>{form.email}</strong></p>
            <input style={{...styles.input, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '5px'}} 
              type="text" maxLength="6" placeholder="000000" value={form.otp}
              onChange={(e) => setForm({ ...form, otp: e.target.value })} required />

            <button style={{...styles.button, background: '#0d6efd'}} type="submit" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Verifying...' : 'Verify & Register'}
            </button>
            <button style={{...styles.button, background: 'transparent', color: '#666', marginTop: '10px'}} 
              type="button" onClick={() => setStep(1)}>
              Back to Edit Details
            </button>
          </form>
        )}

        <p style={styles.link}>
          আগে থেকে অ্যাকাউন্ট আছে? <Link to="/login">Login করুন</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: '1rem' },
  card: { background: '#fff', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  logo: { textAlign: 'center', fontSize: '2rem', marginBottom: '0.5rem' },
  title: { textAlign: 'center', color: '#333', marginBottom: '1.5rem' },
  input: { display: 'block', width: '100%', padding: '0.75rem 1rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' },
  button: { display: 'block', width: '100%', padding: '0.85rem', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' },
  error: { background: '#fff0f0', color: '#d32f2f', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  success: { background: '#e8f5e9', color: '#1e7e34', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' },
  link: { textAlign: 'center', marginTop: '1rem', color: '#666' },
};'''

with codecs.open('buzzer-frontend/src/pages/Register.jsx', 'w', 'utf-8') as f:
    f.write(content)
print("done")
