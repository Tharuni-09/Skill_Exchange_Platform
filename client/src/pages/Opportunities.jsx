import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './Opportunities.css';

const TYPES = ['All', 'Internship', 'Full-Time', 'Remote'];
const STREAMS = ['All', 'CS', 'IT', 'ECE', 'Management'];
const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

export default function Opportunities() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStream, setSelectedStream] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [activeApplyModal, setActiveApplyModal] = useState(null);
  const [userAssessment, setUserAssessment] = useState(null);
  const [applicationNotes, setApplicationNotes] = useState('');
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchOpportunities();
    if (user?.email) {
      fetchUserLatestAssessment();
    }
  }, [user]);

  const fetchOpportunities = async () => {
    try {
      const url = user?.email ? `/api/opportunities?email=${encodeURIComponent(user.email)}` : '/api/opportunities';
      const res = await fetch(url);
      const data = await res.json();
      setOpportunities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLatestAssessment = async () => {
    try {
      const res = await fetch(`/api/assessments?email=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setUserAssessment(data[0]);
      }
    } catch (e) {
      console.error('Failed to get user assessment', e);
    }
  };

  const handleOpenApplyModal = (opp) => {
    if (!user) {
      setMessage('Please log in to apply with your verified ML assessment profile.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }
    setActiveApplyModal(opp);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!user || !activeApplyModal) return;

    setApplying(true);
    try {
      const res = await fetch('/api/opportunities/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          opportunityId: activeApplyModal.id,
          notes: applicationNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update local state to mark as applied
      setOpportunities(prev => prev.map(o => o.id === activeApplyModal.id ? { ...o, applied: true, applicants: o.applicants + 1 } : o));
      setMessage(`🎉 Successfully applied to ${activeApplyModal.company} for ${activeApplyModal.title}!`);
      setTimeout(() => setMessage(''), 5000);
      setActiveApplyModal(null);
      setApplicationNotes('');
    } catch (err) {
      setMessage(`Application error: ${err.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setApplying(false);
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          opp.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          opp.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'All' || (selectedType === 'Remote' ? opp.location.toLowerCase().includes('remote') : opp.type === selectedType);
    const matchesStream = selectedStream === 'All' || opp.stream === selectedStream;
    const matchesLevel = selectedLevel === 'All' || opp.minLevel === selectedLevel;

    return matchesSearch && matchesType && matchesStream && matchesLevel;
  });

  return (
    <div className="opportunities-page">
      <div className="page-container">
        {/* Hero Banner */}
        <div className="opp-hero card fade-in">
          <div className="opp-hero-left">
            <span className="badge badge-success">💼 Direct Recruiter & Career Gateway</span>
            <h1 className="opp-title">Opportunities Powered by Your ML Score</h1>
            <p className="opp-subtitle">
              Skip traditional resume screening. Top companies hire based on your verified SkillSwap ML assessment results, problem-solving skills, and daily streak.
            </p>
          </div>
          {userAssessment ? (
            <div className="user-score-highlight card">
              <span className="ush-label">Your Verified Skill Card</span>
              <div className="ush-score">{userAssessment.overall_score} <span className="ush-denom">/100</span></div>
              <div className="ush-level badge badge-primary">{userAssessment.predicted_level} Level</div>
              <span className="ush-streak">🔥 {user?.streak || userAssessment.streaks || 1}-Day Streak</span>
            </div>
          ) : (
            <div className="user-score-highlight card">
              <span className="ush-label">Assessment Status</span>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0' }}>
                Take the ML assessment to unlock 1-click verified applications!
              </p>
              <Link to="/assessment" className="btn btn-primary btn-sm">Take ML Assessment →</Link>
            </div>
          )}
        </div>

        {/* Message Banner */}
        {message && <div className="toast-banner fade-in">{message}</div>}

        {/* Search & Filters */}
        <div className="opp-filter-bar card">
          <div className="of-search">
            <span className="of-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by role, company, or tech stack (e.g. SDE, Google, React, Python)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <button className="clear-btn" onClick={() => setSearchTerm('')}>✕</button>}
          </div>

          <div className="of-selectors">
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Job Types' : t}</option>)}
            </select>

            <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)}>
              {STREAMS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Streams' : `${s} Stream`}</option>)}
            </select>

            <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
              {LEVELS.map(l => <option key={l} value={l}>{l === 'All' ? 'All Required Levels' : `Min ${l}`}</option>)}
            </select>
          </div>
        </div>

        {/* Opportunities Listing */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /><p>Finding opportunities...</p></div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="empty-state card">
            <span className="empty-icon">💼</span>
            <h3>No matching opportunities</h3>
            <p>Try resetting filters or searching with different keywords.</p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearchTerm(''); setSelectedType('All'); setSelectedStream('All'); setSelectedLevel('All'); }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="opp-list">
            {filteredOpportunities.map(opp => {
              const meetsScore = userAssessment ? userAssessment.overall_score >= opp.minScore : null;
              return (
                <div key={opp.id} className={`opp-card card fade-in ${opp.applied ? 'is-applied' : ''}`}>
                  <div className="opp-main">
                    <div className="opp-logo-box">{opp.logo}</div>

                    <div className="opp-details">
                      <div className="opp-header-row">
                        <div className="opp-company">{opp.company}</div>
                        <span className={`badge badge-${opp.type === 'Internship' ? 'primary' : 'success'}`}>
                          {opp.type}
                        </span>
                      </div>

                      <h3 className="opp-job-title">{opp.title}</h3>

                      <div className="opp-meta-row">
                        <span>📍 {opp.location}</span>
                        <span>💰 {opp.stipend}</span>
                        <span>⏳ {opp.deadline}</span>
                        <span>👥 {opp.applicants} applied</span>
                      </div>

                      <p className="opp-desc">{opp.description}</p>

                      <div className="opp-tags-row">
                        {opp.skills.map(s => <span key={s} className="opp-skill-tag">{s}</span>)}
                      </div>
                    </div>
                  </div>

                  {/* Right side verification & action */}
                  <div className="opp-sidebar">
                    <div className="opp-req-box">
                      <span className="req-label">ML Benchmark Required</span>
                      <div className="req-score">Score: {opp.minScore}+</div>
                      <span className="badge badge-warning">{opp.minLevel} Level</span>
                    </div>

                    {userAssessment && (
                      <div className="match-status">
                        {meetsScore ? (
                          <span className="match-tag match-yes">✓ You meet the benchmark ({userAssessment.overall_score}/100)</span>
                        ) : (
                          <span className="match-tag match-no">⚠️ Score ({userAssessment.overall_score}/100) is below {opp.minScore}</span>
                        )}
                      </div>
                    )}

                    <div className="opp-actions">
                      {opp.applied ? (
                        <button className="btn btn-success btn-sm" disabled style={{ width: '100%' }}>
                          ✓ Application Submitted
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ width: '100%' }}
                          onClick={() => handleOpenApplyModal(opp)}
                        >
                          ⚡ Apply with ML Score
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Apply Modal */}
        {activeApplyModal && (
          <div className="modal-backdrop" onClick={() => setActiveApplyModal(null)}>
            <div className="modal-card card fade-in" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setActiveApplyModal(null)}>✕</button>

              <div className="modal-header-opp">
                <span className="modal-opp-logo">{activeApplyModal.logo}</span>
                <div>
                  <h2 className="modal-title" style={{ marginBottom: 4 }}>{activeApplyModal.title}</h2>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{activeApplyModal.company} • {activeApplyModal.location}</div>
                </div>
              </div>

              <div className="apply-verified-card card">
                <h4>Verified SkillSwap ML Credentials Attached:</h4>
                <div className="av-grid">
                  <div className="av-item">
                    <span className="av-label">Candidate Name</span>
                    <span className="av-val">{user?.name}</span>
                  </div>
                  <div className="av-item">
                    <span className="av-label">Overall ML Score</span>
                    <span className="av-val text-gradient">{userAssessment?.overall_score || 'Not Assessed'}/100</span>
                  </div>
                  <div className="av-item">
                    <span className="av-label">Predicted Level</span>
                    <span className="av-val">{userAssessment?.predicted_level || 'Beginner'}</span>
                  </div>
                  <div className="av-item">
                    <span className="av-label">Active Learning Streak</span>
                    <span className="av-val" style={{ color: '#f59e0b' }}>🔥 {user?.streak || 1} Days</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleApply} className="apply-form">
                <div className="form-group">
                  <label>Note to Hiring Team (Optional)</label>
                  <textarea
                    rows="3"
                    placeholder="Mention any notable projects, GitHub link, or why you're a great fit..."
                    value={applicationNotes}
                    onChange={(e) => setApplicationNotes(e.target.value)}
                    style={{
                      background: 'var(--bg-card-light)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '12px',
                      color: 'var(--text-primary)',
                      width: '100%'
                    }}
                  />
                </div>

                <div className="modal-actions" style={{ marginTop: 20 }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={applying}>
                    {applying ? 'Submitting Application...' : 'Confirm & Submit Application 🚀'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
