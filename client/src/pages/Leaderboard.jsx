import React, { useEffect, useState } from 'react';
import './Leaderboard.css';

const MEDALS = ['🥇', '🥈', '🥉'];
const LEVEL_COLORS = {
  Expert:       '#f59e0b',
  Advanced:     '#10b981',
  Intermediate: '#6366f1',
  Beginner:     '#6b7280'
};

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => { setLeaders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Failed to load leaderboard.'); setLoading(false); });
  }, []);

  return (
    <div className="leaderboard-page">
      <div className="page-container">
        <div className="lb-header">
          <h1 className="section-title">🏆 Leaderboard</h1>
          <p className="lb-subtitle">Top performers based on their best assessment score</p>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : error ? (
          <div className="error-msg">{error}</div>
        ) : leaders.length === 0 ? (
          <div className="lb-empty card">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <h3>No scores yet</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Be the first to complete an assessment!</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {leaders.length >= 3 && (
              <div className="podium">
                {[leaders[1], leaders[0], leaders[2]].map((l, i) => {
                  const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
                  return (
                    <div key={l.email} className={`podium-slot rank-${rank}`}>
                      <div className="podium-avatar">{l.name?.charAt(0)?.toUpperCase()}</div>
                      <div className="podium-name">{l.name}</div>
                      <div className="podium-score">{l.best_score}</div>
                      <div className="podium-medal">{MEDALS[rank - 1]}</div>
                      <div className="podium-block" style={{ height: 40 + (3 - rank) * 24 }} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full Table */}
            <div className="lb-table card">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Level</th>
                    <th>Best Score</th>
                    <th>Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {leaders.map((l, i) => (
                    <tr key={l.email} className={i < 3 ? 'top-row' : ''}>
                      <td className="rank-cell">
                        {i < 3 ? MEDALS[i] : `#${i + 1}`}
                      </td>
                      <td className="name-cell">
                        <div className="lb-avatar">{l.name?.charAt(0)?.toUpperCase()}</div>
                        <div>
                          <div className="lb-name">{l.name}</div>
                          <div className="lb-email">{l.email}</div>
                        </div>
                      </td>
                      <td>
                        <span className="level-badge" style={{ color: LEVEL_COLORS[l.level] || '#94a3b8' }}>
                          {l.level || '—'}
                        </span>
                      </td>
                      <td className="score-cell">
                        <span className="lb-score">{l.best_score}</span>
                        <span className="lb-score-denom">/100</span>
                      </td>
                      <td className="attempts-cell">{l.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
