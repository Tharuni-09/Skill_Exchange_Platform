import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Hero.css';

const PLATFORM_STEPS = [
  {
    step: '01',
    title: 'Skill Assessment',
    desc: 'Take standardized technical assessments evaluating Analytical Reasoning, Problem Solving, Decision Making, and Knowledge Recall.'
  },
  {
    step: '02',
    title: 'Masterclasses & Scheduling',
    desc: 'Attend expert-led live technical workshops and generate synchronized weekly study timetables with direct session integration.'
  },
  {
    step: '03',
    title: 'Peer Study & Collaboration',
    desc: 'Connect with verified study partners matching your stream and specialization to solve challenges and build collaborative momentum.'
  },
  {
    step: '04',
    title: 'Recruiter Discovery',
    desc: 'Get discovered by enterprise hiring teams filtering by verified assessment indices, active streak consistency, and specific focus areas.'
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
              <span>Enterprise Skill Exchange & Evaluation Platform</span>
            </div>
            
            <h1 className="hero-main-title">
              Skill Evaluation, Peer Learning & Verified Talent Placement
            </h1>
            
            <p className="hero-main-desc">
              A comprehensive technical growth platform combining standardized skill assessments, live interactive masterclasses, automated study timetables, and direct candidate discovery for enterprise recruiters.
            </p>

            <div className="hero-actions-row">
              {user ? (
                <>
                  <Link to="/assessment" className="btn btn-primary hero-action-btn">
                    Start Skill Assessment →
                  </Link>
                  <Link to="/classes" className="btn btn-secondary hero-action-btn">
                    Browse Masterclasses
                  </Link>
                  <Link to="/company" className="btn btn-secondary hero-action-btn">
                    Recruiter Directory
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary hero-action-btn">
                    Get Started Free →
                  </Link>
                  <Link to="/classes" className="btn btn-secondary hero-action-btn">
                    Browse Masterclasses
                  </Link>
                  <Link to="/company" className="btn btn-secondary hero-action-btn">
                    For Employers & Recruiters
                  </Link>
                </>
              )}
            </div>

            <div className="hero-domain-row">
              {DOMAIN_CHIPS.map(chip => (
                <span key={chip} className="hero-domain-pill">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Right Technical KPI Panel */}
          <div className="hero-kpi-panel">
            <div className="kpi-stat-box">
              <div className="kpi-stat-num">5</div>
              <div className="kpi-stat-lbl">Evaluation Pillars</div>
            </div>
            <div className="kpi-stat-box">
              <div className="kpi-stat-num">40+</div>
              <div className="kpi-stat-lbl">Technical Challenges</div>
            </div>
            <div className="kpi-stat-box">
              <div className="kpi-stat-num">30d</div>
              <div className="kpi-stat-lbl">Consistency Streaks</div>
            </div>
            <div className="kpi-stat-box">
              <div className="kpi-stat-num">100%</div>
              <div className="kpi-stat-lbl">Audit Logged</div>
            </div>
          </div>
        </div>
      </section>

      {/* Classic 4-Step Flow */}
      <section className="features-section-clean page-container">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Platform Architecture & Learning Flow</h2>
            <p className="section-subtitle">A structured, four-step methodology to measure, improve, and showcase engineering capabilities.</p>
          </div>
        </div>

        <div className="steps-grid-classic">
          {PLATFORM_STEPS.map(s => (
            <div key={s.step} className="step-card-classic">
              <div className="step-number">{s.step}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
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
              Filter candidates by verified assessment scores, active learning streak days, specific focus topics (such as Supervised Learning Models), and degree streams. Review complete assessment histories and schedule interviews directly.
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
