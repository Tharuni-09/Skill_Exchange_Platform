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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assessments?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(data => { setHistory(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.email]);

  const latest = history[0];
  const bestScore = history.length > 0 ? Math.max(...history.map(h => h.overall_score)) : 0;
  const avgScore  = history.length > 0
    ? Math.round(history.reduce((a, h) => a + h.overall_score, 0) / history.length)
    : 0;

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
          <Link to="/assessment" className="btn btn-primary">
            🧠 New Assessment
          </Link>
        </div>

        {/* Stats */}
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
              <h2>Latest Assessment</h2>
              <span className="badge badge-primary">{latest.predicted_level}</span>
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
            <p>Take your first assessment to see your skill analysis here.</p>
            <Link to="/assessment" className="btn btn-primary" style={{ marginTop: 20 }}>
              Start First Assessment →
            </Link>
          </div>
        )}

        {/* Quick links */}
        <div className="dash-quick-links">
          <Link to="/assessment" className="quick-link card">
            <span className="ql-icon">🧠</span>
            <span className="ql-label">Take Assessment</span>
          </Link>
          <Link to="/leaderboard" className="quick-link card">
            <span className="ql-icon">🏆</span>
            <span className="ql-label">Leaderboard</span>
          </Link>
          <Link to="/history" className="quick-link card">
            <span className="ql-icon">📋</span>
            <span className="ql-label">View History</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
