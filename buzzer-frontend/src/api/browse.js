import api from './client';

export const getShops = (lat, lng) => 
  api.get('/shops', { params: { lat, lng } });

export const getShopProducts = (shopId) =>
  api.get(`/shops/${shopId}/products`);

export const getSearchSuggestions = (q) =>
  api.get('/search/suggestions', { params: { q } });

export const searchGrocery = (q, lat, lng) =>
  api.get('/search', { params: { q, lat, lng } });
