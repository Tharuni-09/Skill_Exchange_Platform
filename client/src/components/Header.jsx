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

        {/* Navigation */}
        <nav className="desktop-nav">
          {user && (
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>Dashboard</Link>
          )}
          <Link to="/assessment" className={`nav-link ${isActive('/assessment')}`}>
            🧠 Assessment
          </Link>
          <Link to="/classes" className={`nav-link ${isActive('/classes')}`}>
            🎓 Classes
          </Link>
          <Link to="/timetable" className={`nav-link ${isActive('/timetable')}`}>
            📅 Timetable
          </Link>
          <Link to="/friends" className={`nav-link ${isActive('/friends')}`}>
            🤝 Study Buddies
          </Link>
          <Link to="/opportunities" className={`nav-link ${isActive('/opportunities')}`}>
            💼 Opportunities
          </Link>
          <Link to="/candidates" className={`nav-link highlight-nav ${isActive('/candidates')}`}>
            🏢 Candidates
          </Link>
          <Link to="/leaderboard" className={`nav-link ${isActive('/leaderboard')}`}>
            🏆 Leaderboard
          </Link>
        </nav>

        {/* Auth Buttons & Streak */}
        <div className="header-actions">
          {user ? (
            <div className="user-menu-wrapper">
              {/* Streak badge */}
              <div className="header-streak-badge" title={`${user.streak || 1}-day active learning streak!`}>
                <span>🔥</span>
                <span className="streak-count">{user.streak || 1}d</span>
              </div>

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
                        <span className="dropdown-streak">🔥 {user.streak || 1} Day Streak</span>
                      </div>
                    </div>
                    <hr className="dropdown-divider" />
                    <Link to="/dashboard" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      📊 Dashboard
                    </Link>
                    <Link to="/assessment" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      🧠 Take ML Assessment
                    </Link>
                    <Link to="/timetable" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      📅 My Timetable Maker
                    </Link>
                    <Link to="/friends" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      🤝 Study Buddies & Zoom Meet
                    </Link>
                    <Link to="/classes" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      🎓 My Masterclasses
                    </Link>
                    <Link to="/opportunities" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      💼 Job & Internship Board
                    </Link>
                    <Link to="/candidates" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      🏢 Recruiter Candidate View
                    </Link>
                    <Link to="/history" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      📋 Assessment History
                    </Link>
                    <hr className="dropdown-divider" />
                    <button className="dropdown-item danger" onClick={handleLogout}>
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="logged-out-actions">
              <Link to="/login" className="btn btn-secondary btn-sm">Log In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
