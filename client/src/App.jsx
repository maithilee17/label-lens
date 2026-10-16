import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ScanProduct } from './pages/ScanProduct';
import { VerifyDetails } from './pages/VerifyDetails';
import { MyProducts } from './pages/MyProducts';
import { ProductDetail } from './pages/ProductDetail';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold text-sm">
        Authenticating LabelLens session...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              }
            />

            {/* Protected App Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="scan" element={<ScanProduct />} />
              <Route path="verify/:id" element={<VerifyDetails />} />
              <Route path="products" element={<MyProducts />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
