import React, { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import Navbar from '../../components/Navbar';
// Analytics is loaded eagerly because chart.js is large and lazy-loading causes a noticeable delay
import AnalyticsTab from './components/AnalyticsTab';

// Lazy Load remaining Tabs

const UsersTab = React.lazy(() => import('./components/UsersTab'));
const ShopsTab = React.lazy(() => import('./components/ShopsTab'));
const DisputesTab = React.lazy(() => import('./components/DisputesTab'));
const OrdersTab = React.lazy(() => import('./components/OrdersTab'));
const TransactionsTab = React.lazy(() => import('./components/TransactionsTab'));
const AuditLogsTab = React.lazy(() => import('./components/AuditLogsTab'));
const ComplaintsTab = React.lazy(() => import('./components/ComplaintsTab'));
const ItemsTab = React.lazy(() => import('./components/ItemsTab'));
const PayoutsTab = React.lazy(() => import('./components/PayoutsTab'));
const RecycleBinTab = React.lazy(() => import('./components/RecycleBinTab'));
const PicManagerTab = React.lazy(() => import('./components/PicManagerTab'));
const DeliverySetupTab = React.lazy(() => import('./components/DeliverySetupTab'));
const OffersTab = React.lazy(() => import('./components/OffersTab'));
const PlatformControlsTab = React.lazy(() => import('./components/PlatformControlsTab'));
const BroadcastTab = React.lazy(() => import('./components/BroadcastTab'));
const LiveMapTab = React.lazy(() => import('./components/LiveMapTab'));


function ActiveStats() {
  const { data } = useQuery({
    queryKey: ['adminActiveStats'],
    queryFn: () => api.get('/admin/active-stats'),
    refetchInterval: 60000
  });

  if (!data) return null;

  return (
    <div className="active-stats-box">
        <div className="stat-item"><span style={{ color: '#09829a' }}>🚲 Active Delivery:</span> {data.delivery}</div>
        <div className="stat-item"><span style={{ color: '#198754' }}>🏪 Active Shops:</span> {data.shops}</div>
        <div className="stat-item"><span style={{ color: '#6f42c1' }}>👥 Active Buyers:</span> {data.buyers}</div>
        <div className="stat-item"><span style={{ color: '#dc3545' }}>👤 Active Admins:</span> {data.admins}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('adminActiveTab') || 'Users');
  const [activeSubTab, setActiveSubTab] = useState(() => localStorage.getItem('adminActiveSubTab') || 'All');

  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('adminActiveSubTab', activeSubTab);
  }, [activeSubTab]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleTabClick = (tabName) => {
    if (tabName !== activeTab) {
      setActiveTab(tabName);
      // Reset sub-tab based on the new tab
      if (tabName === 'Users') setActiveSubTab('All');
      else setActiveSubTab('');
    }
    // Don't close sidebar immediately if they click the active tab (to allow clicking sub-tabs)
  };

  const handleSubTabClick = (subTab) => {
    setActiveSubTab(subTab);
    setIsSidebarOpen(false); // Close sidebar after selecting a sub-tab
  };

  // Define sub-tabs for tabs that have them
  const tabSubTabs = {
    'Users': ['All', 'User', 'Seller', 'Delivery Boy', 'Admin', 'Deleted'],
    // Future tabs can have sub-tabs here
  };

  const tabs = [
    { name: 'Users', icon: '👥' },
    { name: 'Shops', icon: '🏪' },
    { name: 'Disputes', icon: '⚠️' },
    { name: 'Orders', icon: '📦' },
    { name: 'Transactions', icon: '💳' },
    { name: 'Audit Logs', icon: '📜' },
    { name: 'Complaints', icon: '🚨' },
    { name: 'Items', icon: '🍔' },
    { name: 'Payouts', icon: '💸' },
    { name: 'Recycle Bin', icon: '🗑️' },
    { name: 'Pic Manager', icon: '🖼️' },
    { name: 'Delivery Setup', icon: '🚚' },
    { name: 'Offers', icon: '🎁' },
    { name: 'Live Map', icon: 'dY"?' },
      { name: 'Analytics', icon: '📊' },
    { name: 'Platform Controls', icon: '⚙️' },
    { name: 'Broadcast', icon: '📢' },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'Users': return <UsersTab activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />;
      case 'Shops': return <ShopsTab />;
      case 'Disputes': return <DisputesTab />;
      case 'Orders': return <OrdersTab />;
      case 'Transactions': return <TransactionsTab />;
      case 'Audit Logs': return <AuditLogsTab />;
      case 'Complaints': return <ComplaintsTab />;
      case 'Items': return <ItemsTab />;
      case 'Payouts': return <PayoutsTab />;
      case 'Recycle Bin': return <RecycleBinTab />;
      case 'Pic Manager': return <PicManagerTab />;
      case 'Delivery Setup': return <DeliverySetupTab />;
      case 'Offers': return <OffersTab />;
      case 'Live Map': return <LiveMapTab />;
      case 'Analytics': return <AnalyticsTab />;
      case 'Platform Controls': return <PlatformControlsTab />;
      case 'Broadcast': return <BroadcastTab />;
      default: return <UsersTab activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} />;
    }
  };

  return (
    <div style={{ background: '#f0f4f8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
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
        }

        .active-stats-box {
          display: flex;
          gap: 15px;
          background: #fff;
          padding: 10px 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          border: 1px solid #e0e0e0;
          flex-wrap: wrap;
        }

        .stat-item {
          font-weight: bold;
          font-size: 0.9rem;
          color: #333;
          padding-right: 15px;
          border-right: 1px solid #eee;
        }
        .stat-item:last-child {
          border-right: none;
          padding-right: 0;
        }

        .desktop-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          background: #fff;
          padding: 15px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          margin-bottom: 20px;
        }

        .tab-btn {
          padding: 8px 14px;
          border: 1px solid #e0e0e0;
          background: #f8f9fa;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          color: #555;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }
        .tab-btn.active {
          border-color: #4CAF50;
          background: #4CAF50;
          color: white;
          box-shadow: 0 2px 6px rgba(76, 175, 80, 0.4);
        }

        .mobile-menu-btn {
          display: none;
          background: #333;
          color: white;
          border: none;
          padding: 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1.2rem;
          margin-right: 15px;
        }

        .mobile-sidebar-overlay {
          display: none;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            width: 100%;
            padding: 10px;
          }
          
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .mobile-menu-btn {
            display: inline-block;
          }

          .desktop-tabs {
            display: none;
          }

          .active-stats-box {
            font-size: 0.8rem;
            padding: 10px;
          }

          .stat-item {
            padding-right: 10px;
          }

          .mobile-sidebar-overlay {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.5);
            z-index: 999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
          }
          .mobile-sidebar-overlay.open {
            opacity: 1;
            pointer-events: auto;
          }

          .mobile-sidebar {
            position: fixed;
            top: 0;
            left: -280px;
            width: 250px;
            height: 100vh;
            background: white;
            z-index: 1000;
            padding: 20px;
            box-shadow: 2px 0 10px rgba(0,0,0,0.2);
            transition: left 0.3s ease;
            display: flex;
            flex-direction: column;
            gap: 5px;
            overflow-y: auto;
          }
          .mobile-sidebar.open {
            left: 0;
          }

          .sidebar-tab-btn {
            padding: 12px;
            text-align: left;
            background: none;
            border: none;
            border-bottom: 1px solid #eee;
            font-size: 1rem;
            color: #333;
            width: 100%;
          }
          .sidebar-tab-btn.active {
            color: #4CAF50;
            font-weight: bold;
            border-left: 4px solid #4CAF50;
            background: #f0f9f0;
          }

          .sidebar-subtab-btn {
            padding: 10px 10px 10px 30px;
            text-align: left;
            background: none;
            border: none;
            font-size: 0.9rem;
            color: #555;
            width: 100%;
          }
          .sidebar-subtab-btn.active {
            color: #4f46e5;
            font-weight: bold;
            background: #f5f5ff;
            border-left: 4px solid #4f46e5;
          }
        }
      `}</style>

      <Navbar />

      <main className="dashboard-container">
        <div className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>☰</button>
            <h2 style={{ margin: 0, color: '#333' }}>Admin Dashboard</h2>
          </div>
          <ActiveStats />
        </div>

        {/* Desktop Tabs */}
        <div className="desktop-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => {
                setActiveTab(tab.name);
                if (tab.name === 'Users') setActiveSubTab('All');
              }}
              className={`tab-btn ${activeTab === tab.name ? 'active' : ''}`}
            >
              <span style={{ marginRight: '5px' }}>{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        {/* Mobile Sidebar */}
        <div 
          className={`mobile-sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
          onClick={() => setIsSidebarOpen(false)}
        >
          <div 
            className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '10px', marginTop: 0 }}>Menu</h3>
            {tabs.map((tab) => (
              <div key={tab.name}>
                <button
                  onClick={() => handleTabClick(tab.name)}
                  className={`sidebar-tab-btn ${activeTab === tab.name ? 'active' : ''}`}
                >
                  <span style={{ marginRight: '10px' }}>{tab.icon}</span>
                  {tab.name}
                </button>
                
                {/* Render Nested Sub-tabs if this tab is active and has sub-tabs */}
                {activeTab === tab.name && tabSubTabs[tab.name] && (
                  <div style={{ display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
                    {tabSubTabs[tab.name].map(sub => (
                      <button
                        key={sub}
                        onClick={() => handleSubTabClick(sub)}
                        className={`sidebar-subtab-btn ${activeSubTab === sub ? 'active' : ''}`}
                      >
                        ↳ {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', minHeight: '500px', flex: 1 }}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>⏳ Loading...</div>}>
            {renderActiveTab()}
          </Suspense>
        </div>

      </main>
    </div>
  );
}


