import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api/client';
import Swal from 'sweetalert2';

export default function InventoryTab() {
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGlobalId, setSelectedGlobalId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newUnitValue, setNewUnitValue] = useState('');
  const [newUnitMeasure, setNewUnitMeasure] = useState('kg');
  const [newDesc, setNewDesc] = useState('');
  const [editingProduct, setEditingProduct] = useState(null); // {id, name, price, description}

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['sellerProducts'],
    queryFn: () => api.get('/seller/products'),
  });

  const { data: globalItemsData } = useQuery({
    queryKey: ['globalItems'],
    queryFn: () => api.get('/seller/global-items'),
  });

  const globalItems = globalItemsData?.items || [];

  const companies = useMemo(() => [...new Set(globalItems.map(i => i.company))].sort(), [globalItems]);
  const categories = useMemo(() => {
    if (!selectedCompany) return [];
    return [...new Set(globalItems.filter(i => i.company === selectedCompany).map(i => i.category))].sort();
  }, [globalItems, selectedCompany]);
  const specifications = useMemo(() => {
    if (!selectedCategory) return [];
    return globalItems.filter(i => i.company === selectedCompany && i.category === selectedCategory);
  }, [globalItems, selectedCompany, selectedCategory]);

  // Auto-set unit measure options based on selected item
  const selectedItem = useMemo(() => globalItems.find(i => i.id == selectedGlobalId), [globalItems, selectedGlobalId]);
  const unitMeasureOptions = useMemo(() => {
    if (!selectedItem) return ['kg', 'gm', 'L', 'ml', 'pc', 'pcs', 'packet'];
    const weightTypes = ['kg', 'gm', 'litre', 'ml', 'l', 'weight'];
    return weightTypes.includes((selectedItem.quantity_type || '').toLowerCase())
      ? ['kg', 'gm', 'L', 'ml']
      : ['pc', 'pcs', 'packet', 'box', 'dozen'];
  }, [selectedItem]);

  const addProductMutation = useMutation({
    mutationFn: (data) => api.post('/seller/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sellerProducts']);
      Swal.fire('Success', 'Product added!', 'success');
      setSelectedCompany(''); setSelectedCategory(''); setSelectedGlobalId('');
      setNewPrice(''); setNewUnitValue(''); setNewDesc('');
    },
    onError: (err) => Swal.fire('Error', err.error || 'Failed to add product', 'error')
  });

  const toggleStockMutation = useMutation({
    mutationFn: ({ productId, newStatus }) => api.patch(`/seller/products/${productId}`, { is_available: newStatus }),
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries(['sellerProducts']);
      Swal.fire('Updated', `Product marked as ${newStatus ? 'In Stock' : 'Out of Stock'}`, 'success');
    },
    onError: (err) => Swal.fire('Error', err.error || 'Failed to update stock', 'error')
  });

  const editProductMutation = useMutation({
    mutationFn: ({ productId, data }) => api.patch(`/seller/products/${productId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sellerProducts']);
      setEditingProduct(null);
      Swal.fire('Updated', 'Product updated!', 'success');
    },
    onError: (err) => Swal.fire('Error', err.error || 'Failed to update', 'error')
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId) => api.delete(`/seller/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['sellerProducts']);
      Swal.fire('Deleted', 'Product removed!', 'success');
    },
    onError: (err) => Swal.fire('Error', err.error || 'Failed to delete product', 'error')
  });

  const requestItemMutation = useMutation({
    mutationFn: (data) => api.post('/seller/item-requests', data),
    onSuccess: () => Swal.fire('Submitted', 'Item request sent to Admin!', 'success'),
    onError: (err) => Swal.fire('Error', err.error || 'Failed to submit request', 'error')
  });

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!selectedGlobalId || !newPrice || !newUnitValue) {
      return Swal.fire('Warning', 'Please select an item and fill price & unit value.', 'warning');
    }
    addProductMutation.mutate({
      global_item_id: parseInt(selectedGlobalId),
      price: parseFloat(newPrice),
      unit_value: parseFloat(newUnitValue),
      unit_measure: newUnitMeasure,
      description: newDesc,
    });
  };

  const handleDelete = (id, name) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete '${name}'? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Yes, delete!'
    }).then(result => {
      if (result.isConfirmed) deleteProductMutation.mutate(id);
    });
  };

  const handleRequestNewItem = async () => {
    const companyOptions = companies.map(c => `<option value="${c}">${c}</option>`).join('');
    const { value: formValues } = await Swal.fire({
      title: 'Request New Item',
      html: `
        <div style="text-align:left; display:flex; flex-direction:column; gap:10px;">
          <div>
            <label style="font-weight:bold; display:block; margin-bottom:4px;">Quantity Type</label>
            <select id="req-qtype" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;">
              <option value="weight">Weight</option>
              <option value="pieces">Pieces</option>
            </select>
          </div>
          <div>
            <label style="font-weight:bold; display:block; margin-bottom:4px;">Company</label>
            <input id="req-company" list="req-companies" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;" placeholder="e.g. ITC, Local/Loose">
            <datalist id="req-companies">${companyOptions}</datalist>
          </div>
          <div>
            <label style="font-weight:bold; display:block; margin-bottom:4px;">Category</label>
            <input id="req-category" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;" placeholder="e.g. Atta, Soap">
          </div>
          <div>
            <label style="font-weight:bold; display:block; margin-bottom:4px;">Specification</label>
            <input id="req-spec" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;" placeholder="e.g. Aashirvaad Multigrain 5kg">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Submit Request',
      preConfirm: () => ({
        quantity_type: document.getElementById('req-qtype').value,
        company: document.getElementById('req-company').value.trim(),
        category: document.getElementById('req-category').value.trim(),
        specification: document.getElementById('req-spec').value.trim(),
      })
    });
    if (formValues) {
      if (!formValues.company || !formValues.category || !formValues.specification) {
        return Swal.fire('Error', 'All fields are required.', 'error');
      }
      requestItemMutation.mutate(formValues);
    }
  };

  const handleEditProduct = async (product) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Product',
      html: `
        <div style="text-align:left; display:flex; flex-direction:column; gap:10px;">
          <div>
            <label style="font-weight:bold; display:block; margin-bottom:4px;">Name</label>
            <input id="edit-name" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;" value="${product.name}">
          </div>
          <div>
            <label style="font-weight:bold; display:block; margin-bottom:4px;">Price (₹)</label>
            <input id="edit-price" type="number" step="0.01" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;" value="${product.price}">
          </div>
          <div>
            <label style="font-weight:bold; display:block; margin-bottom:4px;">Description</label>
            <input id="edit-desc" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px;" value="${product.description || ''}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Save Changes',
      preConfirm: () => ({
        name: document.getElementById('edit-name').value.trim(),
        price: parseFloat(document.getElementById('edit-price').value),
        description: document.getElementById('edit-desc').value.trim(),
      })
    });
    if (formValues) {
      if (!formValues.name || isNaN(formValues.price)) {
        return Swal.fire('Error', 'Name and Price are required.', 'error');
      }
      editProductMutation.mutate({ productId: product.id, data: formValues });
    }
  };

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading inventory...</div>;

  const productList = productsData?.products || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>

      {/* Add Product Form */}
      <div className="card" style={{ marginBottom: '20px', background: '#f8f9fa' }}>
        <h3 style={{ margin: '0 0 5px 0' }}>Add New Product</h3>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>Select a product from the platform catalog.</p>

        <form onSubmit={handleAddProduct}>
          {/* Row 1: Cascading dropdowns */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Company</label>
              <select
                value={selectedCompany}
                onChange={e => { setSelectedCompany(e.target.value); setSelectedCategory(''); setSelectedGlobalId(''); }}
                className="input-field"
                style={{ width: '100%', padding: '8px' }}
                required
              >
                <option value="">Select Company</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Category</label>
              <select
                value={selectedCategory}
                onChange={e => { setSelectedCategory(e.target.value); setSelectedGlobalId(''); }}
                className="input-field"
                style={{ width: '100%', padding: '8px' }}
                disabled={!selectedCompany}
                required
              >
                <option value="">Select Company First</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: '2', minWidth: '200px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Specification</label>
              <select
                value={selectedGlobalId}
                onChange={e => setSelectedGlobalId(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '8px' }}
                disabled={!selectedCategory}
                required
              >
                <option value="">Select Category First</option>
                {specifications.map(i => <option key={i.id} value={i.id}>{i.specification}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Price, Unit, Description, Submit */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1', minWidth: '100px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Unit Value</label>
              <input
                type="number" step="0.01"
                value={newUnitValue}
                onChange={e => setNewUnitValue(e.target.value)}
                placeholder="e.g. 500 or 1"
                className="input-field"
                style={{ width: '100%', padding: '8px' }}
                required
              />
            </div>
            <div style={{ flex: '1', minWidth: '100px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Unit Measure</label>
              <select
                value={newUnitMeasure}
                onChange={e => setNewUnitMeasure(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '8px' }}
              >
                {unitMeasureOptions.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '100px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Price (₹)</label>
              <input
                type="number" step="0.01"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                placeholder="0.00"
                className="input-field"
                style={{ width: '100%', padding: '8px' }}
                required
              />
            </div>
            <div style={{ flex: '2', minWidth: '150px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Extra Description (Optional)</label>
              <input
                type="text"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Optional..."
                className="input-field"
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            <button
              type="submit"
              disabled={addProductMutation.isPending}
              className="btn"
              style={{ height: '42px', marginBottom: 0 }}
            >
              Add Product
            </button>
          </div>
        </form>

        <div style={{ marginTop: '15px', textAlign: 'right' }}>
          <button
            onClick={handleRequestNewItem}
            style={{
              background: 'transparent', color: 'var(--primary, #0d6efd)',
              border: '1px solid var(--primary, #0d6efd)',
              padding: '5px 10px', fontSize: '0.85rem', borderRadius: '6px', cursor: 'pointer'
            }}
          >
            Can't find your item? Request Admin
          </button>
        </div>
      </div>

      {/* Products List */}
      <h3 style={{ marginBottom: '15px' }}>My Products</h3>

      {productList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#666' }}>
          No products yet. Add your first product above!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
          {productList.map(p => {
            const statusColor = p.is_available ? '#28a745' : '#dc3545';
            const statusText = p.is_available ? 'In Stock' : 'Out of Stock';
            return (
              <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', borderLeft: `4px solid ${statusColor}` }}>
                {/* Product info */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '5px', border: '1px solid #ddd' }} />
                  ) : (
                    <div style={{ width: '60px', height: '60px', background: '#eee', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '1.5rem' }}>📦</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong>{p.name}</strong>
                      <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: statusColor + '22', color: statusColor, whiteSpace: 'nowrap' }}>
                        {statusText}
                      </span>
                    </div>
                    <p style={{ color: '#666', fontSize: '0.85rem', margin: '4px 0 0 0' }}>{p.description || ''}</p>
                  </div>
                </div>

                <p style={{ fontWeight: 'bold', color: 'var(--primary, #0d6efd)', fontSize: '1.2rem', margin: '0 0 10px 0' }}>
                  ₹{p.price?.toFixed(2)}
                </p>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  <button
                    className="btn"
                    onClick={() => handleEditProduct(p)}
                    style={{ flex: 1, background: '#ffc107', color: '#000', padding: '5px' }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn"
                    onClick={() => toggleStockMutation.mutate({ productId: p.id, newStatus: !p.is_available })}
                    disabled={toggleStockMutation.isPending}
                    style={{ flex: 1, background: p.is_available ? '#dc3545' : '#28a745', padding: '5px' }}
                  >
                    {p.is_available ? 'Mark Out' : 'Mark In'}
                  </button>
                  <button
                    className="btn"
                    onClick={() => handleDelete(p.id, p.name)}
                    style={{ flex: 1, background: '#6c757d', padding: '5px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
