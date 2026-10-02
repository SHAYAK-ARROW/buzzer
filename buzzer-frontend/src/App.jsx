import { Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getUserRole, isLoggedIn } from './utils/token';
import FloatingCart from './components/FloatingCart';

// ---- Lazy Loading (Code Splitting) ----
// প্রতিটি রোলের কোড আলাদাভাবে লোড হবে
// বায়ার login করলে শুধু buyer কোড, seller হলে শুধু seller কোড

import Suspended from './pages/Suspended';
import Maintenance from './pages/Maintenance';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

// Buyer Pages
const BuyerHome = lazy(() => import('./pages/buyer/Home'));
const ShopList = lazy(() => import('./pages/buyer/ShopList'));
const ProductList = lazy(() => import('./pages/buyer/ProductList'));
const ProductSearch = lazy(() => import('./pages/buyer/ProductSearch'));
const Checkout = lazy(() => import('./pages/buyer/Checkout'));
const MyOrders = lazy(() => import('./pages/buyer/MyOrders'));
const BuyerWallet = lazy(() => import('./pages/buyer/Wallet'));
const BuyerWishlist = lazy(() => import('./pages/buyer/Wishlist'));

// Seller Pages
const SellerDashboard = lazy(() => import('./pages/seller/Dashboard'));

// Delivery Pages
const DeliveryDashboard = lazy(() => import('./pages/delivery/Dashboard'));
const AvailableOrders = lazy(() => import('./pages/delivery/AvailableOrders'));
const DeliveryWallet = lazy(() => import('./pages/delivery/Wallet'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminCatalog = lazy(() => import('./pages/admin/Catalog'));

// Common Pages
const Profile = lazy(() => import('./pages/Profile'));

// ---- React Query Client Setup ----
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 সেকেন্ড পর্যন্ত ক্যাশ ফ্রেশ থাকবে
      gcTime: 5 * 60 * 1000,       // 5 মিনিট পর ক্যাশ মেমরি থেকে সরাবে
      retry: 2,                     // error হলে ২ বার retry করবে
      refetchOnWindowFocus: false,  // ট্যাব সুইচ করলে আবার fetch করবে না
    },
  },
});

// ---- Protected Route Component ----
const ProtectedRoute = ({ children, allowedRoles }) => {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  const role = getUserRole();
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// ---- Role-based Redirect ----
const RoleRedirect = () => {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  const role = getUserRole();
  switch (role) {
    case 'user':     return <Navigate to="/buyer" replace />;
    case 'seller':   return <Navigate to="/seller" replace />;
    case 'delivery': return <Navigate to="/delivery" replace />;
    case 'admin':    return <Navigate to="/admin" replace />;
    default:         return <Navigate to="/login" replace />;
  }
};

// ---- Loading Screen ----
const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <p style={{ fontSize: '1.2rem', color: '#888' }}>Loading...</p>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/suspended" element={<Suspended />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<RoleRedirect />} />

            {/* Buyer Routes */}
            <Route path="/buyer" element={
              <ProtectedRoute allowedRoles={['user']}>
                <BuyerHome />
              </ProtectedRoute>
            } />
            <Route path="/buyer/shops" element={
              <ProtectedRoute allowedRoles={['user']}><ShopList /></ProtectedRoute>
            } />
            <Route path="/buyer/search" element={
              <ProtectedRoute allowedRoles={['user']}><ProductSearch /></ProtectedRoute>
            } />
            <Route path="/buyer/checkout" element={
              <ProtectedRoute allowedRoles={['user']}><Checkout /></ProtectedRoute>
            } />
            <Route path="/buyer/shops/:shopId" element={
              <ProtectedRoute allowedRoles={['user']}><ProductList /></ProtectedRoute>
            } />
            <Route path="/buyer/orders" element={
              <ProtectedRoute allowedRoles={['user']}><MyOrders /></ProtectedRoute>
            } />
            <Route path="/buyer/wallet" element={
              <ProtectedRoute allowedRoles={['user']}><BuyerWallet /></ProtectedRoute>
            } />
            <Route path="/buyer/wishlist" element={
              <ProtectedRoute allowedRoles={['user']}><BuyerWishlist /></ProtectedRoute>
            } />

            {/* Seller Routes */}
            <Route path="/seller" element={
              <ProtectedRoute allowedRoles={['seller']}><SellerDashboard /></ProtectedRoute>
            } />

            {/* Delivery Routes */}
            <Route path="/delivery" element={
              <ProtectedRoute allowedRoles={['delivery']}><DeliveryDashboard /></ProtectedRoute>
            } />
            <Route path="/delivery/available" element={
              <ProtectedRoute allowedRoles={['delivery']}><AvailableOrders /></ProtectedRoute>
            } />
            <Route path="/delivery/wallet" element={
              <ProtectedRoute allowedRoles={['delivery']}><DeliveryWallet /></ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>
            } />
            <Route path="/admin/orders" element={
              <ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>
            } />
            <Route path="/admin/catalog" element={
              <ProtectedRoute allowedRoles={['admin']}><AdminCatalog /></ProtectedRoute>
            } />
            
            {/* Common Authenticated Routes */}
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['user', 'seller', 'delivery', 'admin']}><Profile /></ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
