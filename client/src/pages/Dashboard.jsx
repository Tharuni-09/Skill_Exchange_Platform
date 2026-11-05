import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const DOMAIN_ICONS = {
  analytical_reasoning:  '🔍',
  problem_solving:       '⚙️',
  decision_making:       '🎯',
  attention_consistency: '👁️',
  knowledge_recall:      '📚'
};

export default function Dashboard() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [streakData, setStreakData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/assessments?email=${encodeURIComponent(user.email)}`).then(r => r.json()),
      fetch(`/api/user/streak?email=${encodeURIComponent(user.email)}`).then(r => r.json())
    ])
      .then(([histData, sData]) => {
        setHistory(Array.isArray(histData) ? histData : []);
        setStreakData(sData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user.email]);

  const latest = history[0];
  const bestScore = history.length > 0 ? Math.max(...history.map(h => h.overall_score)) : 0;
  const avgScore  = history.length > 0
    ? Math.round(history.reduce((a, h) => a + h.overall_score, 0) / history.length)
    : 0;

  const currentStreak = streakData?.streak || user?.streak || (history.length > 0 ? Math.max(1, history.length) : 1);

  return (
    <div className="dashboard-page">
      <div className="page-container">
        {/* Welcome */}
        <div className="dashboard-welcome">
          <div>
            <h1 className="dash-title">
              Welcome back, <span className="text-gradient">{user.name}</span> 👋
            </h1>
            <p className="dash-subtitle">
              {user.role} · {user.stream || 'General'} {user.specialization ? `· ${user.specialization}` : ''}
            </p>
          </div>
          <div className="dash-welcome-actions">
            <Link to="/assessment" className="btn btn-primary">
              🧠 Take Assessment
            </Link>
          </div>
        </div>

        {/* Gamified Streak Widget */}
        <div className="streak-hero-card card fade-in">
          <div className="shc-left">
            <div className="streak-flame-wrapper">
              <span className="streak-flame-icon">🔥</span>
            </div>
            <div>
              <div className="shc-header">
                <span className="shc-num">{currentStreak}</span>
                <span className="shc-unit">Day Streak</span>
                <span className="streak-multiplier-badge">{streakData?.streakMultiplier || '1.0x'} Boost</span>
              </div>
              <p className="shc-desc">
                {currentStreak >= 7
                  ? "Unstoppable! You're in the top 5% most consistent candidates on the platform."
                  : currentStreak >= 3
                  ? "Great momentum! Take daily assessments or attend classes to keep your streak alive."
                  : "Complete today's ML assessment or attend a masterclass to build your streak!"}
              </p>
            </div>
          </div>

          {/* 7-day activity map */}
          <div className="shc-week-tracker">
            <span className="swt-title">This Week's Activity</span>
            <div className="swt-dots">
              {(streakData?.weekMap || [
                { day: 'Mon', active: true },
                { day: 'Tue', active: true },
                { day: 'Wed', active: true },
                { day: 'Thu', active: false },
                { day: 'Fri', active: false },
                { day: 'Sat', active: false },
                { day: 'Sun', active: false }
              ]).map((d, i) => (
                <div key={i} className={`swt-day-col ${d.active ? 'active' : ''}`}>
                  <div className="swt-dot">{d.active ? '🔥' : '•'}</div>
                  <span className="swt-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Milestone Badges */}
        {streakData?.badges && (
          <div className="streak-badges-row card">
            <span className="sbr-title">Streak Milestone Badges:</span>
            <div className="sbr-list">
              {streakData.badges.map(b => (
                <div key={b.title} className={`streak-badge-chip ${b.unlocked ? 'unlocked' : 'locked'}`}>
                  <span>{b.icon}</span>
                  <span>{b.title}</span>
                  {b.unlocked ? <span className="sb-check">✓</span> : <span className="sb-req">({b.target}d)</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="dash-stats-grid">
          <div className="dash-stat card">
            <span className="dash-stat-icon">📊</span>
            <div className="dash-stat-val">{history.length}</div>
            <div className="dash-stat-label">Assessments Taken</div>
          </div>
          <div className="dash-stat card">
            <span className="dash-stat-icon">🏆</span>
            <div className="dash-stat-val">{bestScore}</div>
            <div className="dash-stat-label">Best Score</div>
          </div>
          <div className="dash-stat card">
            <span className="dash-stat-icon">📈</span>
            <div className="dash-stat-val">{avgScore}</div>
            <div className="dash-stat-label">Average Score</div>
          </div>
          <div className="dash-stat card">
            <span className="dash-stat-icon">⭐</span>
            <div className="dash-stat-val">{latest?.predicted_level || '—'}</div>
            <div className="dash-stat-label">Current Level</div>
          </div>
        </div>

        {/* Latest Result */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : latest ? (
          <div className="dash-latest card fade-in">
            <div className="dash-section-header">
              <h2>Latest ML Assessment Breakdown</h2>
              <span className="badge badge-primary">{latest.predicted_level} Level</span>
            </div>

            <div className="latest-overview">
              <div className="latest-score">
                <span className="latest-score-num text-gradient">{latest.overall_score}</span>
                <span className="latest-score-denom">/100</span>
              </div>
              <div className="latest-domains">
                {Object.keys(DOMAIN_ICONS).map(d => {
                  const val = latest[d] ?? 0;
                  const color = val >= 75 ? '#10b981' : val >= 50 ? '#6366f1' : '#ef4444';
                  return (
                    <div key={d} className="latest-domain-row">
                      <span className="latest-domain-label">
                        {DOMAIN_ICONS[d]} {d.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      <div className="latest-domain-bar-wrap">
                        <div className="latest-domain-bar" style={{ width: `${val}%`, background: color }} />
                      </div>
                      <span className="latest-domain-val" style={{ color }}>{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {latest.mentor_summary && (
              <div className="dash-mentor-note">
                <span>🤖</span>
                <p>{latest.mentor_summary}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="dash-empty card">
            <div className="empty-icon">📋</div>
            <h3>No assessments yet</h3>
            <p>Take your first adaptive ML assessment to unlock your skill card and opportunities.</p>
            <Link to="/assessment" className="btn btn-primary" style={{ marginTop: 20 }}>
              Start First Assessment →
            </Link>
          </div>
        )}

        {/* Quick Links Grid */}
        <div className="dash-quick-links">
          <Link to="/assessment" className="quick-link card">
            <span className="ql-icon">🧠</span>
            <span className="ql-label">Take Assessment</span>
            <span className="ql-sub">10 adaptive questions</span>
          </Link>
          <Link to="/classes" className="quick-link card">
            <span className="ql-icon">🎓</span>
            <span className="ql-label">Live Masterclasses</span>
            <span className="ql-sub">8+ industry classes</span>
          </Link>
          <Link to="/opportunities" className="quick-link card">
            <span className="ql-icon">💼</span>
            <span className="ql-label">Opportunities</span>
            <span className="ql-sub">Apply with ML Score</span>
          </Link>
          <Link to="/candidates" className="quick-link card highlight-card">
            <span className="ql-icon">🏢</span>
            <span className="ql-label">Candidate Directory</span>
            <span className="ql-sub">Recruiter screening view</span>
          </Link>
          <Link to="/leaderboard" className="quick-link card">
            <span className="ql-icon">🏆</span>
            <span className="ql-label">Leaderboard</span>
            <span className="ql-sub">Top peer ranks</span>
          </Link>
          <Link to="/history" className="quick-link card">
            <span className="ql-icon">📋</span>
            <span className="ql-label">View History</span>
            <span className="ql-sub">Past attempts</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
