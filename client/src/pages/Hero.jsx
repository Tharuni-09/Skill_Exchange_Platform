import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Hero.css';

const PLATFORM_PILLARS = [
  {
    icon: '📊',
    title: 'Multi-Domain Skill Assessment',
    desc: 'Adaptive evaluations assessing Analytical Reasoning, Problem Solving, Decision Making, Attention Consistency, and Knowledge Recall.'
  },
  {
    icon: '🔥',
    title: 'Daily Learning Streaks',
    desc: 'Build continuous learning momentum with milestone badges, streak multipliers (1.0x to 1.5x), and verified consistency proof for recruiters.'
  },
  {
    icon: '🎯',
    title: 'Specific Topic & Requirement Targeting',
    desc: 'Specify your exact learning requirements (e.g. Supervised Learning Models, Deep Neural Networks, React 19 Microservices, or System Design).'
  },
  {
    icon: '🎓',
    title: 'Live Masterclasses & Schedule Maker',
    desc: 'Attend interactive live classes and generate personalized weekly study timetables with direct Zoom meeting links.'
  },
  {
    icon: '🏢',
    title: 'Enterprise Recruiter Directory',
    desc: 'Companies filter and search talent by verified score index, learning streaks, streams, and specific target topic focus.'
  },
  {
    icon: '🤝',
    title: 'Peer Study Buddies & Zoom Meet',
    desc: 'Connect with study partners in your stream, compare performance metrics, join collaborative study sessions, and solve challenges together.'
  }
];

const DOMAIN_CHIPS = [
  'Analytical Reasoning',
  'Problem Solving',
  'Decision Making',
  'Attention & Consistency',
  'Knowledge Recall'
];

export default function Hero() {
  const { user } = useAuth();

  return (
    <div className="hero-page">
      {/* Top Main Section */}
      <section className="hero-section page-container">
        <div className="hero-grid-main">
          <div>
            <div className="hero-tagline-badge">
              <span>⚡ Continuous Skill Assessment & Career Talent Exchange</span>
            </div>
            
            <h1 className="hero-main-title">
              Skill Assessment & Technical Career Talent Platform
            </h1>
            
            <p className="hero-main-desc">
              Comprehensive skill evaluation platform for engineering candidates, interactive live masterclasses, personalized study timetables, and verified recruiter talent search.
            </p>

            <div className="hero-actions-row">
              {user ? (
                <>
                  <Link to="/assessment" className="btn btn-primary hero-action-btn">
                    Start Assessment →
                  </Link>
                  <Link to="/classes" className="btn btn-secondary hero-action-btn">
                    🎓 Browse Classes
                  </Link>
                  <Link to="/company" className="btn btn-secondary hero-action-btn">
                    🏢 Recruiter Portal
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary hero-action-btn">
                    Get Started Free →
                  </Link>
                  <Link to="/classes" className="btn btn-secondary hero-action-btn">
                    🎓 Browse Classes
                  </Link>
                  <Link to="/company" className="btn btn-secondary hero-action-btn">
                    🏢 For Employers & Recruiters
                  </Link>
                </>
              )}
            </div>

            <div className="hero-domain-row">
              {DOMAIN_CHIPS.map(chip => (
                <span key={chip} className="hero-domain-pill">
                  • {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Right Technical KPI Panel */}
          <div className="hero-kpi-panel">
            <div className="kpi-stat-box">
              <div className="kpi-stat-num">5</div>
              <div className="kpi-stat-lbl">Cognitive Pillars</div>
            </div>
            <div className="kpi-stat-box">
              <div className="kpi-stat-num">40+</div>
              <div className="kpi-stat-lbl">Question Bank</div>
            </div>
            <div className="kpi-stat-box">
              <div className="kpi-stat-num">🔥 30d</div>
              <div className="kpi-stat-lbl">Streak Tracking</div>
            </div>
            <div className="kpi-stat-box">
              <div className="kpi-stat-num">100%</div>
              <div className="kpi-stat-lbl">Audit Logged</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Platform Pillars */}
      <section className="features-section-clean page-container">
        <h2 className="section-title">Core Platform Capabilities</h2>
        <div className="features-grid-clean">
          {PLATFORM_PILLARS.map(p => (
            <div key={p.title} className="feature-box-clean">
              <div className="fbc-header">
                <span className="fbc-icon">{p.icon}</span>
                <h3 className="fbc-title">{p.title}</h3>
              </div>
              <p className="fbc-desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recruiter Suite Banner */}
      <section className="recruiter-section-clean page-container">
        <div className="recruiter-banner-clean">
          <div className="rbc-content">
            <h2>Enterprise Recruiter & Hiring Suite</h2>
            <p>
              Filter candidates by verified assessment scores, active learning streak days, specific focus topics (e.g. Supervised Learning Models), and university streams. View full audit history and schedule live Zoom interviews directly.
            </p>
          </div>
          <Link to="/company" className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '14px' }}>
            Open Candidate Directory →
          </Link>
        </div>
      </section>
    </div>
  );
}
