import React, { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import Navbar from '../../components/Navbar';

// Lazy Load Tabs
const OverviewTab = React.lazy(() => import('./components/OverviewTab'));
const OrdersTab = React.lazy(() => import('./components/OrdersTab'));
const InventoryTab = React.lazy(() => import('./components/InventoryTab'));
const WalletTab = React.lazy(() => import('./components/WalletTab'));
const OffersTab = React.lazy(() => import('./components/OffersTab'));
const SettingsTab = React.lazy(() => import('./components/SettingsTab'));

export default function SellerDashboard() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('sellerActiveTab') || 'Overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sellerActiveTab', activeTab);
  }, [activeTab]);

  const { data: shopData } = useQuery({
    queryKey: ['sellerShop'],
    queryFn: () => api.get('/seller/shop'),
  });
  const shop = shopData?.shop;

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    setIsSidebarOpen(false); // Close sidebar on mobile after clicking
  };

  const tabs = [
    { name: 'Overview', icon: '📊' },
    { name: 'Orders', icon: '🛒' },
    { name: 'Inventory', icon: '📦' },
    { name: 'Wallet', icon: '💰' },
    { name: 'Offers', icon: '🎁' },
    { name: 'Settings', icon: '⚙️' },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'Overview': return <OverviewTab />;
      case 'Orders': return <OrdersTab />;
      case 'Inventory': return <InventoryTab />;
      case 'Wallet': return <WalletTab />;
      case 'Offers': return <OffersTab />;
      case 'Settings': return <SettingsTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f0f4f8' }}>
      <Navbar />
      
      <main className="dashboard-container">
        <div className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>☰</button>
            <h2 style={{ margin: 0, color: '#333' }}>
              Shop: {shop?.name || 'Loading...'}{' '}
              <small style={{ color: '#666', fontSize: '0.6em' }}>@{shop?.owner_nickname || shop?.owner_name || ''}</small>{' '}
              <small style={{ color: '#666', fontSize: '0.6em', marginLeft: '5px' }}>
                {shop?.is_approved ? <span style={{ color: 'green' }}>(Approved)</span> : <span style={{ color: 'orange' }}>(Pending)</span>}
              </small>
            </h2>
          </div>
          <div className="active-stats-box">
             <div className="stat-item">
               <span style={{ color: shop?.is_active ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                 {shop?.is_active ? '🟢 Online (Accepting Orders)' : '🔴 Offline'}
               </span>
             </div>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="desktop-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => handleTabClick(tab.name)}
              className={`tab-btn ${activeTab === tab.name ? 'active' : ''}`}
            >
              <span style={{ marginRight: '5px' }}>{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        {/* Mobile Sidebar Overlay */}
        <div 
          className={`mobile-sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
          onClick={() => setIsSidebarOpen(false)}
        >
          <div 
            className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '10px', marginTop: 0 }}>Seller Menu</h3>
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => handleTabClick(tab.name)}
                className={`sidebar-tab-btn ${activeTab === tab.name ? 'active' : ''}`}
              >
                <span style={{ marginRight: '10px' }}>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="dashboard-content">
          <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
            {renderActiveTab()}
          </Suspense>
        </div>
      </main>

      <style>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: 20px;
          margin: 0 auto;
          width: 98%;
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .active-stats-box {
          display: flex;
          gap: 15px;
          background: #fff;
          padding: 10px 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          flex-wrap: wrap;
        }

        .stat-item {
          font-weight: bold;
          font-size: 0.9rem;
        }

        .desktop-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 2px solid #ddd;
          padding-bottom: 10px;
          overflow-x: auto;
        }

        .tab-btn {
          padding: 10px 20px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          color: #555;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab-btn:hover {
          background: #f8f9fa;
        }

        .tab-btn.active {
          background: var(--primary, #0d6efd);
          color: #fff;
          border-color: var(--primary, #0d6efd);
        }

        .dashboard-content {
          background: transparent;
          flex: 1;
        }

        /* Mobile Styles */
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          margin-right: 15px;
          color: #333;
        }

        .mobile-sidebar-overlay {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s;
        }

        .mobile-sidebar-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        .mobile-sidebar {
          position: fixed;
          top: 0; left: -280px; bottom: 0;
          width: 280px;
          background: #fff;
          padding: 20px;
          box-shadow: 2px 0 10px rgba(0,0,0,0.1);
          transition: left 0.3s ease;
          overflow-y: auto;
        }

        .mobile-sidebar.open {
          left: 0;
        }

        .sidebar-tab-btn {
          display: block;
          width: 100%;
          padding: 12px 15px;
          background: none;
          border: none;
          text-align: left;
          font-size: 1rem;
          color: #333;
          border-radius: 6px;
          margin-bottom: 5px;
          cursor: pointer;
        }

        .sidebar-tab-btn.active {
          background: #e9ecef;
          font-weight: bold;
          color: var(--primary, #0d6efd);
        }

        @media (max-width: 768px) {
          .desktop-tabs {
            display: none;
          }
          .mobile-menu-btn {
            display: block;
          }
          .mobile-sidebar-overlay {
            display: block;
          }
          .dashboard-container {
            padding: 10px;
          }
          .active-stats-box {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
