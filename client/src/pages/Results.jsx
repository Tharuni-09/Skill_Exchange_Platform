import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';
import { Radar, Bar } from 'react-chartjs-2';
import './Results.css';

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend, CategoryScale, LinearScale, BarElement
);

const DOMAIN_LABELS = {
  analytical_reasoning:  'Analytical',
  problem_solving:       'Problem Solving',
  decision_making:       'Decision Making',
  attention_consistency: 'Attention',
  knowledge_recall:      'Knowledge'
};

const DOMAIN_ICONS = {
  analytical_reasoning:  '🔍',
  problem_solving:       '⚙️',
  decision_making:       '🎯',
  attention_consistency: '👁️',
  knowledge_recall:      '📚'
};

function ScoreRing({ score, level, levelLabel, levelColor }) {
  const circumference = 2 * Math.PI * 54;
  const dash = (score / 100) * circumference;

  return (
    <div className="score-ring-wrapper">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" strokeWidth="12" />
        <circle
          cx="70" cy="70" r="54" fill="none"
          stroke="url(#scoreGrad)" strokeWidth="12"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <text x="70" y="62" textAnchor="middle" fontSize="30" fontWeight="800" fill="#f1f5f9">{score}</text>
        <text x="70" y="82" textAnchor="middle" fontSize="13" fill="#94a3b8">/ 100</text>
      </svg>
      <div className="score-level" style={{ color: levelColor }}>{levelLabel}</div>
    </div>
  );
}

export default function Results() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const results   = location.state?.results;

  if (!results) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>No results found.</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '16px 0' }}>
          Please complete an assessment first.
        </p>
        <Link to="/assessment" className="btn btn-primary">Take Assessment</Link>
      </div>
    );
  }

  const { overallScore, predictedLevel, levelLabel, levelColor, confidence,
          domainScores, skillGaps, strengths, recommendations,
          accuracy, correctCount, totalQuestions, mentorSummary, difficultyLevel } = results;

  const domains    = Object.keys(domainScores);
  const domainVals = domains.map(d => domainScores[d]);

  // Radar chart
  const radarData = {
    labels: domains.map(d => DOMAIN_LABELS[d]),
    datasets: [{
      label: 'Your Score',
      data: domainVals,
      backgroundColor: 'rgba(99,102,241,0.2)',
      borderColor: '#6366f1',
      pointBackgroundColor: '#818cf8',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      borderWidth: 2
    }]
  };
  const radarOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      r: {
        min: 0, max: 100,
        ticks: { stepSize: 20, color: '#64748b', backdropColor: 'transparent' },
        grid: { color: '#334155' },
        pointLabels: { color: '#94a3b8', font: { size: 12 } }
      }
    }
  };

  // Bar chart
  const barData = {
    labels: domains.map(d => DOMAIN_LABELS[d]),
    datasets: [{
      label: 'Score',
      data: domainVals,
      backgroundColor: domainVals.map(v => v >= 75 ? 'rgba(16,185,129,0.7)' : v >= 50 ? 'rgba(99,102,241,0.7)' : 'rgba(239,68,68,0.7)'),
      borderRadius: 8,
      borderWidth: 0
    }]
  };
  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
      y: { min: 0, max: 100, grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', stepSize: 20 } }
    }
  };

  return (
    <div className="results-page">
      <div className="page-container">
        {/* Hero */}
        <div className="results-hero card fade-in">
          <div className="results-hero-left">
            <ScoreRing
              score={overallScore}
              level={predictedLevel}
              levelLabel={levelLabel}
              levelColor={levelColor}
            />
          </div>
          <div className="results-hero-right">
            <h1 className="results-title">Assessment Complete!</h1>
            <div className="results-stats">
              <div className="result-stat">
                <span className="result-stat-val">{correctCount}/{totalQuestions}</span>
                <span className="result-stat-label">Correct</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-val">{accuracy}%</span>
                <span className="result-stat-label">Accuracy</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-val">{confidence}%</span>
                <span className="result-stat-label">Confidence</span>
              </div>
              <div className="result-stat">
                <span className="result-stat-val">{difficultyLevel}</span>
                <span className="result-stat-label">Difficulty</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mentor Summary */}
        <div className="mentor-card card fade-in">
          <div className="mentor-header">
            <span className="mentor-avatar">🤖</span>
            <div>
              <p className="mentor-name">AI Mentor</p>
              <p className="mentor-role">Skill Assessment Agent</p>
            </div>
          </div>
          <p className="mentor-text">"{mentorSummary}"</p>
        </div>

        {/* Charts */}
        <div className="charts-grid">
          <div className="chart-card card fade-in">
            <h3 className="chart-title">Domain Radar</h3>
            <div className="chart-container">
              <Radar data={radarData} options={radarOptions} />
            </div>
          </div>
          <div className="chart-card card fade-in">
            <h3 className="chart-title">Domain Scores</h3>
            <div className="chart-container">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>

        {/* Domain score cards */}
        <div className="domain-scores-grid">
          {domains.map(d => {
            const val = domainScores[d];
            const color = val >= 75 ? '#10b981' : val >= 50 ? '#6366f1' : '#ef4444';
            return (
              <div key={d} className="domain-score-card card fade-in">
                <div className="domain-score-header">
                  <span className="domain-score-icon">{DOMAIN_ICONS[d]}</span>
                  <span className="domain-score-name">{DOMAIN_LABELS[d]}</span>
                </div>
                <div className="domain-score-bar-wrap">
                  <div className="domain-score-bar" style={{ width: `${val}%`, background: color }} />
                </div>
                <span className="domain-score-val" style={{ color }}>{val}/100</span>
              </div>
            );
          })}
        </div>

        {/* Strengths & Gaps */}
        <div className="sg-grid">
          <div className="card fade-in">
            <h3 style={{ marginBottom: 16, color: '#10b981' }}>💪 Strengths</h3>
            {strengths.length > 0 ? (
              <div className="sg-list">
                {strengths.map(s => (
                  <span key={s} className="sg-chip strength">{s}</span>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Keep practicing to build strengths!</p>
            )}
          </div>
          <div className="card fade-in">
            <h3 style={{ marginBottom: 16, color: '#ef4444' }}>🎯 Skill Gaps</h3>
            {skillGaps.length > 0 ? (
              <div className="sg-list">
                {skillGaps.map(g => (
                  <span key={g} className="sg-chip gap">{g}</span>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No major skill gaps detected! 🎉</p>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="recommendations card fade-in">
            <h3 className="section-title">📋 Improvement Recommendations</h3>
            <div className="rec-grid">
              {recommendations.map(rec => (
                <div key={rec.domain} className="rec-card">
                  <div className="rec-header">
                    <span className="rec-domain">{rec.domain}</span>
                    <span className="rec-score badge badge-danger">{rec.score}/100</span>
                  </div>
                  <div className="rec-skills">
                    {rec.skills.map(s => (
                      <span key={s} className="rec-skill-tag">{s}</span>
                    ))}
                  </div>
                  <ul className="rec-resources">
                    {rec.resources.map((r, i) => (
                      <li key={i}>→ {r}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="results-actions">
          <button onClick={() => navigate('/assessment')} className="btn btn-primary">
            🔄 Take Another Assessment
          </button>
          <Link to="/leaderboard" className="btn btn-secondary">
            🏆 View Leaderboard
          </Link>
          <Link to="/history" className="btn btn-secondary">
            📋 My History
          </Link>
        </div>
      </div>
    </div>
  );
}
