import api from './client';

// Buyer Orders
export const placeOrder = (data) => api.post('/orders', data);
export const getMyOrders = () => api.get('/orders/my');
export const buyerDecision = (orderId, decision) =>
  api.post(`/orders/${orderId}/buyer-decision`, { decision });

// Seller Orders
export const getSellerOrders = () => api.get('/seller/orders');
export const confirmAllOrder = (orderId) =>
  api.patch(`/seller/orders/${orderId}/confirm-all`);
export const markUnavailable = (orderId, itemIds) =>
  api.patch(`/seller/orders/${orderId}/mark-unavailable`, {
    unavailable_item_ids: itemIds,
  });
export const markOrderReady = (orderId) =>
  api.patch(`/seller/orders/${orderId}/status`, { status: 'ready' });

// Delivery Orders
export const getAvailableOrders = () => api.get('/delivery/available-orders');
export const claimOrder = (orderId) =>
  api.post(`/delivery/orders/${orderId}/claim`);
export const markDelivered = (orderId) =>
  api.patch(`/delivery/orders/${orderId}/delivered`);
export const markAttemptFailed = (orderId) =>
  api.patch(`/delivery/orders/${orderId}/attempt-failed`);

// Admin Orders
export const getAllOrders = (params) => api.get('/admin/orders', { params });
