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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('assessments'); // 'assessments' | 'classes' | 'logins' | 'applications'
  const [historyData, setHistoryData] = useState({
    assessments: [],
    classesAttended: [],
    logins: [],
    applications: []
  });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [user.email]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/history/all?email=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      setHistoryData({
        assessments: Array.isArray(data.assessments) ? data.assessments : [],
        classesAttended: Array.isArray(data.classesAttended) ? data.classesAttended : [],
        logins: Array.isArray(data.logins) ? data.logins : [],
        applications: Array.isArray(data.applications) ? data.applications : []
      });
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '60vh' }}>
        <div className="spinner" /><p>Retrieving database history...</p>
      </div>
    );
  }

  const { assessments, classesAttended, logins, applications } = historyData;

  return (
    <div className="history-page">
      <div className="page-container">
        {/* Header */}
        <div className="history-header card fade-in">
          <div>
            <span className="badge badge-primary">💾 SQLite Permanent Database Records</span>
            <h1 className="section-title">Activity & Learning Audit History</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 4 }}>
              Every login, assessment assignment result, Zoom class attended, and application is securely saved in the database.
            </p>
          </div>

          <div className="hh-stats">
            <div className="hhs-box">
              <span className="hhs-val text-gradient">{assessments.length}</span>
              <span className="hhs-lbl">Assessments</span>
            </div>
            <div className="hhs-box">
              <span className="hhs-val" style={{ color: '#10b981' }}>{classesAttended.length}</span>
              <span className="hhs-lbl">Classes Attended</span>
            </div>
            <div className="hhs-box">
              <span className="hhs-val" style={{ color: '#f59e0b' }}>{logins.length}</span>
              <span className="hhs-lbl">Logins Logged</span>
            </div>
          </div>
        </div>

        {/* History Tabs */}
        <div className="history-tabs-bar">
          <button
            className={`history-tab-btn ${activeTab === 'assessments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assessments')}
          >
            🧠 Assessment Results ({assessments.length})
          </button>
          <button
            className={`history-tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            🎓 Classes Attended ({classesAttended.length})
          </button>
          <button
            className={`history-tab-btn ${activeTab === 'logins' ? 'active' : ''}`}
            onClick={() => setActiveTab('logins')}
          >
            🔐 Logins History ({logins.length})
          </button>
          <button
            className={`history-tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            💼 Applications ({applications.length})
          </button>
        </div>

        {/* TAB 1: ASSESSMENTS / ASSIGNMENT RESULTS */}
        {activeTab === 'assessments' && (
          assessments.length === 0 ? (
            <div className="history-empty card">
              <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
              <h3>No assessments recorded yet</h3>
              <p style={{ color: 'var(--text-secondary)', margin: '10px 0 20px' }}>
                Complete an assessment to log your first verified score into the database.
              </p>
              <Link to="/assessment" className="btn btn-primary">Start Assessment →</Link>
            </div>
          ) : (
            <div className="history-list">
              {assessments.map((item, idx) => {
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
                          <div className="hc-date">Recorded: {formatDate(item.assessment_date)}</div>
                        </div>
                      </div>
                      <div className="hc-right">
                        <span className="badge badge-warning">🔥 {item.streaks || 1}d Streak</span>
                        <span className="badge badge-primary">Confidence: {item.confidence}%</span>
                        <span className="hc-chevron">{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="history-card-body fade-in">
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

                        {gaps.length > 0 && (
                          <div className="hcb-gaps">
                            <span className="hcb-gaps-label">Skill Gaps:</span>
                            {gaps.map(g => (
                              <span key={g} className="sg-chip gap" style={{ fontSize: 12 }}>{g}</span>
                            ))}
                          </div>
                        )}

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
          )
        )}

        {/* TAB 2: CLASSES ATTENDED HISTORY */}
        {activeTab === 'classes' && (
          classesAttended.length === 0 ? (
            <div className="history-empty card">
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎓</div>
              <h3>No classes attended yet</h3>
              <p style={{ color: 'var(--text-secondary)', margin: '10px 0 20px' }}>
                Join live Zoom masterclasses to automatically record attendance history.
              </p>
              <Link to="/classes" className="btn btn-primary">Browse Classes →</Link>
            </div>
          ) : (
            <div className="history-table-card card fade-in">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Class Title</th>
                    <th>Instructor</th>
                    <th>Zoom Status</th>
                    <th>Duration</th>
                    <th>Date Attended</th>
                  </tr>
                </thead>
                <tbody>
                  {classesAttended.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>🎓 {c.class_title}</td>
                      <td>{c.instructor_name || 'Senior Mentor'}</td>
                      <td>
                        <span className="badge badge-success">✓ Zoom Verified</span>
                      </td>
                      <td>{c.duration_minutes || 60} mins</td>
                      <td style={{ color: 'var(--text-muted)' }}>{formatDate(c.attended_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* TAB 3: LOGIN HISTORY */}
        {activeTab === 'logins' && (
          logins.length === 0 ? (
            <div className="history-empty card">
              <div style={{ fontSize: 56, marginBottom: 16 }}>🔐</div>
              <h3>No login records found</h3>
            </div>
          ) : (
            <div className="history-table-card card fade-in">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th>Browser / Device</th>
                    <th>Login Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logins.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600 }}>{l.user_name || user.name}</td>
                      <td>
                        <span className="badge badge-success">
                          ✓ {l.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{l.ip_address || '127.0.0.1'}</td>
                      <td style={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12, color: 'var(--text-muted)' }}>
                        {l.user_agent || 'Chrome / Windows'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatDate(l.login_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* TAB 4: JOB APPLICATIONS */}
        {activeTab === 'applications' && (
          applications.length === 0 ? (
            <div className="history-empty card">
              <div style={{ fontSize: 56, marginBottom: 16 }}>💼</div>
              <h3>No job applications submitted yet</h3>
              <p style={{ color: 'var(--text-secondary)', margin: '10px 0 20px' }}>
                Explore open opportunities and apply with your verified ML score.
              </p>
              <Link to="/opportunities" className="btn btn-primary">Explore Opportunities →</Link>
            </div>
          ) : (
            <div className="history-table-card card fade-in">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role Title</th>
                    <th>Attached Score</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Applied Date</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 700 }}>🏢 {a.company_name || 'Tech Company'}</td>
                      <td style={{ color: 'var(--text-primary)' }}>{a.job_title || 'Engineering Role'}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: 'var(--primary-light)' }}>{a.score || 75}/100</span>
                      </td>
                      <td>
                        <span className="badge badge-primary">{a.level || 'Intermediate'}</span>
                      </td>
                      <td>
                        <span className="badge badge-warning">{a.status || 'Under Review'}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{formatDate(a.applied_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
