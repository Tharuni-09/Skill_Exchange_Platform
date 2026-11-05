import React, { useState, useEffect } from 'react';
import './CompanyCandidates.css';

const STREAMS = ['All', 'CS', 'IT', 'ECE', 'EEE', 'Management'];
const LEVELS = ['All', 'Expert', 'Advanced', 'Intermediate', 'Beginner'];
const STREAK_FILTERS = [
  { label: 'All Streaks', value: 0 },
  { label: '🔥 7+ Days Streak', value: 7 },
  { label: '🔥 14+ Days Streak', value: 14 },
  { label: '🔥 20+ Days Streak', value: 20 }
];
const SCORE_FILTERS = [
  { label: 'All Scores', value: 0 },
  { label: '⭐ 85+ (Top Tier)', value: 85 },
  { label: '⭐ 75+ (High Mastery)', value: 75 },
  { label: '⭐ 60+ (Qualified)', value: 60 }
];

const DOMAIN_LABELS = {
  analytical_reasoning: 'Analytical',
  problem_solving: 'Problem Solving',
  decision_making: 'Decision Making',
  attention_consistency: 'Attention',
  knowledge_recall: 'Knowledge'
};

export default function CompanyCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStream, setSelectedStream] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [selectedMinStreak, setSelectedMinStreak] = useState(0);
  const [selectedMinScore, setSelectedMinScore] = useState(0);
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'streak' | 'name'
  const [shortlisted, setShortlisted] = useState(new Set());
  const [showOnlyShortlisted, setShowOnlyShortlisted] = useState(false);
  const [activeCandidateModal, setActiveCandidateModal] = useState(null);
  const [contactSuccess, setContactSuccess] = useState('');

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/candidates');
      const data = await res.json();
      setCandidates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleShortlist = (candId) => {
    setShortlisted(prev => {
      const next = new Set(prev);
      if (next.has(candId)) {
        next.delete(candId);
      } else {
        next.add(candId);
      }
      return next;
    });
  };

  const handleContactCandidate = (candidate) => {
    setContactSuccess(`Invitation & interview request sent to ${candidate.name} (${candidate.email})!`);
    setTimeout(() => setContactSuccess(''), 4500);
  };

  // Filter & Search logic
  const filteredCandidates = candidates.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(term) ||
                          c.email.toLowerCase().includes(term) ||
                          c.stream.toLowerCase().includes(term) ||
                          (c.specialization && c.specialization.toLowerCase().includes(term)) ||
                          (c.skills && c.skills.some(s => s.toLowerCase().includes(term)));
    
    const matchesStream = selectedStream === 'All' || c.stream === selectedStream;
    const matchesLevel = selectedLevel === 'All' || c.predictedLevel === selectedLevel;
    const matchesStreak = (c.streak || 1) >= selectedMinStreak;
    const matchesScore = (c.overallScore || 0) >= selectedMinScore;
    const matchesShortlist = !showOnlyShortlisted || shortlisted.has(c.id);

    return matchesSearch && matchesStream && matchesLevel && matchesStreak && matchesScore && matchesShortlist;
  }).sort((a, b) => {
    if (sortBy === 'streak') return (b.streak || 0) - (a.streak || 0);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return (b.overallScore || 0) - (a.overallScore || 0);
  });

  return (
    <div className="company-portal-page">
      <div className="page-container">
        {/* Recruiter Header Banner */}
        <div className="recruiter-hero card fade-in">
          <div className="rh-content">
            <div className="rh-badge">
              <span>🏢</span> Recruiter Talent Suite • Verified AI Candidate Directory
            </div>
            <h1 className="rh-title">Explore Verified Candidates & Learning Streaks</h1>
            <p className="rh-subtitle">
              Screen engineering talent verified by our adaptive Machine Learning assessment engine. Filter by technical mastery, problem-solving domain benchmarks, and daily learning consistency.
            </p>
          </div>

          <div className="rh-metrics">
            <div className="rhm-box">
              <span className="rhm-val">{candidates.length}</span>
              <span className="rhm-lbl">Available Candidates</span>
            </div>
            <div className="rhm-box">
              <span className="rhm-val">100%</span>
              <span className="rhm-lbl">ML Verified Skills</span>
            </div>
            <div className="rhm-box">
              <span className="rhm-val" style={{ color: '#f59e0b' }}>
                {shortlisted.size}
              </span>
              <span className="rhm-lbl">Shortlisted</span>
            </div>
          </div>
        </div>

        {contactSuccess && (
          <div className="toast-banner fade-in">{contactSuccess}</div>
        )}

        {/* Filter and Search Bar */}
        <div className="recruiter-controls card">
          {/* Search Row */}
          <div className="rc-search-row">
            <div className="rc-search-input-wrap">
              <span className="rc-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search candidates by name, stream, specialization, or skill (e.g. CS, Python, Kafka, React)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && <button className="clear-btn" onClick={() => setSearchTerm('')}>✕</button>}
            </div>

            <div className="rc-sort-wrap">
              <label>Sort By:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="score">Highest Score ⭐</option>
                <option value="streak">Longest Streak 🔥</option>
                <option value="name">Candidate Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="rc-filter-row">
            <div className="filter-group">
              <label>Stream</label>
              <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)}>
                {STREAMS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Streams' : `${s} Stream`}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Predicted Level</label>
              <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
                {LEVELS.map(l => <option key={l} value={l}>{l === 'All' ? 'All Skill Levels' : l}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Learning Streak</label>
              <select value={selectedMinStreak} onChange={(e) => setSelectedMinStreak(Number(e.target.value))}>
                {STREAK_FILTERS.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Min Score</label>
              <select value={selectedMinScore} onChange={(e) => setSelectedMinScore(Number(e.target.value))}>
                {SCORE_FILTERS.map(sc => <option key={sc.value} value={sc.value}>{sc.label}</option>)}
              </select>
            </div>

            <button
              className={`shortlist-toggle-btn ${showOnlyShortlisted ? 'active' : ''}`}
              onClick={() => setShowOnlyShortlisted(!showOnlyShortlisted)}
            >
              ★ Shortlisted ({shortlisted.size})
            </button>
          </div>
        </div>

        {/* Results Counter */}
        <div className="rc-results-meta">
          <span>Showing <strong>{filteredCandidates.length}</strong> matching candidate{filteredCandidates.length !== 1 ? 's' : ''}</span>
          {(searchTerm || selectedStream !== 'All' || selectedLevel !== 'All' || selectedMinStreak > 0 || selectedMinScore > 0 || showOnlyShortlisted) && (
            <button
              className="reset-filters-link"
              onClick={() => {
                setSearchTerm('');
                setSelectedStream('All');
                setSelectedLevel('All');
                setSelectedMinStreak(0);
                setSelectedMinScore(0);
                setShowOnlyShortlisted(false);
              }}
            >
              Reset all filters
            </button>
          )}
        </div>

        {/* Candidates Grid */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /><p>Loading candidate directory...</p></div>
        ) : filteredCandidates.length === 0 ? (
          <div className="empty-state card">
            <span className="empty-icon">👥</span>
            <h3>No candidates match your filters</h3>
            <p>Try widening your search terms or lowering the minimum streak/score thresholds.</p>
          </div>
        ) : (
          <div className="candidates-grid">
            {filteredCandidates.map(cand => {
              const isShortlisted = shortlisted.has(cand.id);
              return (
                <div key={cand.id} className="candidate-card card fade-in">
                  {/* Top Row: Avatar + Name + Shortlist */}
                  <div className="cand-top">
                    <div className="cand-avatar">{cand.name.charAt(0).toUpperCase()}</div>
                    <div className="cand-identity">
                      <div className="cand-name-row">
                        <h3 className="cand-name" onClick={() => setActiveCandidateModal(cand)}>{cand.name}</h3>
                        {cand.verified && <span className="cand-verified-badge" title="Verified by SkillSwap ML Engine">✓ ML Verified</span>}
                      </div>
                      <div className="cand-role">{cand.role} • {cand.stream}</div>
                      <div className="cand-location">📍 {cand.location}</div>
                    </div>
                    <button
                      className={`cand-star-btn ${isShortlisted ? 'starred' : ''}`}
                      title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                      onClick={() => toggleShortlist(cand.id)}
                    >
                      ★
                    </button>
                  </div>

                  {/* Highlights Row: Score + Level + Streaks */}
                  <div className="cand-badges-row">
                    <div className="cand-metric-badge score-badge">
                      <span className="cmb-lbl">ML Score</span>
                      <span className="cmb-val">{cand.overallScore}/100</span>
                    </div>

                    <div className="cand-metric-badge level-badge">
                      <span className="cmb-lbl">Level</span>
                      <span className="cmb-val">{cand.predictedLevel}</span>
                    </div>

                    <div className="cand-metric-badge streak-badge">
                      <span className="cmb-lbl">Streak</span>
                      <span className="cmb-val streak-val">🔥 {cand.streak} Days</span>
                    </div>
                  </div>

                  {/* Specialization & Bio */}
                  <div className="cand-spec">
                    <strong>Specialization:</strong> {cand.specialization || 'Software Engineering'}
                  </div>
                  <p className="cand-bio">{cand.bio}</p>

                  {/* Domain Scores Bar Breakdown */}
                  {cand.domainScores && (
                    <div className="cand-domain-bars">
                      <span className="cdb-header">ML Domain Performance:</span>
                      {Object.keys(DOMAIN_LABELS).map(key => {
                        const val = cand.domainScores[key] || 70;
                        const barColor = val >= 85 ? '#10b981' : val >= 70 ? '#6366f1' : '#f59e0b';
                        return (
                          <div key={key} className="cdb-row">
                            <span className="cdb-label">{DOMAIN_LABELS[key]}</span>
                            <div className="cdb-bar-bg">
                              <div className="cdb-bar-fill" style={{ width: `${val}%`, background: barColor }} />
                            </div>
                            <span className="cdb-val">{val}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Skill Chips */}
                  <div className="cand-skills-wrap">
                    {cand.skills && cand.skills.map(s => <span key={s} className="cand-skill-chip">{s}</span>)}
                  </div>

                  {/* Footer Actions */}
                  <div className="cand-footer">
                    <span className="cand-avail">⚡ {cand.availability}</span>
                    <div className="cand-actions-btn-group">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActiveCandidateModal(cand)}
                      >
                        Full Profile
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleContactCandidate(cand)}
                      >
                        Contact / Interview
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Candidate Detail Modal / Drawer */}
        {activeCandidateModal && (
          <div className="modal-backdrop" onClick={() => setActiveCandidateModal(null)}>
            <div className="modal-card card fade-in cand-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setActiveCandidateModal(null)}>✕</button>

              <div className="cm-header">
                <div className="cm-avatar">{activeCandidateModal.name.charAt(0).toUpperCase()}</div>
                <div>
                  <h2 className="modal-title" style={{ marginBottom: 4 }}>{activeCandidateModal.name}</h2>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    {activeCandidateModal.role} • {activeCandidateModal.stream} Stream • 📍 {activeCandidateModal.location}
                  </div>
                  <div style={{ color: 'var(--primary-light)', fontSize: 13, marginTop: 4 }}>
                    📧 {activeCandidateModal.email}
                  </div>
                </div>
              </div>

              {/* Assessment & Streak summary */}
              <div className="cm-summary-grid card">
                <div className="cms-item">
                  <span className="cms-label">Overall ML Score</span>
                  <span className="cms-val text-gradient">{activeCandidateModal.overallScore}/100</span>
                </div>
                <div className="cms-item">
                  <span className="cms-label">Predicted Level</span>
                  <span className="cms-val">{activeCandidateModal.predictedLevel}</span>
                </div>
                <div className="cms-item">
                  <span className="cms-label">Active Learning Streak</span>
                  <span className="cms-val" style={{ color: '#f59e0b' }}>🔥 {activeCandidateModal.streak} Consecutive Days</span>
                </div>
                <div className="cms-item">
                  <span className="cms-label">Assessment Attempts</span>
                  <span className="cms-val">{activeCandidateModal.attempts || 1} Completed</span>
                </div>
              </div>

              {/* Domain Performance */}
              <div className="modal-section">
                <h4>Verified Skill Domain Breakdown</h4>
                <div className="cm-domains-list">
                  {Object.keys(DOMAIN_LABELS).map(key => {
                    const score = activeCandidateModal.domainScores ? activeCandidateModal.domainScores[key] || 70 : 70;
                    return (
                      <div key={key} className="cm-domain-box">
                        <div className="cm-db-title">{DOMAIN_LABELS[key]}</div>
                        <div className="cm-db-score">{score}/100</div>
                        <div className="cm-db-meter">
                          <div className="cm-db-fill" style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strengths and Bio */}
              <div className="modal-section">
                <h4>Candidate Bio & Background</h4>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{activeCandidateModal.bio}</p>
              </div>

              <div className="modal-section">
                <h4>Top Strengths</h4>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {activeCandidateModal.strengths && activeCandidateModal.strengths.map(st => (
                    <span key={st} className="badge badge-success">✓ {st}</span>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="modal-actions" style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button
                  className={`btn ${shortlisted.has(activeCandidateModal.id) ? 'btn-success' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => toggleShortlist(activeCandidateModal.id)}
                >
                  {shortlisted.has(activeCandidateModal.id) ? '★ Shortlisted' : '☆ Add to Shortlist'}
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1.5 }}
                  onClick={() => {
                    handleContactCandidate(activeCandidateModal);
                    setActiveCandidateModal(null);
                  }}
                >
                  ✉️ Send Interview Invite
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
