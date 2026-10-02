import codecs

content = '''import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { login } from '../api/auth';
import api from '../api/client';
import { setToken, getUserRole } from '../utils/token';
import { GoogleLogin } from '@react-oauth/google';
import Swal from 'sweetalert2';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Forgot password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP + New Password
  const [forgotForm, setForgotForm] = useState({ email: '', otp: '', new_password: '' });
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const routeUser = () => {
    const role = getUserRole();
    switch (role) {
      case 'user':     navigate('/buyer'); break;
      case 'seller':   navigate('/seller'); break;
      case 'delivery': navigate('/delivery'); break;
      case 'admin':    navigate('/admin'); break;
      default:         navigate('/login');
    }
  };

  const mutation = useMutation({
    mutationFn: () => login(form.email, form.password),
    onSuccess: (data) => {
      setToken(data.access_token);
      routeUser();
    },
    onError: (err) => {
      setError(err?.response?.data?.error || err?.error || 'Login failed. Check your credentials.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    mutation.mutate();
  };

  const handleForgotPasswordSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSendingOtp(true);
    try {
      await api.post('/auth/forgot-password/send-otp', { email: forgotForm.email });
      setSuccessMsg('OTP sent! Please check your email.');
      setForgotStep(2);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to send OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleForgotPasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (forgotForm.new_password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setIsResetting(true);
    try {
      await api.post('/auth/forgot-password/reset', forgotForm);
      Swal.fire('Success', 'Password has been reset successfully. Please login.', 'success');
      setIsForgotPassword(false);
      setForgotStep(1);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsGoogleLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/google', { token: credentialResponse.credential });
      if (res.is_new_user) {
        const { value: formValues } = await Swal.fire({
          title: 'Complete your Profile',
          html:
            '<p style="margin-bottom:15px;color:#555">Welcome, ' + res.name + '! Please select your role.</p>' +
            '<select id="swal-input-role" class="swal2-input">' +
              '<option value="user">Buyer</option>' +
              '<option value="seller">Seller</option>' +
              '<option value="delivery">Delivery Partner</option>' +
            '</select>' +
            '<input id="swal-input-phone" class="swal2-input" placeholder="Phone Number (e.g. 01712345678)">',
          focusConfirm: false,
          preConfirm: () => {
            const r = document.getElementById('swal-input-role').value;
            const p = document.getElementById('swal-input-phone').value;
            if (!p) {
              Swal.showValidationMessage('Phone number is required');
              return false;
            }
            return { role: r, phone: p };
          }
        });
        if (formValues) {
          const signupRes = await api.post('/auth/google/complete-signup', {
            email: res.email,
            name: res.name,
            signup_token: res.signup_token,
            role: formValues.role,
            phone: formValues.phone
          });
          setToken(signupRes.access_token);
          routeUser();
        }
      } else {
        setToken(res.access_token || res.user?.access_token);
        routeUser();
      }
    } catch (err) {
      setError(err?.error || err.message || 'Google login failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.logo}>🐝 Buzzer</h1>
          <h2 style={styles.title}>Forgot Password</h2>

          {error && <div style={styles.error}>{error}</div>}
          {successMsg && <div style={styles.success}>{successMsg}</div>}

          {forgotStep === 1 ? (
            <form onSubmit={handleForgotPasswordSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input
                style={styles.input}
                type="email"
                placeholder="Enter your registered email"
                required
                value={forgotForm.email}
                onChange={(e) => setForgotForm({ ...forgotForm, email: e.target.value })}
              />
              <button style={styles.button} type="submit" disabled={isSendingOtp}>
                {isSendingOtp ? 'Sending OTP...' : 'Send Reset OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{fontSize: '0.9rem', color: '#666'}}>OTP sent to <strong>{forgotForm.email}</strong></p>
              <input
                style={{...styles.input, textAlign: 'center', fontSize: '1.2rem', letterSpacing: '5px'}}
                type="text"
                placeholder="000000"
                maxLength="6"
                required
                value={forgotForm.otp}
                onChange={(e) => setForgotForm({ ...forgotForm, otp: e.target.value })}
              />
              <input
                style={styles.input}
                type="password"
                placeholder="Enter new password"
                required
                value={forgotForm.new_password}
                onChange={(e) => setForgotForm({ ...forgotForm, new_password: e.target.value })}
              />
              <button style={styles.button} type="submit" disabled={isResetting}>
                {isResetting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <p style={{...styles.footerText, cursor: 'pointer', color: 'var(--primary)', fontWeight: 'bold'}} onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }}>
            Back to Login
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>🐝 Buzzer</h1>
        <h2 style={styles.title}>Login</h2>

        {error && <div style={styles.error}>{error}</div>}
        {successMsg && <div style={styles.success}>{successMsg}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button style={styles.button} type="submit" disabled={mutation.isPending || isGoogleLoading}>
            {mutation.isPending ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ textAlign: 'right', marginTop: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }}>
            Forgot Password?
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
          <div style={{ padding: '0 10px', color: '#888', fontSize: '0.9rem' }}>OR</div>
          <div style={{ flex: 1, height: '1px', background: '#ddd' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              setError('Google Login failed.');
            }}
            useOneTap
          />
        </div>

        <p style={styles.footerText}>
          Don't have an account? <Link to="/register" style={styles.link}>Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: '#f4f7f6',
  },
  card: {
    background: '#fff',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  logo: {
    color: 'var(--primary)',
    margin: '0 0 10px 0',
    fontSize: '2rem',
  },
  title: {
    margin: '0 0 20px 0',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '12px',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  error: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
    fontSize: '0.9rem',
  },
  success: {
    background: '#d4edda',
    color: '#155724',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '15px',
    fontSize: '0.9rem',
  },
  footerText: {
    marginTop: '20px',
    fontSize: '0.9rem',
    color: '#666',
  },
  link: {
    color: 'var(--primary)',
    textDecoration: 'none',
    fontWeight: 'bold',
  }
};
'''

with codecs.open('buzzer-frontend/src/pages/Login.jsx', 'w', 'utf-8') as f:
    f.write(content)

print("done")
