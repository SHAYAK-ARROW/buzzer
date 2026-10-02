const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/leaflet-src-D6yJ2DYL.js","assets/rolldown-runtime-hePW80VL.js","assets/leaflet-vh-t_kPv.css","assets/UsersTab-DD-HESGk.js","assets/token-CJiBv84G.js","assets/jsx-runtime-NZYk81nU.js","assets/preload-helper-BZ1Pz5am.js","assets/useQuery-DzON1sq6.js","assets/index-DCkO_s1D.js","assets/index-CKH9zPHz.css","assets/client-BtS4vlrG.js","assets/sweetalert2.all-Dvy87gJ2.js","assets/useSocket-DQgFkpyh.js","assets/esm-CS_jafMM.js","assets/ShopsTab-ebVVMX9p.js","assets/DisputesTab-Dv4w3QOJ.js","assets/useMutation-cHzz0wMH.js","assets/OrdersTab-6Gyro1tl.js","assets/TransactionsTab-DWjOhlH9.js","assets/AuditLogsTab-PBbpdX1x.js","assets/ComplaintsTab-RFyu6-vF.js","assets/ItemsTab-BoLLYxsu.js","assets/PayoutsTab-lYPWF1CI.js","assets/RecycleBinTab-DKmg-MMH.js","assets/PicManagerTab-DQby94Nr.js","assets/DeliverySetupTab--Clv28ey.js","assets/OffersTab-CxJu49qe.js","assets/PlatformControlsTab-4AjYKWfz.js","assets/BroadcastTab-CHn-xoqb.js","assets/LiveMapTab-DNgxcX-Z.js"])))=>i.map(i=>d[i]);
import{r as e}from"./rolldown-runtime-hePW80VL.js";import{L as t}from"./token-CJiBv84G.js";import{t as n}from"./preload-helper-BZ1Pz5am.js";import{t as r}from"./jsx-runtime-NZYk81nU.js";import{t as i}from"./useQuery-DzON1sq6.js";import{t as a}from"./client-BtS4vlrG.js";import{t as o}from"./Navbar-BkFDzsh7.js";import{a as s,c,f as l,i as u,l as d,m as f,n as p,o as m,p as h,r as g,s as _,t as v,u as y}from"./dist-Cwe12wSc.js";var b=e(t(),1),x=r();_.register(m,d,y,c,s,u,h,f,l);function S({heatmap:t}){let r=b.useRef(null),i=b.useRef(null);return(0,b.useEffect)(()=>{if(r.current)return i.current&&=(i.current.remove(),null),n(()=>import(`./leaflet-src-D6yJ2DYL.js`).then(t=>e(t.default,1)).then(e=>{n(()=>Promise.resolve({}),__vite__mapDeps([2]));let a=e.default.map(r.current).setView([23.8103,90.4125],11);i.current=a,e.default.tileLayer(`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`,{attribution:`© OpenStreetMap contributors`}).addTo(a);let o=[];t&&((t.shops||[]).forEach(t=>{if(t.lat&&t.lng){let n=e.default.divIcon({className:``,html:`<span style="font-size:1.3rem;text-shadow:1px 1px 2px #fff">🏪</span>`});e.default.marker([t.lat,t.lng],{icon:n}).addTo(a).bindPopup(`<b>Shop:</b> ${t.name}`),o.push([t.lat,t.lng])}}),(t.active_delivery||[]).forEach(t=>{if(t.lat&&t.lng){let n=e.default.divIcon({className:``,html:`<span style="font-size:1.2rem">🟢🚲</span>`});e.default.marker([t.lat,t.lng],{icon:n}).addTo(a).bindPopup(`<b>Active Delivery:</b> ${t.name}`),o.push([t.lat,t.lng])}}),(t.inactive_delivery||[]).forEach(t=>{if(t.lat&&t.lng){let n=t.last_active?new Date(t.last_active).toLocaleString():`Unknown`,r=e.default.divIcon({className:``,html:`<span style="font-size:1rem;opacity:0.6">🔴🚲</span>`});e.default.marker([t.lat,t.lng],{icon:r}).addTo(a).bindPopup(`<b>Offline Delivery:</b> ${t.name}<br><small>Last seen: ${n}</small>`),o.push([t.lat,t.lng])}}),(t.buyers||[]).forEach(t=>{t.lat&&t.lng&&(e.default.circle([t.lat,t.lng],{color:`#3388ff`,fillColor:`#3388ff`,fillOpacity:.2,radius:1200,weight:1}).addTo(a),o.push([t.lat,t.lng]))}),o.length>0&&a.fitBounds(o,{padding:[30,30]}))}),__vite__mapDeps([0,1])),()=>{i.current&&=(i.current.remove(),null)}},[t]),(0,x.jsxs)(`div`,{style:{background:`#fff`,padding:`20px`,borderRadius:`12px`,boxShadow:`0 2px 10px rgba(0,0,0,0.08)`,position:`relative`},children:[(0,x.jsx)(`h4`,{style:{margin:`0 0 15px 0`},children:`🗺️ Selected Range Heatmap`}),(0,x.jsxs)(`div`,{style:{position:`absolute`,top:`20px`,right:`20px`,background:`#ffeb3b`,padding:`5px 15px`,borderRadius:`20px`,fontWeight:`bold`,boxShadow:`0 2px 5px rgba(0,0,0,0.2)`,zIndex:1e3},children:[`Orders in this range: `,t?.total_range_orders||0]}),(0,x.jsxs)(`div`,{style:{display:`flex`,gap:`15px`,marginBottom:`10px`,fontSize:`0.85rem`,flexWrap:`wrap`},children:[(0,x.jsx)(`span`,{children:`🏪 Shops`}),(0,x.jsx)(`span`,{children:`🟢🚲 Active Delivery`}),(0,x.jsx)(`span`,{children:`🔴🚲 Offline Delivery`}),(0,x.jsx)(`span`,{style:{color:`#3388ff`},children:`● Buyer Areas`})]}),(0,x.jsx)(`div`,{ref:r,style:{width:`100%`,height:`450px`,borderRadius:`8px`,zIndex:1}})]})}function C(){let[e,t]=(0,b.useState)(``),[n,r]=(0,b.useState)(``),[o,s]=(0,b.useState)(`overview`),{data:c,isLoading:l,refetch:u}=i({queryKey:[`adminAnalytics`,e,n],queryFn:()=>{let t=`/admin/analytics`;return e&&n&&(t+=`?start_date=${e}&end_date=${n}`),a.get(t)},staleTime:3e5});(0,b.useEffect)(()=>{c?.range&&!e&&!n&&(t(c.range.start),r(c.range.end))},[c]);let d=()=>u();if(l)return(0,x.jsxs)(`div`,{children:[(0,x.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:`20px`},children:[(0,x.jsx)(`h3`,{style:{margin:0},children:`📊 Analytics Dashboard`}),(0,x.jsx)(`div`,{style:{background:`#f0f0f0`,borderRadius:`20px`,padding:`5px 20px`,height:`32px`,width:`300px`}})]}),(0,x.jsx)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(auto-fit, minmax(250px, 1fr))`,gap:`15px`,marginBottom:`25px`},children:[1,2,3].map(e=>(0,x.jsx)(`div`,{style:{background:`#e9ecef`,borderRadius:`12px`,height:`100px`,animation:`pulse 1.5s ease-in-out infinite`}},e))}),(0,x.jsx)(`div`,{style:{background:`#e9ecef`,borderRadius:`12px`,height:`350px`,animation:`pulse 1.5s ease-in-out infinite`}}),(0,x.jsx)(`style`,{children:`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`})]});if(!c)return null;let{summary:f,delivery_stats:m,revenue_by_day:h,orders_by_status:_,shop_analytics:y,delivery_analytics:C,buyer_analytics:w}=c,T={labels:h?.map(e=>e.date)||[],datasets:[{label:`Revenue (₹)`,data:h?.map(e=>e.revenue)||[],borderColor:`#667eea`,backgroundColor:`rgba(102, 126, 234, 0.2)`,tension:.3,fill:!0}]},E={delivered:`#28a745`,pending:`#ffc107`,accepted:`#17a2b8`,picked_up:`#6f42c1`,cancelled:`#dc3545`,on_the_way:`#fd7e14`},D={labels:(_||[]).map(e=>e.status.replace(/_/g,` `).toUpperCase()),datasets:[{data:(_||[]).map(e=>e.count),backgroundColor:(_||[]).map(e=>E[e.status]||`#6c757d`),borderWidth:2}]},O={labels:w?.peak_hours?.map(e=>e.hour+`:00`)||[],datasets:[{label:`Orders`,data:w?.peak_hours?.map(e=>e.count)||[],backgroundColor:`#17a2b8`}]},k={responsive:!0,maintainAspectRatio:!1};return(0,x.jsxs)(`div`,{children:[(0,x.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,flexWrap:`wrap`,gap:`10px`,marginBottom:`20px`},children:[(0,x.jsxs)(`h3`,{style:{margin:0},children:[(0,x.jsx)(`i`,{className:`fas fa-chart-bar`,style:{color:`#28a745`}}),` Analytics Dashboard`]}),(0,x.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`10px`,background:`#f8f9fa`,padding:`5px 15px`,borderRadius:`20px`,border:`1px solid #ddd`},children:[(0,x.jsx)(`label`,{style:{fontWeight:`bold`,fontSize:`0.9rem`,margin:0},children:`Range:`}),(0,x.jsx)(`input`,{type:`date`,value:e,onChange:e=>t(e.target.value),style:{padding:`4px`,border:`1px solid #ccc`,borderRadius:`4px`,fontSize:`0.85rem`}}),(0,x.jsx)(`span`,{style:{fontSize:`0.9rem`},children:`to`}),(0,x.jsx)(`input`,{type:`date`,value:n,onChange:e=>r(e.target.value),style:{padding:`4px`,border:`1px solid #ccc`,borderRadius:`4px`,fontSize:`0.85rem`}}),(0,x.jsx)(`button`,{onClick:d,style:{background:`#0d6efd`,color:`#fff`,padding:`4px 12px`,fontSize:`0.85rem`,border:`none`,borderRadius:`4px`,cursor:`pointer`},children:`Apply`})]})]}),(0,x.jsxs)(`div`,{style:{display:`flex`,gap:`10px`,marginBottom:`20px`,borderBottom:`1px solid #ddd`,paddingBottom:`10px`,overflowX:`auto`},children:[(0,x.jsx)(`button`,{style:{padding:`8px 16px`,border:`none`,borderRadius:`4px`,cursor:`pointer`,fontWeight:`bold`,color:`#fff`,background:o===`overview`?`#0d6efd`:`#6c757d`},onClick:()=>s(`overview`),children:`Overview`}),(0,x.jsx)(`button`,{style:{padding:`8px 16px`,border:`none`,borderRadius:`4px`,cursor:`pointer`,fontWeight:`bold`,color:`#fff`,background:o===`shops`?`#0d6efd`:`#6c757d`},onClick:()=>s(`shops`),children:`Sellers`}),(0,x.jsx)(`button`,{style:{padding:`8px 16px`,border:`none`,borderRadius:`4px`,cursor:`pointer`,fontWeight:`bold`,color:`#fff`,background:o===`delivery`?`#0d6efd`:`#6c757d`},onClick:()=>s(`delivery`),children:`Delivery Boys`}),(0,x.jsx)(`button`,{style:{padding:`8px 16px`,border:`none`,borderRadius:`4px`,cursor:`pointer`,fontWeight:`bold`,color:`#fff`,background:o===`buyers`?`#0d6efd`:`#6c757d`},onClick:()=>s(`buyers`),children:`Buyers`}),(0,x.jsx)(`button`,{style:{padding:`8px 16px`,border:`none`,borderRadius:`4px`,cursor:`pointer`,fontWeight:`bold`,color:`#fff`,background:o===`heatmap`?`#0d6efd`:`#6c757d`},onClick:()=>s(`heatmap`),children:`Heatmap`})]}),o===`overview`&&(0,x.jsxs)(x.Fragment,{children:[(0,x.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(auto-fit, minmax(250px, 1fr))`,gap:`15px`,marginBottom:`25px`},children:[(0,x.jsxs)(`div`,{style:{background:`linear-gradient(135deg, #667eea, #764ba2)`,color:`#fff`,padding:`20px`,borderRadius:`12px`,boxShadow:`0 4px 15px rgba(102,126,234,0.4)`},children:[(0,x.jsx)(`div`,{style:{fontSize:`0.85rem`,opacity:.85},children:`Total Gross Sales (GMV)`}),(0,x.jsxs)(`div`,{style:{fontSize:`2rem`,fontWeight:700,marginTop:`5px`},children:[`₹`,f?.total_revenue?.toLocaleString()||0]}),(0,x.jsx)(`div`,{style:{fontSize:`0.75rem`,opacity:.9,marginTop:`4px`},children:`Total value of goods sold on platform`})]}),(0,x.jsxs)(`div`,{style:{background:`linear-gradient(135deg, #fa709a, #fee140)`,color:`#fff`,padding:`20px`,borderRadius:`12px`,boxShadow:`0 4px 15px rgba(250,112,154,0.4)`},children:[(0,x.jsx)(`div`,{style:{fontSize:`0.85rem`,opacity:.85},children:`Platform Net Earnings`}),(0,x.jsxs)(`div`,{style:{fontSize:`2rem`,fontWeight:700,marginTop:`5px`},children:[`₹`,f?.platform_commission?.toLocaleString()||0]}),(0,x.jsx)(`div`,{style:{fontSize:`0.75rem`,opacity:.9,marginTop:`4px`},children:`Your actual profit (Commission)`})]}),(0,x.jsxs)(`div`,{style:{background:`linear-gradient(135deg, #f093fb, #f5576c)`,color:`#fff`,padding:`20px`,borderRadius:`12px`,boxShadow:`0 4px 15px rgba(245,87,108,0.4)`},children:[(0,x.jsx)(`div`,{style:{fontSize:`0.85rem`,opacity:.85},children:`Cash With Riders (COD)`}),(0,x.jsxs)(`div`,{style:{fontSize:`2rem`,fontWeight:700,marginTop:`5px`},children:[`₹`,m?.total_cod_collected?.toLocaleString()||0]}),(0,x.jsx)(`div`,{style:{fontSize:`0.75rem`,opacity:.9,marginTop:`4px`},children:`Cash collected by delivery boys`})]})]}),(0,x.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(auto-fit, minmax(300px, 1fr))`,gap:`20px`,marginBottom:`25px`},children:[(0,x.jsxs)(`div`,{style:{background:`#fff`,padding:`20px`,borderRadius:`12px`,boxShadow:`0 2px 10px rgba(0,0,0,0.08)`},children:[(0,x.jsx)(`h4`,{style:{margin:`0 0 15px 0`,color:`#333`},children:`Gross Sales by Day`}),(0,x.jsx)(`div`,{style:{height:`300px`},children:(0,x.jsx)(p,{data:T,options:k})})]}),(0,x.jsxs)(`div`,{style:{background:`#fff`,padding:`20px`,borderRadius:`12px`,boxShadow:`0 2px 10px rgba(0,0,0,0.08)`},children:[(0,x.jsx)(`h4`,{style:{margin:`0 0 15px 0`,color:`#333`},children:`Orders by Status`}),(0,x.jsx)(`div`,{style:{height:`300px`},children:(0,x.jsx)(g,{data:D,options:k})})]})]})]}),o===`shops`&&(0,x.jsxs)(`div`,{style:{background:`#fff`,padding:`20px`,borderRadius:`12px`,boxShadow:`0 2px 10px rgba(0,0,0,0.08)`,overflowX:`auto`},children:[(0,x.jsx)(`h4`,{style:{margin:`0 0 15px 0`},children:`Seller Performance & Response`}),(0,x.jsxs)(`table`,{style:{width:`100%`,borderCollapse:`collapse`,fontSize:`0.9rem`},children:[(0,x.jsx)(`thead`,{children:(0,x.jsxs)(`tr`,{style:{borderBottom:`2px solid #eee`,textAlign:`left`},children:[(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Shop Name`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Total Orders`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Delivered`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Success Rate`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Response Rate`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Status`})]})}),(0,x.jsx)(`tbody`,{children:y?.length>0?y.map(e=>(0,x.jsxs)(`tr`,{style:{borderBottom:`1px solid #f9f9f9`},children:[(0,x.jsx)(`td`,{style:{padding:`10px`,fontWeight:600},children:e.name}),(0,x.jsx)(`td`,{style:{padding:`10px`},children:e.total_orders}),(0,x.jsx)(`td`,{style:{padding:`10px`},children:e.delivered}),(0,x.jsxs)(`td`,{style:{padding:`10px`,fontWeight:`bold`,color:e.success_rate>80?`#28a745`:e.success_rate>50?`#ffc107`:`#dc3545`},children:[e.success_rate,`%`]}),(0,x.jsxs)(`td`,{style:{padding:`10px`,fontWeight:`bold`,color:e.response_rate>80?`#28a745`:e.response_rate>50?`#ffc107`:`#dc3545`},children:[e.response_rate,`%`]}),(0,x.jsx)(`td`,{style:{padding:`10px`},children:(0,x.jsx)(`span`,{style:{display:`inline-block`,padding:`3px 10px`,borderRadius:`12px`,fontSize:`0.8rem`,background:e.is_active?`#d4edda`:`#f8d7da`,color:e.is_active?`#155724`:`#721c24`},children:e.is_active?`Online`:`Offline`})})]},e.id)):(0,x.jsx)(`tr`,{children:(0,x.jsx)(`td`,{colSpan:`6`,style:{padding:`10px`,textAlign:`center`},children:`No data available`})})})]})]}),o===`delivery`&&(0,x.jsxs)(`div`,{style:{background:`#fff`,padding:`20px`,borderRadius:`12px`,boxShadow:`0 2px 10px rgba(0,0,0,0.08)`,overflowX:`auto`},children:[(0,x.jsx)(`h4`,{style:{margin:`0 0 15px 0`},children:`Delivery Boy Activity & Trust`}),(0,x.jsxs)(`table`,{style:{width:`100%`,borderCollapse:`collapse`,fontSize:`0.9rem`},children:[(0,x.jsx)(`thead`,{children:(0,x.jsxs)(`tr`,{style:{borderBottom:`2px solid #eee`,textAlign:`left`},children:[(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Delivery Boy`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Total Delivered`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Trusted By`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Location`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Status`})]})}),(0,x.jsx)(`tbody`,{children:C?.length>0?C.map(e=>(0,x.jsxs)(`tr`,{style:{borderBottom:`1px solid #f9f9f9`},children:[(0,x.jsx)(`td`,{style:{padding:`10px`,fontWeight:600},children:e.name}),(0,x.jsx)(`td`,{style:{padding:`10px`},children:e.total_delivered}),(0,x.jsx)(`td`,{style:{padding:`10px`},children:(0,x.jsxs)(`span`,{style:{background:`#e0f3ff`,color:`#007bff`,padding:`3px 10px`,borderRadius:`12px`,fontSize:`0.8rem`,fontWeight:600},children:[e.trusted_by_shops,` Shops`]})}),(0,x.jsx)(`td`,{style:{padding:`10px`},children:e.lat?(0,x.jsx)(`span`,{style:{color:`#28a745`},children:`Active`}):(0,x.jsx)(`span`,{style:{color:`#dc3545`},children:`Inactive`})}),(0,x.jsx)(`td`,{style:{padding:`10px`},children:(0,x.jsx)(`span`,{style:{display:`inline-block`,padding:`3px 10px`,borderRadius:`12px`,fontSize:`0.8rem`,background:e.is_active?`#d4edda`:`#f8d7da`,color:e.is_active?`#155724`:`#721c24`},children:e.is_active?`Online`:`Offline`})})]},e.id||e.name)):(0,x.jsx)(`tr`,{children:(0,x.jsx)(`td`,{colSpan:`5`,style:{padding:`10px`,textAlign:`center`},children:`No data available`})})})]})]}),o===`buyers`&&(0,x.jsxs)(x.Fragment,{children:[(0,x.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`repeat(auto-fit, minmax(250px, 1fr))`,gap:`20px`,marginBottom:`25px`},children:[(0,x.jsxs)(`div`,{style:{background:`#fff`,padding:`20px`,borderRadius:`12px`,boxShadow:`0 2px 10px rgba(0,0,0,0.08)`},children:[(0,x.jsx)(`h4`,{style:{margin:`0 0 15px 0`},children:`Total Active Buyers`}),(0,x.jsx)(`div`,{style:{fontSize:`3rem`,fontWeight:700,color:`#0d6efd`},children:f?.active_buyers||0}),(0,x.jsx)(`p`,{style:{color:`#666`,fontSize:`0.9rem`},children:`Registered & active customers.`})]}),(0,x.jsxs)(`div`,{style:{background:`#fff`,padding:`20px`,borderRadius:`12px`,boxShadow:`0 2px 10px rgba(0,0,0,0.08)`},children:[(0,x.jsx)(`h4`,{style:{margin:`0 0 15px 0`,color:`#333`},children:`Peak Ordering Hours`}),(0,x.jsx)(`div`,{style:{height:`200px`},children:(0,x.jsx)(v,{data:O,options:k})})]})]}),(0,x.jsxs)(`div`,{style:{background:`#fff`,padding:`20px`,borderRadius:`12px`,boxShadow:`0 2px 10px rgba(0,0,0,0.08)`,overflowX:`auto`},children:[(0,x.jsx)(`h4`,{style:{margin:`0 0 15px 0`},children:`Top Buyers (by Order Count)`}),(0,x.jsxs)(`table`,{style:{width:`100%`,borderCollapse:`collapse`,fontSize:`0.9rem`},children:[(0,x.jsx)(`thead`,{children:(0,x.jsxs)(`tr`,{style:{borderBottom:`2px solid #eee`,textAlign:`left`},children:[(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Name`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Total Orders`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Total Spent`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Delivery Charge Paid`}),(0,x.jsx)(`th`,{style:{padding:`10px`},children:`Favorite Shop`})]})}),(0,x.jsx)(`tbody`,{children:w?.top_buyers?.length>0?w.top_buyers.map(e=>(0,x.jsxs)(`tr`,{style:{borderBottom:`1px solid #f9f9f9`},children:[(0,x.jsx)(`td`,{style:{padding:`10px`,fontWeight:600},children:e.name}),(0,x.jsx)(`td`,{style:{padding:`10px`},children:e.total_orders}),(0,x.jsxs)(`td`,{style:{padding:`10px`,color:`#28a745`,fontWeight:`bold`},children:[`₹`,e.total_spent.toFixed(2)]}),(0,x.jsxs)(`td`,{style:{padding:`10px`,color:`#dc3545`},children:[`₹`,e.total_delivery.toFixed(2)]}),(0,x.jsx)(`td`,{style:{padding:`10px`},children:(0,x.jsx)(`span`,{style:{background:`#e9ecef`,padding:`3px 10px`,borderRadius:`12px`},children:e.favorite_shop})})]},e.id||e.name)):(0,x.jsx)(`tr`,{children:(0,x.jsx)(`td`,{colSpan:`5`,style:{padding:`10px`,textAlign:`center`},children:`No buyer data available`})})})]})]})]}),o===`heatmap`&&(0,x.jsx)(S,{heatmap:c.heatmap})]})}var w=b.lazy(()=>n(()=>import(`./UsersTab-DD-HESGk.js`),__vite__mapDeps([3,1,4,5,6,7,8,9,10,11,12,13]))),T=b.lazy(()=>n(()=>import(`./ShopsTab-ebVVMX9p.js`),__vite__mapDeps([14,1,4,5,7,8,6,9,10,11,12,13]))),E=b.lazy(()=>n(()=>import(`./DisputesTab-Dv4w3QOJ.js`),__vite__mapDeps([15,1,4,5,7,8,6,9,16,10,11]))),D=b.lazy(()=>n(()=>import(`./OrdersTab-6Gyro1tl.js`),__vite__mapDeps([17,1,4,5,7,8,6,9,16,10,11]))),O=b.lazy(()=>n(()=>import(`./TransactionsTab-DWjOhlH9.js`),__vite__mapDeps([18,1,4,5,7,8,6,9,10]))),k=b.lazy(()=>n(()=>import(`./AuditLogsTab-PBbpdX1x.js`),__vite__mapDeps([19,1,4,5,7,8,6,9,10]))),A=b.lazy(()=>n(()=>import(`./ComplaintsTab-RFyu6-vF.js`),__vite__mapDeps([20,1,4,5,7,8,6,9,16,10,11]))),j=b.lazy(()=>n(()=>import(`./ItemsTab-BoLLYxsu.js`),__vite__mapDeps([21,1,4,5,7,8,6,9,16,10,11]))),M=b.lazy(()=>n(()=>import(`./PayoutsTab-lYPWF1CI.js`),__vite__mapDeps([22,1,4,5,7,8,6,9,16,10,11]))),N=b.lazy(()=>n(()=>import(`./RecycleBinTab-DKmg-MMH.js`),__vite__mapDeps([23,1,4,5,7,8,6,9,16,10,11]))),P=b.lazy(()=>n(()=>import(`./PicManagerTab-DQby94Nr.js`),__vite__mapDeps([24,1,4,5,7,8,6,9,16,10,11]))),F=b.lazy(()=>n(()=>import(`./DeliverySetupTab--Clv28ey.js`),__vite__mapDeps([25,1,4,5,7,8,6,9,16,10,11]))),I=b.lazy(()=>n(()=>import(`./OffersTab-CxJu49qe.js`),__vite__mapDeps([26,1,4,5,7,8,6,9,10]))),L=b.lazy(()=>n(()=>import(`./PlatformControlsTab-4AjYKWfz.js`),__vite__mapDeps([27,1,4,5,7,8,6,9,16,10,11]))),R=b.lazy(()=>n(()=>import(`./BroadcastTab-CHn-xoqb.js`),__vite__mapDeps([28,1,4,5,16,8,6,9,10,11]))),z=b.lazy(()=>n(()=>import(`./LiveMapTab-DNgxcX-Z.js`),__vite__mapDeps([29,1,4,5,7,8,6,9,10])));function B(){let{data:e}=i({queryKey:[`adminActiveStats`],queryFn:()=>a.get(`/admin/active-stats`),refetchInterval:6e4});return e?(0,x.jsxs)(`div`,{className:`active-stats-box`,children:[(0,x.jsxs)(`div`,{className:`stat-item`,children:[(0,x.jsx)(`span`,{style:{color:`#09829a`},children:`🚲 Active Delivery:`}),` `,e.delivery]}),(0,x.jsxs)(`div`,{className:`stat-item`,children:[(0,x.jsx)(`span`,{style:{color:`#198754`},children:`🏪 Active Shops:`}),` `,e.shops]}),(0,x.jsxs)(`div`,{className:`stat-item`,children:[(0,x.jsx)(`span`,{style:{color:`#6f42c1`},children:`👥 Active Buyers:`}),` `,e.buyers]}),(0,x.jsxs)(`div`,{className:`stat-item`,children:[(0,x.jsx)(`span`,{style:{color:`#dc3545`},children:`👤 Active Admins:`}),` `,e.admins]})]}):null}function V(){let[e,t]=(0,b.useState)(()=>localStorage.getItem(`adminActiveTab`)||`Users`),[n,r]=(0,b.useState)(()=>localStorage.getItem(`adminActiveSubTab`)||`All`);(0,b.useEffect)(()=>{localStorage.setItem(`adminActiveTab`,e)},[e]),(0,b.useEffect)(()=>{localStorage.setItem(`adminActiveSubTab`,n)},[n]);let[i,a]=(0,b.useState)(!1),s=n=>{n!==e&&(t(n),r(n===`Users`?`All`:``))},c=e=>{r(e),a(!1)},l={Users:[`All`,`User`,`Seller`,`Delivery Boy`,`Admin`,`Deleted`]},u=[{name:`Users`,icon:`👥`},{name:`Shops`,icon:`🏪`},{name:`Disputes`,icon:`⚠️`},{name:`Orders`,icon:`📦`},{name:`Transactions`,icon:`💳`},{name:`Audit Logs`,icon:`📜`},{name:`Complaints`,icon:`🚨`},{name:`Items`,icon:`🍔`},{name:`Payouts`,icon:`💸`},{name:`Recycle Bin`,icon:`🗑️`},{name:`Pic Manager`,icon:`🖼️`},{name:`Delivery Setup`,icon:`🚚`},{name:`Offers`,icon:`🎁`},{name:`Live Map`,icon:`dY"?`},{name:`Analytics`,icon:`📊`},{name:`Platform Controls`,icon:`⚙️`},{name:`Broadcast`,icon:`📢`}];return(0,x.jsxs)(`div`,{style:{background:`#f0f4f8`,minHeight:`100vh`,display:`flex`,flexDirection:`column`},children:[(0,x.jsx)(`style`,{children:`
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
      `}),(0,x.jsx)(o,{}),(0,x.jsxs)(`main`,{className:`dashboard-container`,children:[(0,x.jsxs)(`div`,{className:`dashboard-header`,children:[(0,x.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`},children:[(0,x.jsx)(`button`,{className:`mobile-menu-btn`,onClick:()=>a(!0),children:`☰`}),(0,x.jsx)(`h2`,{style:{margin:0,color:`#333`},children:`Admin Dashboard`})]}),(0,x.jsx)(B,{})]}),(0,x.jsx)(`div`,{className:`desktop-tabs`,children:u.map(n=>(0,x.jsxs)(`button`,{onClick:()=>{t(n.name),n.name===`Users`&&r(`All`)},className:`tab-btn ${e===n.name?`active`:``}`,children:[(0,x.jsx)(`span`,{style:{marginRight:`5px`},children:n.icon}),n.name]},n.name))}),(0,x.jsx)(`div`,{className:`mobile-sidebar-overlay ${i?`open`:``}`,onClick:()=>a(!1),children:(0,x.jsxs)(`div`,{className:`mobile-sidebar ${i?`open`:``}`,onClick:e=>e.stopPropagation(),children:[(0,x.jsx)(`h3`,{style:{borderBottom:`2px solid #eee`,paddingBottom:`10px`,marginBottom:`10px`,marginTop:0},children:`Menu`}),u.map(t=>(0,x.jsxs)(`div`,{children:[(0,x.jsxs)(`button`,{onClick:()=>s(t.name),className:`sidebar-tab-btn ${e===t.name?`active`:``}`,children:[(0,x.jsx)(`span`,{style:{marginRight:`10px`},children:t.icon}),t.name]}),e===t.name&&l[t.name]&&(0,x.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,background:`#fafafa`},children:l[t.name].map(e=>(0,x.jsxs)(`button`,{onClick:()=>c(e),className:`sidebar-subtab-btn ${n===e?`active`:``}`,children:[`↳ `,e]},e))})]},t.name))]})}),(0,x.jsx)(`div`,{style:{background:`#fff`,padding:`20px`,borderRadius:`12px`,boxShadow:`0 4px 12px rgba(0,0,0,0.05)`,minHeight:`500px`,flex:1},children:(0,x.jsx)(b.Suspense,{fallback:(0,x.jsx)(`div`,{style:{textAlign:`center`,padding:`40px`,color:`#666`},children:`⏳ Loading...`}),children:(()=>{switch(e){case`Users`:return(0,x.jsx)(w,{activeSubTab:n,setActiveSubTab:r});case`Shops`:return(0,x.jsx)(T,{});case`Disputes`:return(0,x.jsx)(E,{});case`Orders`:return(0,x.jsx)(D,{});case`Transactions`:return(0,x.jsx)(O,{});case`Audit Logs`:return(0,x.jsx)(k,{});case`Complaints`:return(0,x.jsx)(A,{});case`Items`:return(0,x.jsx)(j,{});case`Payouts`:return(0,x.jsx)(M,{});case`Recycle Bin`:return(0,x.jsx)(N,{});case`Pic Manager`:return(0,x.jsx)(P,{});case`Delivery Setup`:return(0,x.jsx)(F,{});case`Offers`:return(0,x.jsx)(I,{});case`Live Map`:return(0,x.jsx)(z,{});case`Analytics`:return(0,x.jsx)(C,{});case`Platform Controls`:return(0,x.jsx)(L,{});case`Broadcast`:return(0,x.jsx)(R,{});default:return(0,x.jsx)(w,{activeSubTab:n,setActiveSubTab:r})}})()})})]})]})}export{V as default};