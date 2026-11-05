import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Header from './components/Header';

import Hero        from './pages/Hero';
import Login       from './pages/Login';
import Register    from './pages/Register';
import Assessment  from './pages/Assessment';
import Results     from './pages/Results';
import Dashboard   from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import History     from './pages/History';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          {/* Public routes */}
          <Route path="/"           element={<Hero />} />
          <Route path="/login"      element={<Login />} />
          <Route path="/register"   element={<Register />} />
          <Route path="/leaderboard" element={<Leaderboard />} />

          {/* Protected routes */}
          <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/assessment" element={<PrivateRoute><Assessment /></PrivateRoute>} />
          <Route path="/results"    element={<PrivateRoute><Results /></PrivateRoute>} />
          <Route path="/history"    element={<PrivateRoute><History /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
