import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import api from '../api/client';
import { removeToken } from '../utils/token';

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [installPrompt, setInstallPrompt] = useState(window.deferredPrompt);
  useEffect(() => {
    const handleInstallable = () => setInstallPrompt(window.deferredPrompt);
    window.addEventListener('app-installable', handleInstallable);
    return () => window.removeEventListener('app-installable', handleInstallable);
  }, []);
  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        window.deferredPrompt = null;
      }
    }
  };


  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');

  // Fetch profile
  const { data, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => api.get('/user/profile').then(res => res.data?.user || res.user),
  });

  // Sync state when data loads
  useEffect(() => {
    if (data) {
      setName(data.name || '');
      setNickname(data.nickname || '');
      setPhone(data.phone || '');
    }
  }, [data]);

  // Mutations
  const updateProfile = useMutation({
    mutationFn: (payload) => api.patch('/user/profile', payload),
    onSuccess: () => {
      Swal.fire('Saved!', 'Profile updated successfully!', 'success');
      queryClient.invalidateQueries(['userProfile']);
    },
    onError: (err) => {
      Swal.fire('Error', err.response?.data?.error || err.message, 'error');
    }
  });

  const topupWallet = useMutation({
    mutationFn: (amount) => api.post('/user/wallet/add-money', { amount }),
    onSuccess: (res) => {
      Swal.fire('Success', res.data?.message || 'Money added successfully!', 'success');
      queryClient.invalidateQueries(['userProfile']);
    },
    onError: (err) => {
      Swal.fire('Error', err.response?.data?.error || err.message, 'error');
    }
  });

  const handleSave = () => {
    updateProfile.mutate({ name, nickname, phone });
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Logout',
      text: 'Are you sure you want to log out?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Yes, Logout'
    }).then((result) => {
      if (result.isConfirmed) {
        removeToken();
        navigate('/login');
      }
    });
  };

  const handleAddMoney = async () => {
    const { value: amount } = await Swal.fire({
      title: 'Add Money to Wallet',
      input: 'number',
      inputLabel: 'Enter Amount',
      inputPlaceholder: 'e.g. 500',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      inputValidator: (value) => {
        if (!value || value <= 0) return 'Please enter a valid amount';
      }
    });
    
    if (amount) {
      topupWallet.mutate(parseFloat(amount));
    }
  };

  if (isLoading) return <div style={{padding: '2rem', textAlign: 'center'}}>Loading profile...</div>;
  if (!data) return <div style={{padding: '2rem', textAlign: 'center'}}>Error loading profile.</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{margin: 0}}>My Profile</h2>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>Back</button>
      </div>

      <div style={styles.grid}>
        {/* Left Box: Personal Details */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Personal Details</h3>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Asol Name (Real Name):</label>
            <input 
              style={styles.input} 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Admin"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Dak Name (Nickname):</label>
            <input 
              style={styles.input} 
              value={nickname} 
              onChange={e => setNickname(e.target.value)}
              placeholder="e.g. Babu"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Phone Number:</label>
            <input 
              style={styles.input} 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 01712345678"
            />
          </div>

          <button style={styles.saveBtn} onClick={handleSave} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? 'Saving...' : 'Save Profile'}
          </button>
          
          {installPrompt && (
              <button style={{...styles.saveBtn, background: '#17a2b8', marginBottom: '10px'}} onClick={handleInstall}>
                📲 Add to Home Screen (App)
              </button>
            )}
            <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* Right Box: Wallet */}
        <div style={{...styles.card, ...styles.walletCard}}>
          <h3 style={{...styles.cardTitle, color: '#198754'}}>My Wallet</h3>
          
          <div style={{marginBottom: '1rem'}}>
            <div style={{color: '#555', fontSize: '0.9rem', marginBottom: '0.5rem'}}>Current Balance:</div>
            <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#198754'}}>
              ₹{parseFloat(data.wallet_balance || 0).toFixed(2)}
            </div>
          </div>

          <button style={styles.addMoneyBtn} onClick={handleAddMoney} disabled={topupWallet.isPending}>
            + Add Money
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  backBtn: {
    background: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '6px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #eaeaea',
  },
  walletCard: {
    background: '#f2fbf4', // Light greenish tint matching screenshot
    border: '1px solid #d1e7dd',
  },
  cardTitle: {
    margin: '0 0 1.5rem 0',
    fontSize: '1.1rem',
    color: '#333',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    marginBottom: '5px',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box'
  },
  saveBtn: {
    width: '100%',
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  logoutBtn: {
    width: '100%',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  addMoneyBtn: {
    width: '100%',
    background: '#198754',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: '1rem',
  }
};
