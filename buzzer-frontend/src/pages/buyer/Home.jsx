import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import FloatingCart from '../../components/FloatingCart';
import ShopList from './ShopList';
import { getSearchSuggestions } from '../../api/browse';
import { useQuery } from '@tanstack/react-query';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  // Load Search History from LocalStorage
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('buyer_search_history') || '[]');
    setSearchHistory(history);
  }, []);

  // Custom Debounce (400ms delay to prevent API spam)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch suggestions using React Query (only triggers when debouncedTerm changes)
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['searchSuggestions', debouncedTerm],
    queryFn: () => getSearchSuggestions(debouncedTerm),
    enabled: debouncedTerm.trim().length > 1, // Only search if > 1 char
    staleTime: 1000 * 60, // 1 minute
  });

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  const saveToHistoryAndNavigate = (query) => {
    if (!query.trim()) return;
    
    // Save to history (max 5 items)
    let history = JSON.parse(localStorage.getItem('buyer_search_history') || '[]');
    history = history.filter(h => h.toLowerCase() !== query.toLowerCase()); // Remove duplicates
    history.unshift(query.trim()); // Add to top
    if (history.length > 5) history.pop(); // Keep only last 5
    
    localStorage.setItem('buyer_search_history', JSON.stringify(history));
    setSearchHistory(history);
    
    setShowSuggestions(false);
    navigate(`/buyer/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    saveToHistoryAndNavigate(searchTerm);
  };

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: '50px' }}>
      <Navbar />
      
      {/* Search Header Banner */}
      <div style={{ 
        background: 'linear-gradient(135deg, var(--primary) 0%, #0d47a1 100%)', 
        padding: '40px 20px', 
        textAlign: 'center',
        color: '#fff',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 20px 0', fontSize: '2.2rem', textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
          Order Groceries & Essentials
        </h1>
        
        <div ref={wrapperRef} style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search for 'Rice', 'Milk', or 'Shop Name'..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              style={{
                width: '100%',
                padding: '15px 20px 15px 45px',
                fontSize: '1.1rem',
                borderRadius: '30px',
                border: 'none',
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                outline: 'none'
              }}
            />
            <span style={{ position: 'absolute', left: '15px', top: '15px', color: '#666', fontSize: '1.2rem' }}>&#128269;</span>
            <button 
              type="submit"
              style={{
                position: 'absolute',
                right: '5px',
                top: '5px',
                bottom: '5px',
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '25px',
                padding: '0 25px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Search
            </button>
          </form>

          {/* Autocomplete Dropdown & History */}
          {showSuggestions && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '10px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              zIndex: 1000,
              textAlign: 'left',
              overflow: 'hidden'
            }}>
              
              {/* Show History if input is empty */}
              {searchTerm.trim().length === 0 && searchHistory.length > 0 && (
                <div>
                  <div style={{ padding: '8px 15px', background: '#f1f3f5', color: '#888', fontSize: '0.85rem' }}>
                    Recent Searches
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {searchHistory.map((h, idx) => (
                      <li key={idx} 
                          onClick={() => saveToHistoryAndNavigate(h)}
                          style={{ padding: '12px 15px', borderBottom: '1px solid #f1f3f5', cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                      >
                        <span style={{ color: '#aaa' }}>📍</span> {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Show Loading or Suggestions if typing */}
              {searchTerm.trim().length > 1 && (
                <>
                  {isLoading ? (
                    <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>Loading suggestions...</div>
                  ) : (
                    <>
                      {(!suggestions?.products?.length && !suggestions?.shops?.length) ? (
                        <div style={{ padding: '15px', color: '#666', textAlign: 'center' }}>No results found</div>
                      ) : (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                          
                          {/* Product Suggestions */}
                          {suggestions.products && suggestions.products.length > 0 && (
                            <>
                              <li style={{ padding: '8px 15px', background: '#f1f3f5', color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                PRODUCTS
                              </li>
                              {suggestions.products.map((p, idx) => (
                                <li key={`prod-${idx}`} 
                                    onClick={() => saveToHistoryAndNavigate(p)}
                                    style={{ padding: '12px 15px', borderBottom: '1px solid #f1f3f5', cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                                >
                                  <span style={{ background: '#e3f2fd', padding: '5px', borderRadius: '4px', fontSize: '0.8rem' }}>📦</span>
                                  {p}
                                </li>
                              ))}
                            </>
                          )}

                          {/* Shop Suggestions */}
                          {suggestions.shops && suggestions.shops.length > 0 && (
                            <>
                              <li style={{ padding: '8px 15px', background: '#f1f3f5', color: '#666', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                SHOPS
                              </li>
                              {suggestions.shops.map((s, idx) => (
                                <li key={`shop-${idx}`} 
                                    onClick={() => saveToHistoryAndNavigate(s)}
                                    style={{ padding: '12px 15px', borderBottom: '1px solid #f1f3f5', cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: '10px' }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                                >
                                  <span style={{ background: '#e8f5e9', padding: '5px', borderRadius: '4px', fontSize: '0.8rem' }}>🏪</span>
                                  {s}
                                </li>
                              ))}
                            </>
                          )}
                        </ul>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        <h3 style={{ marginBottom: '1.5rem', color: '#333', fontSize: '1.5rem', borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '5px' }}>
          🛒 Shops Near You
        </h3>
        <ShopList />
      </div>
    </div>
  );
}



