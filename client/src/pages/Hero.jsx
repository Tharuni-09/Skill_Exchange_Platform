import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Hero.css';

const FEATURES = [
  { icon: '🧠', title: 'Adaptive ML Assessment', desc: 'Custom machine learning engine assesses 5 core cognitive & technical domains without third-party APIs.' },
  { icon: '🔥', title: 'Daily Learning Streaks', desc: 'Build consistency, earn milestone badges, boost your streak multiplier, and prove your dedication to recruiters.' },
  { icon: '🎓', title: 'Peer & Expert Masterclasses', desc: 'Attend interactive live classes on Algorithms, React, Machine Learning, System Design, and DevOps.' },
  { icon: '💼', title: 'Verified Career Opportunities', desc: 'Apply to top tech internships and full-time roles with your verified ML assessment benchmark score.' },
  { icon: '🏢', title: 'Recruiter Talent Suite', desc: 'Companies can filter candidates by verified ML score, stream, specialization, and learning streaks.' },
  { icon: '📊', title: 'Deep Skill Radar & Analytics', desc: 'Comprehensive domain analytics, skill gap identification, and personalized improvement roadmap.' }
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
            <span>🔥</span> Learn • Assess • Get Hired
          </div>
          <h1 className="hero-title">
            Adaptive Skill Assessment &<br />
            <span className="text-gradient">Career Talent Platform</span>
          </h1>
          <p className="hero-subtitle">
            Assess your capabilities using our custom ML engine, join live masterclasses, keep your learning streak alive, and get discovered by top tech employers.
          </p>
          <div className="hero-cta">
            {user ? (
              <>
                <Link to="/assessment" className="btn btn-primary hero-btn">
                  🧠 Start ML Assessment
                </Link>
                <Link to="/classes" className="btn btn-secondary hero-btn">
                  🎓 Browse Classes
                </Link>
                <Link to="/opportunities" className="btn btn-secondary hero-btn">
                  💼 Opportunities
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary hero-btn">
                  Join Free Today
                </Link>
                <Link to="/candidates" className="btn btn-secondary hero-btn">
                  🏢 For Employers / Companies
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
            <div className="stat-label">ML Assessment Questions</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-gradient">8+</div>
            <div className="stat-label">Live Masterclasses</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-gradient">🔥 30d</div>
            <div className="stat-label">Gamified Streaks</div>
          </div>
          <div className="stat-card">
            <div className="stat-number text-gradient">100%</div>
            <div className="stat-label">Verified Recruiter Access</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="page-container">
          <h2 className="section-title" style={{ textAlign: 'center' }}>Complete Skill Ecosystem</h2>
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

      {/* Recruiter Callout */}
      <section className="recruiter-callout-section">
        <div className="page-container">
          <div className="recruiter-banner card">
            <div className="rb-text">
              <span className="badge badge-warning">🏢 Recruiter Portal</span>
              <h2>Hiring Engineers? Filter Candidates by Verified Streaks & ML Scores</h2>
              <p>Search pre-screened talent across Computer Science, IT, Electronics, and Management. Inspect real domain performances and consistency streaks.</p>
            </div>
            <Link to="/candidates" className="btn btn-primary" style={{ padding: '14px 28px' }}>
              Open Candidate Directory →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      {!user && (
        <section className="cta-banner">
          <div className="page-container cta-content">
            <h2>Ready to discover your verified skill level?</h2>
            <p>Create your free account, take the assessment, and start your learning streak today.</p>
            <Link to="/register" className="btn btn-primary">Create Free Account →</Link>
          </div>
        </section>
      )}
    </div>
  );
}
