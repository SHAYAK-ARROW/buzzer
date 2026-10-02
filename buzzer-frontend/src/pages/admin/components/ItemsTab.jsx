import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import api from '../../../api/client';

const styles = {
  th: { padding: '10px', background: '#f8f9fa', borderBottom: '2px solid #ddd', textAlign: 'left' },
  td: { padding: '10px', borderBottom: '1px solid #eee' },
  btn: { padding: '5px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
  input: { padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '100%', boxSizing: 'border-box' },
  formGroup: { marginBottom: '15px', flex: '1', minWidth: '200px' }
};

export default function ItemsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('');
  const [specification, setSpecification] = useState('');
  const [qType, setQType] = useState('kg');
  const [imgUrl, setImgUrl] = useState('');

  const { data: itemsData, isLoading: loadingItems } = useQuery({
    queryKey: ['adminItems', page],
    queryFn: () => api.get('/admin/items', { params: { page, limit: 50 } })
  });

  const { data: reqData, isLoading: loadingReqs } = useQuery({
    queryKey: ['adminItemRequests'],
    queryFn: () => api.get('/admin/item-requests')
  });

  const addItem = useMutation({
    mutationFn: (payload) => api.post('/admin/items', payload),
    onSuccess: () => {
      Swal.fire('Success', 'Item added to global catalog!', 'success');
      setCompany(''); setCategory(''); setSpecification(''); setImgUrl('');
      queryClient.invalidateQueries({ queryKey: ['adminItems'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const handleItemRequest = useMutation({
    mutationFn: ({ reqId, action }) => api.post(`/admin/item-requests/${reqId}/${action}`),
    onSuccess: (data) => {
      Swal.fire('Success', data.message, 'success');
      queryClient.invalidateQueries({ queryKey: ['adminItemRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminItems'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const deleteItem = useMutation({
    mutationFn: (itemId) => api.delete(`/admin/items/${itemId}`),
    onSuccess: () => {
      Swal.fire('Deleted', 'Item moved to recycle bin', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminItems'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const editItem = useMutation({
    mutationFn: ({ itemId, payload }) => api.patch(`/admin/items/${itemId}`, payload),
    onSuccess: () => {
      Swal.fire('Success', 'Item updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminItems'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const handleAddItem = (e) => {
    e.preventDefault();
    addItem.mutate({ company, category, specification: specification, quantity_type: qType, image_url: imgUrl });
  };

  const handleEditItem = async (item) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Global Item',
      html: `
        <input id="swal-company" class="swal2-input" placeholder="Company" value="${item.company || ''}">
        <input id="swal-category" class="swal2-input" placeholder="Category" value="${item.category || ''}">
        <input id="swal-spec" class="swal2-input" placeholder="Specification" value="${item.specification || ''}">
      `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        return {
          company: document.getElementById('swal-company').value,
          category: document.getElementById('swal-category').value,
          specification: document.getElementById('swal-spec').value,
        };
      }
    });
    if (formValues) {
      editItem.mutate({ itemId: item.id, payload: formValues });
    }
  };

  const handleViewShops = async (itemId, itemName) => {
    try {
      const res = await api.get(`/admin/items/${itemId}/shops`);
      let html = `<div style="max-height:60vh; overflow-y:auto; text-align:left;">`;
      if (res.shops.length === 0) {
        html += `<p>No shops are currently selling this item.</p>`;
      } else {
        html += `<table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
          <tr style="background:#f8f9fa; border-bottom:1px solid #ddd;">
            <th style="padding:8px">Shop Name</th>
            <th style="padding:8px">Price</th>
            <th style="padding:8px">Available</th>
          </tr>`;
        res.shops.forEach(s => {
          html += `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:8px">${s.shop_name} (ID: ${s.shop_id})</td>
            <td style="padding:8px">₹${s.price}</td>
            <td style="padding:8px">${s.is_available ? '<span style="color:green">Yes</span>' : '<span style="color:red">No</span>'}</td>
          </tr>`;
        });
        html += `</table>`;
      }
      html += `</div>`;
      Swal.fire({ title: `Shops selling: ${itemName}`, html, width: 600 });
    } catch (err) {
      Swal.fire('Error', err.error || err.message, 'error');
    }
  };

  const handleDelete = async (itemId) => {
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'This item will be soft-deleted and moved to Recycle Bin.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545'
    });
    if (confirm.isConfirmed) {
      deleteItem.mutate(itemId);
    }
  };

  const items = itemsData?.items || [];
  const requests = reqData?.requests || [];

  return (
    <div>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        
        {/* Pending Requests */}
        <div style={{ flex: '1', minWidth: '300px', background: '#fff', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ffc107', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0 }}>Pending Item Requests (From Sellers)</h3>
          {loadingReqs ? <p>Loading...</p> : requests.length === 0 ? <p>No pending requests.</p> : (
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {requests.map(r => (
                <div key={r.id} style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
                  <strong>Requested By:</strong> {r.shop_name}<br/>
                  <strong>Company:</strong> {r.requested_company}<br/>
                  <strong>Category:</strong> {r.requested_category}<br/>
                  <strong>Specification:</strong> {r.requested_specification}<br/>
                  <strong>Type:</strong> {r.quantity_type}<br/>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button style={{...styles.btn, background: '#1e7e34', color: '#fff'}} onClick={() => handleItemRequest.mutate({ reqId: r.id, action: 'approve' })}>Approve</button>
                    <button style={{...styles.btn, background: '#dc3545', color: '#fff'}} onClick={() => handleItemRequest.mutate({ reqId: r.id, action: 'reject' })}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Item */}
        <div style={{ flex: '1', minWidth: '300px', background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginTop: 0 }}>Add Item to Global Catalog</h3>
          <form onSubmit={handleAddItem}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div style={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Company / Brand</label>
                <input type="text" required style={styles.input} placeholder="e.g. Fortune, Local/Loose" value={company} onChange={e => setCompany(e.target.value)} />
              </div>
              <div style={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Category</label>
                <input type="text" required style={styles.input} placeholder="e.g. Mustard Oil" value={category} onChange={e => setCategory(e.target.value)} />
              </div>
              <div style={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Specification</label>
                <input type="text" required style={styles.input} placeholder="e.g. 1L bottle" value={specification} onChange={e => setSpecification(e.target.value)} />
              </div>
              <div style={styles.formGroup}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Unit of Measure</label>
                <select required style={styles.input} value={qType} onChange={e => setQType(e.target.value)}>
                  <optgroup label="Weight / Volume">
                    <option value="kg">kg</option>
                    <option value="gm">gm</option>
                    <option value="litre">litre</option>
                    <option value="ml">ml</option>
                  </optgroup>
                  <optgroup label="Count / Pack">
                    <option value="piece">piece</option>
                    <option value="packet">packet</option>
                    <option value="box">box</option>
                    <option value="dozen">dozen</option>
                  </optgroup>
                </select>
              </div>
              <div style={{ ...styles.formGroup, width: '100%' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Image URL (optional)</label>
                <input type="text" style={styles.input} placeholder="https://..." value={imgUrl} onChange={e => setImgUrl(e.target.value)} />
              </div>
            </div>
            <button type="submit" style={{ ...styles.btn, background: '#0d6efd', color: '#fff', width: '100%', marginTop: '10px', padding: '10px' }}>
              + Add Item to Catalog
            </button>
          </form>
        </div>
      </div>

      {/* Global Catalog Table */}
      <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', padding: '15px' }}>
        <h3 style={{ marginTop: 0 }}>Global Platform Catalog</h3>
        {loadingItems ? <p>Loading catalog...</p> : items.length === 0 ? <p>No items found.</p> : (
          <>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th style={styles.th}>UID</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Company</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Specification</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(i => (
                    <tr key={i.id}>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 'bold', color: '#d63384' }}>{i.uid}</td>
                      <td style={styles.td}>{i.quantity_type}</td>
                      <td style={styles.td}>{i.company}</td>
                      <td style={styles.td}>{i.category}</td>
                      <td style={styles.td}>{i.specification}</td>
                      <td style={{ ...styles.td, display: 'flex', gap: '5px' }}>
                        <button style={{ ...styles.btn, background: '#dc3545', color: '#fff' }} onClick={() => handleDelete(i.id)}>Delete</button>
                        <button style={{ ...styles.btn, background: '#ffc107', color: '#000' }} onClick={() => handleEditItem(i)}>Edit</button>
                        <button style={{ ...styles.btn, background: '#0f6674', color: '#fff' }} onClick={() => handleViewShops(i.id, `${i.company} ${i.category}`)}>View Shops</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {itemsData?.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
                <button 
                  style={{...styles.btn, background: page > 1 ? '#0d6efd' : '#e9ecef', color: page > 1 ? '#fff' : '#aaa', cursor: page > 1 ? 'pointer' : 'not-allowed'}}
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  &laquo; Previous
                </button>
                <span style={{ fontSize: '0.9rem', color: '#555' }}>
                  Page <strong>{itemsData.page}</strong> of <strong>{itemsData.pages}</strong>
                </span>
                <button 
                  style={{...styles.btn, background: page < itemsData.pages ? '#0d6efd' : '#e9ecef', color: page < itemsData.pages ? '#fff' : '#aaa', cursor: page < itemsData.pages ? 'pointer' : 'not-allowed'}}
                  disabled={page >= itemsData.pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next &raquo;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
