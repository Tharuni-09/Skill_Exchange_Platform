import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Hero.css';

const FEATURES = [
  { icon: '🧠', title: 'AI-Powered Assessment', desc: 'Adaptive ML engine selects questions based on your stream and skill level, providing personalized difficulty.' },
  { icon: '📊', title: 'Deep Analytics', desc: 'Radar charts, domain scores, skill gaps, and performance trends give you a complete skill picture.' },
  { icon: '🏆', title: 'Live Leaderboard', desc: 'Compare your scores with peers and track your rank. Compete to become the top performer.' },
  { icon: '📋', title: 'Assessment History', desc: 'Track your improvement over time with complete history of all your assessments and scores.' }
];

const DOMAINS = [
  { name: 'Analytical Reasoning', icon: '🔍', color: '#6366f1' },
  { name: 'Problem Solving',      icon: '⚙️', color: '#10b981' },
  { name: 'Decision Making',      icon: '🎯', color: '#f59e0b' },
  { name: 'Attention & Consistency', icon: '👁️', color: '#ec4899' },
  { name: 'Knowledge Recall',     icon: '📚', color: '#3b82f6' }
];

export default function Hero() {
  const { user } = useAuth();

  return (
    <div className="hero-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg-blur" />
        <div className="hero-content">
          <div className="hero-badge">
            <span>🤖</span> ML-Powered Skill Assessment
          </div>
          <h1 className="hero-title">
            Discover Your True<br />
            <span className="text-gradient">Skill Level</span>
          </h1>
          <p className="hero-subtitle">
            Take an adaptive assessment powered by a custom ML engine.<br />
            Get personalized insights, skill gap analysis, and your predicted career level.
          </p>
          <div className="hero-cta">
            {user ? (
              <Link to="/assessment" className="btn btn-primary hero-btn">
                🧠 Start Assessment
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary hero-btn">
                  Get Started Free
                </Link>
                <Link to="/login" className="btn btn-secondary hero-btn">
                  Log In
                </Link>
              </>
            )}
          </div>

          {/* Domain chips */}
          <div className="domain-chips">
            {DOMAINS.map(d => (
              <div key={d.name} className="domain-chip" style={{ borderColor: d.color + '40' }}>
                <span>{d.icon}</span>
                <span>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section">
        <div className="page-container stats-grid">
          <div className="stat-card">
            <div className="stat-number text-gradient">40+</div>
            <div className="stat-label">Curated Questions</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-gradient">5</div>
            <div className="stat-label">Skill Domains</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-gradient">4</div>
            <div className="stat-label">Proficiency Levels</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-gradient">100%</div>
            <div className="stat-label">Free to Use</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="page-container">
          <h2 className="section-title" style={{ textAlign: 'center' }}>Why SkillSwap?</h2>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card card fade-in">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      {!user && (
        <section className="cta-banner">
          <div className="page-container cta-content">
            <h2>Ready to know your skill level?</h2>
            <p>Create a free account and take your first assessment in under 5 minutes.</p>
            <Link to="/register" className="btn btn-primary">Create Free Account →</Link>
          </div>
        </section>
      )}
    </div>
  );
}
