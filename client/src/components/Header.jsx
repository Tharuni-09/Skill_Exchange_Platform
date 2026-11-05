import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <header className="header">
      <div className="header-inner">
        {/* Logo */}
        <Link to="/" className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">Skill<span className="logo-accent">Swap</span></span>
        </Link>

        {/* Desktop Nav */}
        {user && (
          <nav className="desktop-nav">
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>Dashboard</Link>
            <Link to="/assessment" className={`nav-link ${isActive('/assessment')}`}>Assessment</Link>
            <Link to="/leaderboard" className={`nav-link ${isActive('/leaderboard')}`}>Leaderboard</Link>
            <Link to="/history" className={`nav-link ${isActive('/history')}`}>History</Link>
          </nav>
        )}

        {/* Auth Buttons */}
        <div className="header-actions">
          {user ? (
            <div className="user-menu">
              <button
                className="user-badge"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <div className="avatar">{user.name?.charAt(0)?.toUpperCase()}</div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role">{user.role}</span>
                </div>
                <span className="chevron">{menuOpen ? '▲' : '▼'}</span>
              </button>
              {menuOpen && (
                <div className="dropdown">
                  <div className="dropdown-info">
                    <div className="avatar-lg">{user.name?.charAt(0)?.toUpperCase()}</div>
                    <div>
                      <p className="dropdown-name">{user.name}</p>
                      <p className="dropdown-email">{user.email}</p>
                    </div>
                  </div>
                  <hr className="dropdown-divider" />
                  <Link to="/dashboard" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                    📊 Dashboard
                  </Link>
                  <Link to="/assessment" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                    🧠 Take Assessment
                  </Link>
                  <Link to="/history" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                    📋 History
                  </Link>
                  <hr className="dropdown-divider" />
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm">Log In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
