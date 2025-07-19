import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { Dashboard } from './components/dashboard/Dashboard';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Admin Components
import { ManajemenKaryawan } from './components/admin/ManajemenKaryawan';
import { ProfilKaryawan } from './components/admin/ProfilKaryawan';
import { ReimbursementAdmin } from './components/admin/ReimbursementAdmin';
import { PenilaianAktivitas } from './components/admin/PenilaianAktivitas';
import { EksporData } from './components/admin/EksporData';
import { Pengaturan } from './components/admin/Pengaturan';

// Employee Components
import { TambahAktivitas } from './components/karyawan/TambahAktivitas';
import { HistoriAktivitas } from './components/karyawan/HistoriAktivitas';
import { Reimbursement } from './components/karyawan/Reimbursement';
import { Statistik } from './components/karyawan/Statistik';
import { Kalender } from './components/karyawan/Kalender';
import { ImportAktivitas } from './components/karyawan/ImportAktivitas';

// Test Components
import { TestReimbursement } from './components/test/TestReimbursement';
import { TestSupabaseConnection } from './components/test/TestSupabaseConnection';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return <Layout>{children}</Layout>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? <Navigate to="/dashboard" /> : <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginForm />
              </PublicRoute>
            } 
          />
          
          {/* Dashboard */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Admin Routes */}
          <Route 
            path="/admin/karyawan" 
            element={
              <AdminRoute>
                <ManajemenKaryawan />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/profil-karyawan" 
            element={
              <AdminRoute>
                <ProfilKaryawan />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/reimbursement" 
            element={
              <AdminRoute>
                <ReimbursementAdmin />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/penilaian" 
            element={
              <AdminRoute>
                <PenilaianAktivitas />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/ekspor" 
            element={
              <AdminRoute>
                <EksporData />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/pengaturan" 
            element={
              <AdminRoute>
                <Pengaturan />
              </AdminRoute>
            } 
          />

          {/* Employee Routes */}
          <Route 
            path="/karyawan/tambah" 
            element={
              <ProtectedRoute>
                <TambahAktivitas />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/karyawan/histori" 
            element={
              <ProtectedRoute>
                <HistoriAktivitas />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/karyawan/reimbursement" 
            element={
              <ProtectedRoute>
                <Reimbursement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/karyawan/statistik" 
            element={
              <ProtectedRoute>
                <Statistik />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/karyawan/kalender" 
            element={
              <ProtectedRoute>
                <Kalender />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/karyawan/import" 
            element={
              <ProtectedRoute>
                <ImportAktivitas />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/test-reimbursement" 
            element={
              <ProtectedRoute>
                <TestReimbursement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/test-supabase" 
            element={<TestSupabaseConnection />} 
          />

          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;