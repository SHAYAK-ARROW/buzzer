import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import Navbar from '../../components/Navbar';
import api from '../../api/client';
import Swal from 'sweetalert2';

export default function Checkout() {
  const { items, shopId, clearCart, getTotalItems, getTotalPrice } = useCartStore();
  const navigate = useNavigate();
  const [deliveryType, setDeliveryType] = useState('instant_delivery');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 22.9, lng: 88.4 })
      );
    } else {
      setLocation({ lat: 22.9, lng: 88.4 });
    }
  }, []);

  const itemCount = getTotalItems();
  const itemsTotal = getTotalPrice();

  if (itemCount === 0 || !shopId) {
    return (
      <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <Navbar />
        <div style={{ maxWidth: '600px', margin: '50px auto', textAlign: 'center', background: '#fff', padding: '2rem', borderRadius: '12px' }}>
          <h2>Your cart is empty!</h2>
          <button onClick={() => navigate('/buyer')} style={{ marginTop: '20px', padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Go Shopping
          </button>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!address.trim()) {
      Swal.fire('Required', 'Please enter your delivery address.', 'warning');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const itemsList = Object.values(items);
      const payload = {
        shop_id: shopId,
        delivery_type: deliveryType,
        is_cash_on_delivery: paymentMethod === 'cod',
        payment_method: paymentMethod,
        delivery_address: address,
        delivery_notes: notes,
        lat: location.lat,
        lng: location.lng,
        items: itemsList.map(item => ({
          product_id: item.id,
          quantity: item.qty
        }))
      };

      const res = await api.post('/orders', payload);
      
      clearCart();
      Swal.fire({
        icon: 'success',
        title: 'Order Placed!',
        text: 'Your order has been successfully sent to the shop.',
        confirmButtonText: 'Track Order'
      }).then(() => {
        navigate('/buyer/orders');
      });

    } catch (error) {
      Swal.fire('Checkout Failed', error.response?.data?.error || error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '30px' }}>
      <Navbar />
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Checkout</h2>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handlePlaceOrder}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Delivery Address</label>
              <textarea 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px' }}
                placeholder="Enter complete address..."
                required
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Payment Method</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                <option value="cod">Cash on Delivery</option>
                <option value="online">Online Payment</option>
              </select>
            </div>
            
            <button 
              type="submit"
              disabled={isSubmitting}
              style={{ width: '100%', padding: '15px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? 'Processing...' : 'Place Order'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
