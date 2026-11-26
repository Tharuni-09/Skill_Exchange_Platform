import React, { useState, useEffect } from 'react';
import './CompanyPortal.css';

const STREAMS = ['All', 'CS', 'IT', 'ECE', 'EEE', 'Management'];
const LEVELS = ['All', 'Expert', 'Advanced', 'Intermediate', 'Beginner'];
const STATUSES = ['All', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Hired'];

export default function CompanyPortal() {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'candidates'
  const [applications, setApplications] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [minScore, setMinScore] = useState(0);
  const [minStreak, setMinStreak] = useState(0);
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'streak' | 'date'

  // Selected candidate / application for modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [message, setMessage] = useState('');
  const [zoomModalCandidate, setZoomModalCandidate] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsRes, candsRes] = await Promise.all([
        fetch('/api/company/applications'),
        fetch('/api/candidates')
      ]);
      const appsData = await appsRes.json();
      const candsData = await candsRes.json();

      setApplications(Array.isArray(appsData) ? appsData : []);
      setCandidates(Array.isArray(candsData) ? candsData : []);
    } catch (err) {
      console.error('Failed to load company data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSearch = (e) => {
    if (e) e.preventDefault();
    setActiveSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setActiveSearch('');
    setSelectedStream('All');
    setSelectedLevel('All');
    setSelectedStatus('All');
    setMinScore(0);
    setMinStreak(0);
    setFilterPanelOpen(false);
  };

  const handleUpdateStatus = async (applicationId, newStatus) => {
    try {
      const res = await fetch('/api/company/application-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setApplications(prev => prev.map(a => a.applicationId === applicationId ? { ...a, status: newStatus } : a));
      if (selectedItem?.applicationId === applicationId) {
        setSelectedItem(prev => ({ ...prev, status: newStatus }));
      }
      setMessage(data.message);
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // Filtered Applications
  const filteredApplications = applications.filter(app => {
    const term = activeSearch.toLowerCase();
    const matchesSearch = !term ||
      app.name.toLowerCase().includes(term) ||
      app.email.toLowerCase().includes(term) ||
      (app.jobTitle && app.jobTitle.toLowerCase().includes(term)) ||
      (app.company && app.company.toLowerCase().includes(term)) ||
      (app.stream && app.stream.toLowerCase().includes(term)) ||
      (app.specialization && app.specialization.toLowerCase().includes(term));

    const matchesStream = selectedStream === 'All' || app.stream === selectedStream;
    const matchesLevel = selectedLevel === 'All' || app.level === selectedLevel;
    const matchesStatus = selectedStatus === 'All' || app.status === selectedStatus;
    const matchesScore = (app.score || 0) >= minScore;
    const matchesStreak = (app.streak || 1) >= minStreak;

    return matchesSearch && matchesStream && matchesLevel && matchesStatus && matchesScore && matchesStreak;
  }).sort((a, b) => {
    if (sortBy === 'streak') return (b.streak || 0) - (a.streak || 0);
    if (sortBy === 'date') return new Date(b.appliedAt) - new Date(a.appliedAt);
    return (b.score || 0) - (a.score || 0);
  });

  // Filtered Candidates Directory
  const filteredCandidates = candidates.filter(cand => {
    const term = activeSearch.toLowerCase();
    const matchesSearch = !term ||
      cand.name.toLowerCase().includes(term) ||
      cand.email.toLowerCase().includes(term) ||
      cand.stream.toLowerCase().includes(term) ||
      (cand.targetTopic && cand.targetTopic.toLowerCase().includes(term)) ||
      (cand.specialization && cand.specialization.toLowerCase().includes(term)) ||
      (cand.skills && cand.skills.some(s => s.toLowerCase().includes(term)));

    const matchesStream = selectedStream === 'All' || cand.stream === selectedStream;
    const matchesLevel = selectedLevel === 'All' || cand.predictedLevel === selectedLevel;
    const matchesScore = (cand.overallScore || 0) >= minScore;
    const matchesStreak = (cand.streak || 1) >= minStreak;

    return matchesSearch && matchesStream && matchesLevel && matchesScore && matchesStreak;
  }).sort((a, b) => {
    if (sortBy === 'streak') return (b.streak || 0) - (a.streak || 0);
    return (b.overallScore || 0) - (a.overallScore || 0);
  });

  const activeFilterCount = (selectedStream !== 'All' ? 1 : 0) +
                            (selectedLevel !== 'All' ? 1 : 0) +
                            (selectedStatus !== 'All' ? 1 : 0) +
                            (minScore > 0 ? 1 : 0) +
                            (minStreak > 0 ? 1 : 0) +
                            (activeSearch ? 1 : 0);

  return (
    <div className="company-portal-page">
      <div className="page-container">
        {/* Recruiter Banner */}
        <div className="company-hero card fade-in">
          <div className="ch-left">
            <span className="badge badge-warning">🏢 Company & Employer Talent Suite</span>
            <h1 className="ch-title">Candidate Applications & Talent Screening</h1>
            <p className="ch-subtitle">
              Review candidates who applied for your roles with verified Machine Learning scores, cognitive benchmarks, and daily learning streaks.
            </p>
          </div>

          <div className="ch-metrics">
            <div className="chm-box">
              <span className="chm-val text-gradient">{applications.length}</span>
              <span className="chm-lbl">Job Applications</span>
            </div>
            <div className="chm-box">
              <span className="chm-val" style={{ color: '#10b981' }}>{candidates.length}</span>
              <span className="chm-lbl">Platform Candidates</span>
            </div>
            <div className="chm-box">
              <span className="chm-val" style={{ color: '#f59e0b' }}>100%</span>
              <span className="chm-lbl">ML Verified</span>
            </div>
          </div>
        </div>

        {/* Message Toast */}
        {message && <div className="toast-banner fade-in">{message}</div>}

        {/* Navigation Tabs */}
        <div className="cp-nav-tabs">
          <button
            className={`cp-tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            📥 Candidates in Application ({applications.length})
          </button>
          <button
            className={`cp-tab-btn ${activeTab === 'candidates' ? 'active' : ''}`}
            onClick={() => setActiveTab('candidates')}
          >
            👥 All Verified Candidates Directory ({candidates.length})
          </button>
        </div>

        {/* SEARCH & FILTER CONTROLS BAR WITH EXPLICIT BUTTONS */}
        <div className="cp-controls-bar card">
          {/* Search Row with explicit Search Button */}
          <form onSubmit={handleExecuteSearch} className="cp-search-form">
            <div className="cp-search-input-wrap">
              <span className="cp-search-icon">🔍</span>
              <input
                type="text"
                placeholder={
                  activeTab === 'applications'
                    ? "Search applicants by name, role, company, stream, or skill..."
                    : "Search all candidates by name, stream, specialization, or skill tags..."
                }
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => {
                    setSearchInput('');
                    setActiveSearch('');
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* EXPLICIT SEARCH BUTTON */}
            <button type="submit" className="btn btn-primary cp-btn-search">
              🔍 Search
            </button>

            {/* EXPLICIT FILTER BUTTON */}
            <button
              type="button"
              className={`btn btn-secondary cp-btn-filter ${filterPanelOpen ? 'active' : ''}`}
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            >
              <span>⚡ Filters</span>
              {activeFilterCount > 0 && <span className="filter-badge-count">{activeFilterCount}</span>}
            </button>
          </form>

          {/* Quick Filter Status Bar */}
          <div className="cp-status-bar">
            <div className="cp-sort-group">
              <label>Sort By:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="score">ML Assessment Score (High to Low)</option>
                <option value="streak">Active Learning Streak 🔥</option>
                <option value="date">Most Recent First</option>
              </select>
            </div>

            {activeFilterCount > 0 && (
              <div className="active-filters-chips">
                <span className="af-label">Active Filters:</span>
                {activeSearch && <span className="af-chip">Search: "{activeSearch}"</span>}
                {selectedStream !== 'All' && <span className="af-chip">{selectedStream} Stream</span>}
                {selectedLevel !== 'All' && <span className="af-chip">{selectedLevel} Level</span>}
                {selectedStatus !== 'All' && <span className="af-chip">Status: {selectedStatus}</span>}
                {minScore > 0 && <span className="af-chip">Score ≥ {minScore}</span>}
                {minStreak > 0 && <span className="af-chip">Streak ≥ {minStreak}d</span>}
                <button className="reset-af-btn" onClick={handleResetFilters}>Reset All</button>
              </div>
            )}
          </div>

          {/* EXPANDABLE FILTER PANEL */}
          {filterPanelOpen && (
            <div className="cp-filter-drawer card fade-in">
              <div className="fd-header">
                <h4>⚡ Filter Candidate Applications</h4>
                <button className="fd-close" onClick={() => setFilterPanelOpen(false)}>✕</button>
              </div>

              <div className="fd-grid">
                <div className="fd-col">
                  <label>Stream / Department</label>
                  <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)}>
                    {STREAMS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Streams' : `${s} Stream`}</option>)}
                  </select>
                </div>

                <div className="fd-col">
                  <label>Skill Proficiency Level</label>
                  <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
                    {LEVELS.map(l => <option key={l} value={l}>{l === 'All' ? 'All Skill Levels' : l}</option>)}
                  </select>
                </div>

                {activeTab === 'applications' && (
                  <div className="fd-col">
                    <label>Application Status</label>
                    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                      {STATUSES.map(st => <option key={st} value={st}>{st === 'All' ? 'All Statuses' : st}</option>)}
                    </select>
                  </div>
                )}

                <div className="fd-col">
                  <label>Minimum ML Score: <strong>{minScore > 0 ? `${minScore}+` : 'Any Score'}</strong></label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="10"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="slider-input"
                  />
                  <div className="slider-ticks">
                    <span>Any</span>
                    <span>50+</span>
                    <span>70+</span>
                    <span>85+</span>
                  </div>
                </div>

                <div className="fd-col">
                  <label>Minimum Learning Streak: <strong>{minStreak > 0 ? `🔥 ${minStreak}+ Days` : 'Any Streak'}</strong></label>
                  <input
                    type="range"
                    min="0"
                    max="28"
                    step="7"
                    value={minStreak}
                    onChange={(e) => setMinStreak(Number(e.target.value))}
                    className="slider-input"
                  />
                  <div className="slider-ticks">
                    <span>All</span>
                    <span>7d</span>
                    <span>14d</span>
                    <span>21d+</span>
                  </div>
                </div>
              </div>

              <div className="fd-actions">
                <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
                  Reset All Filters
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setFilterPanelOpen(false)}>
                  Apply Filters & Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RESULTS SECTION */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /><p>Screening candidates...</p></div>
        ) : activeTab === 'applications' ? (
          /* TAB 1: CANDIDATES IN APPLICATION */
          filteredApplications.length === 0 ? (
            <div className="empty-state card">
              <span className="empty-icon">📥</span>
              <h3>No candidate applications found</h3>
              <p>Try resetting the search terms or widening the filter criteria.</p>
              <button className="btn btn-primary btn-sm" onClick={handleResetFilters}>
                Reset Search & Filters
              </button>
            </div>
          ) : (
            <div className="applications-table-card card">
              <div className="table-responsive">
                <table className="cp-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Applied Role & Company</th>
                      <th>ML Assessment Score</th>
                      <th>Level</th>
                      <th>Learning Streak</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map(app => {
                      const scoreColor = app.score >= 85 ? '#10b981' : app.score >= 70 ? '#6366f1' : '#f59e0b';
                      return (
                        <tr key={app.applicationId} className="app-table-row">
                          <td className="cand-cell">
                            <div className="cand-avatar-mini">{app.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="cand-cell-name" onClick={() => setSelectedItem(app)}>
                                {app.name}
                              </div>
                              <div className="cand-cell-email">{app.email}</div>
                              <span className="cand-stream-pill">{app.stream} • {app.specialization}</span>
                            </div>
                          </td>

                          <td className="role-cell">
                            <div className="role-title">{app.jobTitle || 'Software Engineer'}</div>
                            <div className="role-company">🏢 {app.company || 'Tech Partner'}</div>
                            <div className="app-date">Applied: {new Date(app.appliedAt).toLocaleDateString()}</div>
                          </td>

                          <td className="score-cell">
                            <div className="score-badge-circle" style={{ borderColor: scoreColor }}>
                              <span style={{ color: scoreColor, fontWeight: 800 }}>{app.score || 75}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/100</span>
                            </div>
                          </td>

                          <td>
                            <span className={`badge badge-${app.level === 'Expert' ? 'warning' : app.level === 'Advanced' ? 'primary' : 'success'}`}>
                              {app.level || 'Intermediate'}
                            </span>
                          </td>

                          <td>
                            <div className="app-streak-pill">
                              <span>🔥 {app.streak || 1} Days</span>
                            </div>
                          </td>

                          <td>
                            <select
                              className={`status-select status-${app.status?.toLowerCase().replace(/\s+/g, '-')}`}
                              value={app.status || 'Under Review'}
                              onChange={(e) => handleUpdateStatus(app.applicationId, e.target.value)}
                            >
                              <option value="Under Review">Under Review</option>
                              <option value="Shortlisted">★ Shortlisted</option>
                              <option value="Interview Scheduled">📹 Interview Scheduled</option>
                              <option value="Hired">🎉 Hired</option>
                            </select>
                          </td>

                          <td className="actions-cell">
                            <button
                              className="btn btn-secondary btn-sm"
                              title="View full credentials"
                              onClick={() => setSelectedItem(app)}
                            >
                              Profile
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              title="Launch Zoom interview"
                              onClick={() => setZoomModalCandidate(app)}
                            >
                              📹 Zoom
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* TAB 2: ALL CANDIDATES DIRECTORY */
          filteredCandidates.length === 0 ? (
            <div className="empty-state card">
              <span className="empty-icon">👥</span>
              <h3>No candidates match your filters</h3>
              <p>Adjust your search filters to view more candidates.</p>
              <button className="btn btn-primary btn-sm" onClick={handleResetFilters}>
                Reset Search & Filters
              </button>
            </div>
          ) : (
            <div className="cands-grid">
              {filteredCandidates.map(cand => (
                <div key={cand.id} className="cand-card card fade-in">
                  <div className="cc-header">
                    <div className="cand-avatar">{cand.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div className="cand-name-wrap">
                        <h3 className="cand-name" onClick={() => setSelectedItem(cand)}>{cand.name}</h3>
                        <span className="badge badge-success">✓ Verified</span>
                      </div>
                      <div className="cand-sub">{cand.role} • {cand.stream}</div>
                      <div className="cand-loc">📍 {cand.location} • 📧 {cand.email}</div>
                    </div>
                  </div>

                  <div className="cc-metrics">
                    <div className="ccm-box">
                      <span className="ccm-lbl">ML Score</span>
                      <span className="ccm-val text-gradient">{cand.overallScore}/100</span>
                    </div>
                    <div className="ccm-box">
                      <span className="ccm-lbl">Level</span>
                      <span className="ccm-val">{cand.predictedLevel}</span>
                    </div>
                    <div className="ccm-box">
                      <span className="ccm-lbl">Streak</span>
                      <span className="ccm-val" style={{ color: '#f59e0b' }}>🔥 {cand.streak} Days</span>
                    </div>
                  </div>

                  {cand.targetTopic && (
                    <div style={{ margin: '8px 0', padding: '6px 10px', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: 6, fontSize: '0.8rem' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>🎯 Target Topic: </span>
                      <span style={{ color: '#e2e8f0' }}>{cand.targetTopic}</span>
                    </div>
                  )}

                  <p className="cand-desc">{cand.bio}</p>

                  <div className="cand-skills-row">
                    {cand.skills && cand.skills.map(s => <span key={s} className="cand-skill-tag">{s}</span>)}
                  </div>

                  <div className="cc-footer">
                    <span className="cc-avail">⚡ {cand.availability}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedItem(cand)}>
                        Inspect Profile
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => setZoomModalCandidate(cand)}>
                        📹 Zoom Interview
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* CANDIDATE DETAIL MODAL */}
        {selectedItem && (
          <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
            <div className="modal-card card fade-in" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>✕</button>

              <div className="modal-cand-head">
                <div className="cand-avatar" style={{ width: 56, height: 56, fontSize: 22 }}>
                  {selectedItem.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="modal-title" style={{ marginBottom: 4 }}>{selectedItem.name}</h2>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    {selectedItem.stream} • {selectedItem.specialization} • 📧 {selectedItem.email}
                  </div>
                  {selectedItem.jobTitle && (
                    <div style={{ color: '#f59e0b', fontSize: 13, marginTop: 4, fontWeight: 700 }}>
                      Applied Role: {selectedItem.jobTitle} ({selectedItem.company})
                    </div>
                  )}
                </div>
              </div>

              <div className="card" style={{ background: 'var(--bg-card-light)', padding: 18, marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Verified Assessment & Consistency Audit
                </h4>
                <div className="modal-audit-grid">
                  <div><strong>ML Score:</strong> <span className="text-gradient" style={{ fontSize: 18, fontWeight: 800 }}>{selectedItem.score || selectedItem.overallScore}/100</span></div>
                  <div><strong>Predicted Level:</strong> {selectedItem.level || selectedItem.predictedLevel}</div>
                  <div><strong>Learning Streak:</strong> <span style={{ color: '#f59e0b', fontWeight: 800 }}>🔥 {selectedItem.streak || 1} Days</span></div>
                  <div><strong>Application Status:</strong> <span className="badge badge-primary">{selectedItem.status || 'Active Candidate'}</span></div>
                </div>
              </div>

              {selectedItem.notes && (
                <div className="modal-section">
                  <h4>Candidate Application Note</h4>
                  <p style={{ background: 'var(--bg-card-light)', padding: 12, borderRadius: 'var(--radius)', fontSize: 14 }}>
                    "{selectedItem.notes}"
                  </p>
                </div>
              )}

              {selectedItem.domainScores && (
                <div className="modal-section">
                  <h4>ML Domain Scores Breakdown</h4>
                  <div className="modal-domain-bars">
                    {Object.entries(selectedItem.domainScores).map(([domain, score]) => (
                      <div key={domain} className="mdb-row">
                        <span className="mdb-label">{domain.replace(/_/g, ' ')}</span>
                        <div className="mdb-bar"><div className="mdb-fill" style={{ width: `${score}%` }} /></div>
                        <span className="mdb-val">{score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {selectedItem.applicationId && (
                  <button
                    className="btn btn-success"
                    style={{ flex: 1 }}
                    onClick={() => handleUpdateStatus(selectedItem.applicationId, 'Shortlisted')}
                  >
                    ★ Mark Shortlisted
                  </button>
                )}
                <button
                  className="btn btn-danger"
                  style={{ flex: 1.5 }}
                  onClick={() => {
                    const cand = selectedItem;
                    setSelectedItem(null);
                    setZoomModalCandidate(cand);
                  }}
                >
                  📹 Launch Zoom Interview Call
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ZOOM INTERVIEW MODAL */}
        {zoomModalCandidate && (
          <div className="modal-backdrop" onClick={() => setZoomModalCandidate(null)}>
            <div className="modal-card card fade-in" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setZoomModalCandidate(null)}>✕</button>
              <h2 className="modal-title">📹 Schedule & Launch Zoom Interview</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                Meet candidate <strong>{zoomModalCandidate.name}</strong> ({zoomModalCandidate.email}) for technical screening.
              </p>

              <div className="card" style={{ background: 'var(--bg-card-light)', padding: 18, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="badge badge-success">Zoom Room Configured</span>
                  <span style={{ fontSize: 13, color: '#f59e0b' }}>Candidate ML Score: {zoomModalCandidate.score || zoomModalCandidate.overallScore}/100</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Meeting ID: <strong>849 2019 3847</strong> • Passcode: <strong>RECRUIT2026</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <a
                  href="https://zoom.us/j/84920193847?pwd=UmVjcnVpdE1lZXQ="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  🚀 Open Zoom Call
                </a>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(`SkillSwap Interview Invitation for ${zoomModalCandidate.name}\nZoom Link: https://zoom.us/j/84920193847?pwd=UmVjcnVpdE1lZXQ=\nMeeting ID: 849 2019 3847\nPasscode: RECRUIT2026`);
                    setMessage(`📋 Zoom interview invitation copied for ${zoomModalCandidate.name}!`);
                    setTimeout(() => setMessage(''), 3500);
                  }}
                >
                  📋 Copy Invite
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
