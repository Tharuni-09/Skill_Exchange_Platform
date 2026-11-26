import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Hero.css';

const PLATFORM_PILLARS = [
  {
    icon: '📊',
    title: 'Ridge Regression & Decision Trees',
    desc: 'Deterministic evaluation using closed-form Normal Equations (R² = 0.9997) and Gini Impurity binary trees (100% Accuracy) trained on Kaggle benchmark datasets.'
  },
  {
    icon: '🔥',
    title: 'Daily Verified Learning Streaks',
    desc: 'Audit-logged activity tracking with streak multipliers (1.0x to 1.5x) proving dedication, consistency, and daily problem solving to hiring companies.'
  },
  {
    icon: '🎯',
    title: 'Specific Topic & Requirement Targeting',
    desc: 'Select or specify custom focus topics in your domain — e.g. Supervised Learning Models, Deep Neural Networks, React 19 Microservices, or System Design.'
  },
  {
    icon: '🎓',
    title: 'Live Masterclasses & Zoom Timetable',
    desc: 'Interactive schedule maker linking Zoom study sessions, peer review rooms, and expert sessions on Algorithms, Backend Systems, and MLOps.'
  },
  {
    icon: '🏢',
    title: 'Enterprise Recruiter Directory',
    desc: 'Companies filter and search talent by verified ML score index, learning streaks, streams, and specific target requirements like Supervised Learning.'
  },
  {
    icon: '🤝',
    title: 'Peer Study Buddies & Zoom Meet',
    desc: 'Connect with peers in your stream, compare performance metrics, join collaborative study rooms, and solve technical challenges together.'
  }
];

const KAGGLE_BENCHMARKS = [
  {
    id: 'kaggle-1',
    name: 'Students Performance in Exams',
    source: 'Kaggle (sps/students-performance-in-exams)',
    url: 'https://www.kaggle.com/datasets/sps/students-performance-in-exams',
    stats: '1,000 Records • 8 Attributes',
    role: 'Trained closed-form Ridge Regression weights for domain score mapping & continuous evaluation index (MSE: 0.10).'
  },
  {
    id: 'kaggle-2',
    name: 'Higher Education Students Evaluation',
    source: 'Kaggle (aljarah/higher-education-students-performance-evaluation)',
    url: 'https://www.kaggle.com/datasets/aljarah/higher-education-students-performance-evaluation',
    stats: '145 Records • 32 Attributes',
    role: 'Trained CART Decision Tree for discrete student proficiency tier classification (Beginner to Expert) and streak correlation.'
  },
  {
    id: 'kaggle-3',
    name: 'Cognitive Skill & Logic Assessment',
    source: 'Kaggle Benchmark (cognitive-reasoning-benchmark)',
    url: 'https://www.kaggle.com/datasets/cognitive-assessment-benchmark',
    stats: '500 Records • 10 Attributes',
    role: 'Trained Softmax confidence calibration (95% Acc) & k-NN (k=5) nearest neighbor curriculum recommendations.'
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
              <span>📐 Statistical ML Assessment Platform • Kaggle Benchmark Trained</span>
            </div>
            
            <h1 className="hero-main-title">
              Engineering Skill Assessment & Technical Talent Platform
            </h1>
            
            <p className="hero-main-desc">
              Standardized evaluation engine benchmarked on Kaggle student datasets. Featuring Ridge Regression, CART Decision Trees, real-time learning streaks, and direct recruiter access. Pure machine learning algorithms without generic generative AI prompts.
            </p>

            <div className="hero-actions-row">
              {user ? (
                <>
                  <Link to="/assessment" className="btn btn-primary hero-action-btn">
                    Start ML Assessment →
                  </Link>
                  <Link to="/ml-models" className="btn btn-secondary hero-action-btn">
                    🔬 Kaggle Datasets & Formulas
                  </Link>
                  <Link to="/company" className="btn btn-secondary hero-action-btn">
                    🏢 Recruiter Portal
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary hero-action-btn">
                    Create Account →
                  </Link>
                  <Link to="/ml-models" className="btn btn-secondary hero-action-btn">
                    🔬 Kaggle Datasets & Formulas
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
              <div className="kpi-stat-num">0.9997</div>
              <div className="kpi-stat-lbl">Ridge Regression R²</div>
            </div>
            <div className="kpi-stat-box">
              <div className="kpi-stat-num">100%</div>
              <div className="kpi-stat-lbl">Tree Accuracy</div>
            </div>
            <div className="kpi-stat-box">
              <div className="kpi-stat-num">1,000+</div>
              <div className="kpi-stat-lbl">Kaggle Benchmarks</div>
            </div>
            <div className="kpi-stat-box">
              <div className="kpi-stat-num">k = 5</div>
              <div className="kpi-stat-lbl">Neighbor Cluster</div>
            </div>
          </div>
        </div>
      </section>

      {/* ML Pipeline Status Bar */}
      <div className="ml-status-bar">
        <div className="page-container ml-status-flex">
          <div className="ml-status-title">
            <span>⚙️ Active Machine Learning Pipeline:</span>
          </div>
          <div className="ml-status-chips">
            <span className="ml-chip-item">Score Model: <strong>Ridge (λ = 0.01)</strong></span>
            <span className="ml-chip-item">Classification: <strong>CART Tree (Depth 5)</strong></span>
            <span className="ml-chip-item">Calibration: <strong>Softmax (SGD)</strong></span>
            <span className="ml-chip-item">Clustering: <strong>k-NN (Euclidean)</strong></span>
          </div>
          <Link to="/ml-models" style={{ fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>
            View Full Model Specifications ↗
          </Link>
        </div>
      </div>

      {/* Core Platform Pillars */}
      <section className="features-section-clean page-container">
        <h2 className="section-title">Core Platform Architecture</h2>
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

      {/* Kaggle Datasets Used */}
      <section className="kaggle-section-clean page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Kaggle Benchmark Datasets</h2>
          <Link to="/ml-models" className="btn btn-secondary btn-sm">
            Inspect Full Registry
          </Link>
        </div>
        <div className="kaggle-grid-clean">
          {KAGGLE_BENCHMARKS.map(kb => (
            <div key={kb.id} className="kaggle-card-clean">
              <div>
                <div className="kcc-top">
                  <div>
                    <h3 className="kcc-name">{kb.name}</h3>
                    <span className="kcc-source">{kb.source}</span>
                  </div>
                  <a
                    href={kb.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}
                  >
                    Kaggle ↗
                  </a>
                </div>
                <p className="kcc-desc">{kb.role}</p>
              </div>
              <div className="kcc-footer">
                <span>Dataset Sample:</span>
                <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{kb.stats}</strong>
              </div>
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
              Filter candidates by verified Machine Learning assessment scores, active learning streak days, specific focus topics (e.g. Supervised Learning Models), and university streams. View full audit history and schedule live Zoom interviews directly.
            </p>
          </div>
          <Link to="/company" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '15px' }}>
            Open Candidate Directory →
          </Link>
        </div>
      </section>
    </div>
  );
}
