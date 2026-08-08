import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import getTheme from './theme/theme';
import Navbar from './components/Navbar';
import { trackSessionEvent } from './services/sessionTracking';
import ProtectedRoute from './routes/ProtectedRoute';
import HomePage from './pages/customer/HomePage';
import ProductsPage from './pages/customer/ProductsPage';
import ProductDetailsPage from './pages/customer/ProductDetailsPage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/admin/DashboardPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import UsersPage from './pages/admin/UsersPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import SessionsPage from './pages/admin/SessionsPage';
import PredictionsPage from './pages/admin/PredictionsPage';
import NotificationsPage from './pages/admin/NotificationsPage';
import AIDatasetDashboardPage from './pages/admin/AIDatasetDashboardPage';
import InterventionDashboardPage from './pages/admin/InterventionDashboardPage';

const AppShell = () => {
  const location = useLocation();
  const [mode, setMode] = useState('light');
  const theme = useMemo(() => getTheme(mode), [mode]);
  const lastPageRef = useRef(location.pathname);
  const pageStartRef = useRef(Date.now());

  useEffect(() => {
    const previousPath = lastPageRef.current;
    const previousStart = pageStartRef.current;

    if (previousPath && previousPath !== location.pathname) {
      const durationMs = Date.now() - previousStart;
      trackSessionEvent({
        eventType: 'page_view',
        page: previousPath,
        title: document.title || previousPath,
        durationMs,
        exitedAt: new Date().toISOString(),
        referrer: document.referrer || '',
      });
    }

    pageStartRef.current = Date.now();
    lastPageRef.current = location.pathname;

    trackSessionEvent({
      eventType: 'page_view',
      page: location.pathname,
      title: document.title || location.pathname,
      enteredAt: new Date().toISOString(),
      referrer: document.referrer || '',
    });
  }, [location.pathname]);

  useEffect(() => {
    const handleClick = (event) => {
      const target = event.target.closest('button, a, input, [role="button"]');
      if (!target) return;

      const label = target.getAttribute('aria-label') || target.textContent?.trim() || target.dataset?.label || 'click';
      const page = location.pathname;

      if (label) {
        trackSessionEvent({
          eventType: 'click',
          element: target.tagName,
          label,
          page,
        });
      }
    };

    const handlePageLeave = () => {
      trackSessionEvent({
        eventType: 'page_view',
        page: location.pathname,
        title: document.title || location.pathname,
        durationMs: Date.now() - pageStartRef.current,
        exitedAt: new Date().toISOString(),
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) handlePageLeave();
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('beforeunload', handlePageLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('beforeunload', handlePageLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [location.pathname]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Navbar mode={mode} setMode={setMode} />

            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailsPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UsersPage /></ProtectedRoute>} />
              <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminProductsPage /></ProtectedRoute>} />
              <Route path="/admin/sessions" element={<ProtectedRoute allowedRoles={['admin']}><SessionsPage /></ProtectedRoute>} />
              <Route path="/admin/predictions" element={<ProtectedRoute allowedRoles={['admin']}><PredictionsPage /></ProtectedRoute>} />
              <Route path="/admin/interventions" element={<ProtectedRoute allowedRoles={['admin']}><InterventionDashboardPage /></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><NotificationsPage /></ProtectedRoute>} />
              <Route path="/admin/ai-datasets" element={<ProtectedRoute allowedRoles={['admin']}><AIDatasetDashboardPage /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
        </ThemeProvider>
  );
};

const App = () => (
  <AuthProvider>
    <CartProvider>
      <AppShell />
    </CartProvider>
  </AuthProvider>
);

export default App;
