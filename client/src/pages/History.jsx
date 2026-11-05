import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './History.css';

const LEVEL_COLORS = {
  Expert:       '#f59e0b',
  Advanced:     '#10b981',
  Intermediate: '#6366f1',
  Beginner:     '#6b7280'
};

export default function History() {
  const { user }     = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(`/api/assessments?email=${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(data => { setHistory(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.email]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="page-container">
        <div className="history-header">
          <div>
            <h1 className="section-title">📋 Assessment History</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 4 }}>
              {history.length} assessment{history.length !== 1 ? 's' : ''} completed
            </p>
          </div>
          <Link to="/assessment" className="btn btn-primary">New Assessment</Link>
        </div>

        {history.length === 0 ? (
          <div className="history-empty card">
            <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
            <h3>No assessments yet</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '10px 0 20px' }}>
              Take your first assessment to build your history.
            </p>
            <Link to="/assessment" className="btn btn-primary">Start First Assessment →</Link>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item, idx) => {
              const isOpen = expanded === idx;
              const levelColor = LEVEL_COLORS[item.predicted_level] || '#94a3b8';
              const gaps = Array.isArray(item.skill_gaps) ? item.skill_gaps : [];

              return (
                <div key={item.id} className="history-card card fade-in">
                  <div
                    className="history-card-header"
                    onClick={() => setExpanded(isOpen ? null : idx)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="hc-left">
                      <div className="hc-score-badge" style={{ borderColor: levelColor }}>
                        <span className="hc-score">{item.overall_score}</span>
                        <span className="hc-score-label">/100</span>
                      </div>
                      <div>
                        <div className="hc-level" style={{ color: levelColor }}>
                          {item.predicted_level}
                        </div>
                        <div className="hc-date">{formatDate(item.assessment_date)}</div>
                      </div>
                    </div>
                    <div className="hc-right">
                      <span className="badge badge-primary">Confidence: {item.confidence}%</span>
                      <span className="hc-chevron">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="history-card-body fade-in">
                      {/* Domain scores */}
                      <div className="hcb-domains">
                        {['analytical_reasoning','problem_solving','decision_making','attention_consistency','knowledge_recall'].map(d => {
                          const val = item[d] ?? 0;
                          const color = val >= 75 ? '#10b981' : val >= 50 ? '#6366f1' : '#ef4444';
                          return (
                            <div key={d} className="hcb-domain-row">
                              <span className="hcb-domain-name">
                                {d.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              </span>
                              <div className="hcb-bar-wrap">
                                <div className="hcb-bar" style={{ width: `${val}%`, background: color }} />
                              </div>
                              <span style={{ color, fontWeight: 700, fontSize: 14, width: 30, textAlign: 'right' }}>{val}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Skill gaps */}
                      {gaps.length > 0 && (
                        <div className="hcb-gaps">
                          <span className="hcb-gaps-label">Skill Gaps:</span>
                          {gaps.map(g => (
                            <span key={g} className="sg-chip gap" style={{ fontSize: 12 }}>{g}</span>
                          ))}
                        </div>
                      )}

                      {/* Mentor summary */}
                      {item.mentor_summary && (
                        <div className="hcb-mentor">
                          <span>🤖</span>
                          <p>{item.mentor_summary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
