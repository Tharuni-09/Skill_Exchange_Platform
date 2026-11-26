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
  const [targetTopic, setTargetTopic] = useState(user?.targetTopic || 'Supervised Learning Models (Regression, Classification)');
  const [editingTopic, setEditingTopic] = useState(false);
  const [topicInput, setTopicInput] = useState(user?.targetTopic || 'Supervised Learning Models (Regression, Classification)');

  useEffect(() => {
    Promise.all([
      fetch(`/api/assessments?email=${encodeURIComponent(user.email)}`).then(r => r.json()),
      fetch(`/api/user/streak?email=${encodeURIComponent(user.email)}`).then(r => r.json()),
      fetch(`/api/auth/me?email=${encodeURIComponent(user.email)}`).then(r => r.json())
    ])
      .then(([histData, sData, meData]) => {
        setHistory(Array.isArray(histData) ? histData : []);
        setStreakData(sData);
        if (meData?.targetTopic) {
          setTargetTopic(meData.targetTopic);
          setTopicInput(meData.targetTopic);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user.email]);

  const handleSaveTopic = async () => {
    try {
      const res = await fetch('/api/user/update-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, targetTopic: topicInput })
      });
      if (res.ok) {
        setTargetTopic(topicInput);
        setEditingTopic(false);
      }
    } catch (e) {
      console.error('Failed to update topic:', e);
    }
  };

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
              Welcome back, <span className="text-gradient">{user.name}</span>
            </h1>
            <p className="dash-subtitle">
              {user.role} · {user.stream || 'General Engineering'} {user.specialization ? `· ${user.specialization}` : ''}
            </p>
          </div>
          <div className="dash-welcome-actions">
            <Link to="/assessment" className="btn btn-primary">
              Start Assessment →
            </Link>
          </div>
        </div>

        {/* User Target Topic / Requirement Card */}
        <div className="card fade-in" style={{ marginBottom: 24, padding: '20px 24px', borderLeft: '4px solid var(--primary-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--primary-light)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Target Learning Track & Specialization
              </span>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                {targetTopic}
              </h3>
            </div>
            <button
              onClick={() => setEditingTopic(!editingTopic)}
              className="btn btn-secondary btn-sm"
            >
              {editingTopic ? 'Cancel' : 'Edit Track'}
            </button>
          </div>
          {editingTopic && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                Specify your exact learning requirements (e.g., <em>"Supervised Learning Models"</em>, <em>"Distributed Systems"</em>, <em>"React Microfrontends"</em>):
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="e.g. Supervised Learning Models, Deep Neural Networks"
                  style={{ flex: 1, minWidth: 260, padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: '0.95rem' }}
                />
                <button onClick={handleSaveTopic} className="btn btn-primary btn-sm" style={{ padding: '8px 18px' }}>
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Learning Streak Card */}
        <div className="streak-hero-card card fade-in">
          <div className="shc-left">
            <div className="streak-flame-wrapper">
              <span className="streak-flame-icon">⚡</span>
            </div>
            <div>
              <div className="shc-header">
                <span className="shc-num">{currentStreak}</span>
                <span className="shc-unit">Day Activity Streak</span>
                <span className="streak-multiplier-badge">{streakData?.streakMultiplier || '1.0x'} Multiplier</span>
              </div>
              <p className="shc-desc">
                {currentStreak >= 7
                  ? "Outstanding consistency. Your streak index is highlighted on recruiter talent searches."
                  : currentStreak >= 3
                  ? "Solid momentum. Complete assessments and masterclasses daily to maintain your streak."
                  : "Complete today's assessment or attend a masterclass to build verified consistency."}
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
            <div className="dash-stat-val">{history.length}</div>
            <div className="dash-stat-label">Assessments Completed</div>
          </div>
          <div className="dash-stat card">
            <div className="dash-stat-val">{bestScore}%</div>
            <div className="dash-stat-label">Highest Score</div>
          </div>
          <div className="dash-stat card">
            <div className="dash-stat-val">{avgScore}%</div>
            <div className="dash-stat-label">Average Performance</div>
          </div>
          <div className="dash-stat card">
            <div className="dash-stat-val">{latest?.predicted_level || 'Pending'}</div>
            <div className="dash-stat-label">Proficiency Tier</div>
          </div>
        </div>

        {/* Latest Result */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : latest ? (
          <div className="dash-latest card fade-in">
            <div className="dash-section-header">
              <h2>Latest Assessment Evaluation</h2>
              <span className="badge badge-primary">{latest.predicted_level} Tier</span>
            </div>

            <div className="latest-overview">
              <div className="latest-score">
                <span className="latest-score-num text-gradient">{latest.overall_score}</span>
                <span className="latest-score-denom">/100</span>
              </div>
              <div className="latest-domains">
                {Object.keys(DOMAIN_ICONS).map(d => {
                  const val = latest[d] ?? 0;
                  const color = val >= 75 ? 'var(--secondary)' : val >= 50 ? 'var(--primary-light)' : 'var(--danger)';
                  return (
                    <div key={d} className="latest-domain-row">
                      <span className="latest-domain-label">
                        {d.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      <div className="latest-domain-bar-wrap">
                        <div className="latest-domain-bar" style={{ width: `${val}%`, background: color }} />
                      </div>
                      <span className="latest-domain-val" style={{ color }}>{val}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {latest.mentor_summary && (
              <div className="dash-mentor-note">
                <p><strong>Evaluation Note:</strong> {latest.mentor_summary}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="dash-empty card">
            <h3>No assessments completed yet</h3>
            <p>Take your first evaluation assessment to establish your baseline skill index.</p>
            <Link to="/assessment" className="btn btn-primary" style={{ marginTop: 20 }}>
              Start Assessment →
            </Link>
          </div>
        )}

        {/* Quick Links Grid */}
        <div className="dash-quick-links">
          <Link to="/assessment" className="quick-link card">
            <span className="ql-label">Take Assessment</span>
            <span className="ql-sub">Adaptive standardized testing</span>
          </Link>
          <Link to="/classes" className="quick-link card">
            <span className="ql-label">Masterclasses</span>
            <span className="ql-sub">Interactive technical sessions</span>
          </Link>
          <Link to="/timetable" className="quick-link card">
            <span className="ql-label">Weekly Schedule</span>
            <span className="ql-sub">Study planner & class sync</span>
          </Link>
          <Link to="/friends" className="quick-link card">
            <span className="ql-label">Study Partners</span>
            <span className="ql-sub">Peer learning & practice</span>
          </Link>
          <Link to="/candidates" className="quick-link card highlight-card">
            <span className="ql-label">Recruiter Directory</span>
            <span className="ql-sub">Enterprise candidate screening</span>
          </Link>
          <Link to="/history" className="quick-link card">
            <span className="ql-label">Assessment History</span>
            <span className="ql-sub">Historical score logs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
