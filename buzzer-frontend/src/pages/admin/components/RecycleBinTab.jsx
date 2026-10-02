import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import api from '../../../api/client';

const styles = {
  th: { padding: '10px', background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', borderBottom: '1px solid #eee' },
  btn: { padding: '5px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  tabBtn: { padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#fff' }
};

export default function RecycleBinTab() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState(null); // 'users', 'products', 'items'

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['recycleBinUsers'],
    queryFn: () => api.get('/admin/recycle-bin/users'),
    enabled: activeSubTab === 'users'
  });

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['recycleBinProducts'],
    queryFn: () => api.get('/admin/recycle-bin/products'),
    enabled: activeSubTab === 'products'
  });

  const { data: itemsData, isLoading: loadingItems } = useQuery({
    queryKey: ['recycleBinItems'],
    queryFn: () => api.get('/admin/recycle-bin/items'),
    enabled: activeSubTab === 'items'
  });

  const restoreUser = useMutation({
    mutationFn: (userId) => api.post(`/admin/users/${userId}/restore`),
    onSuccess: () => {
      Swal.fire('Success', 'User restored!', 'success');
      queryClient.invalidateQueries({ queryKey: ['recycleBinUsers'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const restoreProduct = useMutation({
    mutationFn: (productId) => api.post(`/admin/recycle-bin/products/${productId}/restore`),
    onSuccess: () => {
      Swal.fire('Success', 'Product restored!', 'success');
      queryClient.invalidateQueries({ queryKey: ['recycleBinProducts'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const restoreItem = useMutation({
    mutationFn: (itemId) => api.post(`/admin/recycle-bin/items/${itemId}/restore`),
    onSuccess: () => {
      Swal.fire('Success', 'Item restored!', 'success');
      queryClient.invalidateQueries({ queryKey: ['recycleBinItems'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const hardDeleteItem = useMutation({
    mutationFn: (itemId) => api.delete(`/admin/recycle-bin/items/${itemId}/hard-delete`),
    onSuccess: () => {
      Swal.fire('Success', 'Item permanently deleted!', 'success');
      queryClient.invalidateQueries({ queryKey: ['recycleBinItems'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const handleAction = async (actionFn, id, confirmText, isDanger = false) => {
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: confirmText,
      icon: isDanger ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: isDanger ? '#dc3545' : '#198754'
    });
    if (confirm.isConfirmed) actionFn.mutate(id);
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Recycle Bin</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          style={{ ...styles.tabBtn, background: activeSubTab === 'users' ? '#0b5ed7' : '#0d6efd' }}
          onClick={() => setActiveSubTab('users')}
        >Deleted Users</button>
        <button 
          style={{ ...styles.tabBtn, background: activeSubTab === 'products' ? '#5c636a' : '#6c757d' }}
          onClick={() => setActiveSubTab('products')}
        >Deleted Products</button>
        <button 
          style={{ ...styles.tabBtn, background: activeSubTab === 'items' ? '#d39e00' : '#ffc107', color: '#000' }}
          onClick={() => setActiveSubTab('items')}
        >Deleted Catalog Items</button>
      </div>

      <div style={{ background: '#fff', borderRadius: '8px', padding: '15px', border: '1px solid #ddd' }}>
        {!activeSubTab && <p>Please select a category above.</p>}

        {/* Users */}
        {activeSubTab === 'users' && (
          loadingUsers ? <p>Loading deleted users...</p> : 
          usersData?.users?.length === 0 ? <p>No deleted users.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th style={styles.th}>UID</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Deleted At</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData?.users.map(u => (
                    <tr key={u.id}>
                      <td style={styles.td}>{u.uid}</td>
                      <td style={styles.td}>{u.name}</td>
                      <td style={styles.td}>{u.role}</td>
                      <td style={styles.td}>{new Date(u.deleted_at).toLocaleString()}</td>
                      <td style={styles.td}>
                        <button style={{...styles.btn, background: '#198754', color: '#fff'}} onClick={() => handleAction(restoreUser, u.id, 'Restore this user?')}>Restore</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Products */}
        {activeSubTab === 'products' && (
          loadingProducts ? <p>Loading deleted products...</p> : 
          productsData?.products?.length === 0 ? <p>No deleted products.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Shop</th>
                    <th style={styles.th}>Deleted At</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData?.products.map(p => (
                    <tr key={p.id}>
                      <td style={styles.td}>{p.id}</td>
                      <td style={styles.td}>{p.name}</td>
                      <td style={styles.td}>{p.shop_name}</td>
                      <td style={styles.td}>{new Date(p.deleted_at).toLocaleString()}</td>
                      <td style={styles.td}>
                        <button style={{...styles.btn, background: '#198754', color: '#fff'}} onClick={() => handleAction(restoreProduct, p.id, 'Restore this product?')}>Restore</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Catalog Items */}
        {activeSubTab === 'items' && (
          loadingItems ? <p>Loading deleted catalog items...</p> : 
          itemsData?.items?.length === 0 ? <p>No deleted catalog items.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th style={styles.th}>UID</th>
                    <th style={styles.th}>Company</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Spec</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsData?.items.map(i => (
                    <tr key={i.id}>
                      <td style={styles.td}>{i.uid}</td>
                      <td style={styles.td}>{i.company}</td>
                      <td style={styles.td}>{i.category}</td>
                      <td style={styles.td}>{i.specification}</td>
                      <td style={{ ...styles.td, display: 'flex', gap: '5px' }}>
                        <button style={{...styles.btn, background: '#198754', color: '#fff'}} onClick={() => handleAction(restoreItem, i.id, 'Restore this item to the active catalog?')}>Restore</button>
                        <button style={{...styles.btn, background: '#dc3545', color: '#fff'}} onClick={() => handleAction(hardDeleteItem, i.id, 'PERMANENTLY delete this item?', true)}>Hard Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

      </div>
    </div>
  );
}
