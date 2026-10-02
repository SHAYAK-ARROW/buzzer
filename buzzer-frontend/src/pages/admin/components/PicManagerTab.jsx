import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import api from '../../../api/client';

export default function PicManagerTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminPicManager', page],
    queryFn: () => api.get('/admin/items', { params: { page, limit: 50 } })
  });

  const toggleVisibility = useMutation({
    mutationFn: ({ id, action }) => api.post(`/admin/items/${id}/${action}-image`),
    onSuccess: (_, variables) => {
      Swal.fire('Success', variables.action === 'hide' ? 'Image hidden.' : 'Image restored.', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminPicManager'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const hardDeleteImage = useMutation({
    mutationFn: (id) => api.delete(`/admin/items/${id}/image`),
    onSuccess: () => {
      Swal.fire('Deleted', 'Image permanently deleted from storage.', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminPicManager'] });
    },
    onError: (err) => Swal.fire('Error', err.error || err.message, 'error')
  });

  const handleToggleVisibility = async (id, action) => {
    toggleVisibility.mutate({ id, action });
  };

  const handleHardDelete = async (id) => {
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the picture from storage.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545'
    });
    if (confirm.isConfirmed) {
      hardDeleteImage.mutate(id);
    }
  };

  if (isLoading) return <p>Loading images...</p>;
  if (error) return <div style={{ color: 'red' }}>Error: {error.message}</div>;

  const itemsWithImages = (data?.items || []).filter(i => i.original_image_url);

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Pic Manager</h3>
      
      {itemsWithImages.length === 0 ? (
        <p>No images found in the catalog (Page {page}).</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
          {itemsWithImages.map(i => {
            const isHidden = i.is_image_hidden;
            return (
              <div key={i.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', background: '#fff', textAlign: 'center', opacity: isHidden ? 0.6 : 1, position: 'relative' }}>
                {isHidden && (
                  <span style={{ position: 'absolute', top: '5px', right: '5px', background: '#dc3545', color: '#fff', padding: '2px 5px', fontSize: '0.7rem', borderRadius: '4px' }}>
                    Hidden
                  </span>
                )}
                <img 
                  src={i.original_image_url} 
                  alt={i.category}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Image+Missing'; }}
                  style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px', marginBottom: '10px' }}
                />
                <h4 style={{ margin: '0', fontSize: '0.9rem' }}>{i.company}</h4>
                <p style={{ margin: '5px 0', fontSize: '0.8rem', color: '#666' }}>{i.category} - {i.specification}</p>
                
                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', marginTop: '10px' }}>
                  {isHidden ? (
                    <button style={{ flex: 1, background: '#28a745', color: '#fff', padding: '4px 8px', fontSize: '0.8rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleToggleVisibility(i.id, 'restore')}>
                      Restore
                    </button>
                  ) : (
                    <button style={{ flex: 1, background: '#ffc107', color: '#000', padding: '4px 8px', fontSize: '0.8rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleToggleVisibility(i.id, 'hide')}>
                      Soft Del
                    </button>
                  )}
                  <button style={{ flex: 1, background: '#dc3545', color: '#fff', padding: '4px 8px', fontSize: '0.8rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleHardDelete(i.id)}>
                    Hard Del
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {data?.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
          <button 
            style={{ padding: '5px 10px', borderRadius: '4px', border: 'none', background: page > 1 ? '#0d6efd' : '#e9ecef', color: page > 1 ? '#fff' : '#aaa', cursor: page > 1 ? 'pointer' : 'not-allowed' }}
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            &laquo; Previous
          </button>
          <span style={{ fontSize: '0.9rem', color: '#555' }}>
            Page <strong>{data.page}</strong> of <strong>{data.pages}</strong>
          </span>
          <button 
            style={{ padding: '5px 10px', borderRadius: '4px', border: 'none', background: page < data.pages ? '#0d6efd' : '#e9ecef', color: page < data.pages ? '#fff' : '#aaa', cursor: page < data.pages ? 'pointer' : 'not-allowed' }}
            disabled={page >= data.pages}
            onClick={() => setPage(p => p + 1)}
          >
            Next &raquo;
          </button>
        </div>
      )}
    </div>
  );
}
