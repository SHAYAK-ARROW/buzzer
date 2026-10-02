const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/OverviewTab-CY7f1bHE.js","assets/rolldown-runtime-hePW80VL.js","assets/token-CJiBv84G.js","assets/jsx-runtime-NZYk81nU.js","assets/useQuery-DinB0woV.js","assets/index-CcXsPUjS.js","assets/preload-helper-BZ1Pz5am.js","assets/index-CKH9zPHz.css","assets/useMutation-BLn_t3UF.js","assets/client-BtS4vlrG.js","assets/sweetalert2.all-Dvy87gJ2.js","assets/dist-Cwe12wSc.js","assets/OrdersTab-CJR59FGQ.js","assets/InventoryTab-EqXPmCEq.js","assets/WalletTab-wl2irPcD.js","assets/OffersTab-WA4YRfcr.js","assets/SettingsTab-Dz_4EHFJ.js"])))=>i.map(i=>d[i]);
import{r as e}from"./rolldown-runtime-hePW80VL.js";import{L as t}from"./token-CJiBv84G.js";import{t as n}from"./preload-helper-BZ1Pz5am.js";import{t as r}from"./jsx-runtime-NZYk81nU.js";import{t as i}from"./useQuery-DinB0woV.js";import{t as a}from"./client-BtS4vlrG.js";import{t as o}from"./Navbar-DgeFa1DU.js";var s=e(t(),1),c=r(),l=s.lazy(()=>n(()=>import(`./OverviewTab-CY7f1bHE.js`),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11]))),u=s.lazy(()=>n(()=>import(`./OrdersTab-CJR59FGQ.js`),__vite__mapDeps([12,1,2,3,4,5,6,7,8,9,10]))),d=s.lazy(()=>n(()=>import(`./InventoryTab-EqXPmCEq.js`),__vite__mapDeps([13,1,2,3,4,5,6,7,8,9,10]))),f=s.lazy(()=>n(()=>import(`./WalletTab-wl2irPcD.js`),__vite__mapDeps([14,1,2,3,4,5,6,7,9]))),p=s.lazy(()=>n(()=>import(`./OffersTab-WA4YRfcr.js`),__vite__mapDeps([15,1,2,3,4,5,6,7,8,9,10]))),m=s.lazy(()=>n(()=>import(`./SettingsTab-Dz_4EHFJ.js`),__vite__mapDeps([16,1,2,3,4,5,6,7,8,9,10])));function h(){let[e,t]=(0,s.useState)(()=>localStorage.getItem(`sellerActiveTab`)||`Overview`),[n,r]=(0,s.useState)(!1);(0,s.useEffect)(()=>{localStorage.setItem(`sellerActiveTab`,e)},[e]);let{data:h}=i({queryKey:[`sellerShop`],queryFn:()=>a.get(`/seller/shop`)}),g=h?.shop,_=e=>{t(e),r(!1)},v=[{name:`Overview`,icon:`📊`},{name:`Orders`,icon:`🛒`},{name:`Inventory`,icon:`📦`},{name:`Wallet`,icon:`💰`},{name:`Offers`,icon:`🎁`},{name:`Settings`,icon:`⚙️`}];return(0,c.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,minHeight:`100vh`,backgroundColor:`#f0f4f8`},children:[(0,c.jsx)(o,{}),(0,c.jsxs)(`main`,{className:`dashboard-container`,children:[(0,c.jsxs)(`div`,{className:`dashboard-header`,children:[(0,c.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`},children:[(0,c.jsx)(`button`,{className:`mobile-menu-btn`,onClick:()=>r(!0),children:`☰`}),(0,c.jsxs)(`h2`,{style:{margin:0,color:`#333`},children:[`Shop: `,g?.name||`Loading...`,` `,(0,c.jsxs)(`small`,{style:{color:`#666`,fontSize:`0.6em`},children:[`@`,g?.owner_nickname||g?.owner_name||``]}),` `,(0,c.jsx)(`small`,{style:{color:`#666`,fontSize:`0.6em`,marginLeft:`5px`},children:g?.is_approved?(0,c.jsx)(`span`,{style:{color:`green`},children:`(Approved)`}):(0,c.jsx)(`span`,{style:{color:`orange`},children:`(Pending)`})})]})]}),(0,c.jsx)(`div`,{className:`active-stats-box`,children:(0,c.jsx)(`div`,{className:`stat-item`,children:(0,c.jsx)(`span`,{style:{color:g?.is_active?`#28a745`:`#dc3545`,fontWeight:`bold`},children:g?.is_active?`🟢 Online (Accepting Orders)`:`🔴 Offline`})})})]}),(0,c.jsx)(`div`,{className:`desktop-tabs`,children:v.map(t=>(0,c.jsxs)(`button`,{onClick:()=>_(t.name),className:`tab-btn ${e===t.name?`active`:``}`,children:[(0,c.jsx)(`span`,{style:{marginRight:`5px`},children:t.icon}),t.name]},t.name))}),(0,c.jsx)(`div`,{className:`mobile-sidebar-overlay ${n?`open`:``}`,onClick:()=>r(!1),children:(0,c.jsxs)(`div`,{className:`mobile-sidebar ${n?`open`:``}`,onClick:e=>e.stopPropagation(),children:[(0,c.jsx)(`h3`,{style:{borderBottom:`2px solid #eee`,paddingBottom:`10px`,marginBottom:`10px`,marginTop:0},children:`Seller Menu`}),v.map(t=>(0,c.jsxs)(`button`,{onClick:()=>_(t.name),className:`sidebar-tab-btn ${e===t.name?`active`:``}`,children:[(0,c.jsx)(`span`,{style:{marginRight:`10px`},children:t.icon}),t.name]},t.name))]})}),(0,c.jsx)(`div`,{className:`dashboard-content`,children:(0,c.jsx)(s.Suspense,{fallback:(0,c.jsx)(`div`,{style:{padding:`2rem`,textAlign:`center`},children:`Loading...`}),children:(()=>{switch(e){case`Overview`:return(0,c.jsx)(l,{});case`Orders`:return(0,c.jsx)(u,{});case`Inventory`:return(0,c.jsx)(d,{});case`Wallet`:return(0,c.jsx)(f,{});case`Offers`:return(0,c.jsx)(p,{});case`Settings`:return(0,c.jsx)(m,{});default:return(0,c.jsx)(l,{})}})()})})]}),(0,c.jsx)(`style`,{children:`
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
      `})]})}export{h as default};