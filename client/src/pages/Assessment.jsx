import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Assessment.css';

const DOMAIN_LABELS = {
  analytical_reasoning:  '🔍 Analytical Reasoning',
  problem_solving:       '⚙️ Problem Solving',
  decision_making:       '🎯 Decision Making',
  attention_consistency: '👁️ Attention & Consistency',
  knowledge_recall:      '📚 Knowledge Recall'
};

const DIFFICULTY_BADGES = {
  easy:   { label: 'Easy',   color: '#10b981' },
  medium: { label: 'Medium', color: '#f59e0b' },
  hard:   { label: 'Hard',   color: '#ef4444' }
};

export default function Assessment() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // States
  const [phase, setPhase]             = useState('intro');   // intro | loading | question | feedback | finalizing
  const [sessionId, setSessionId]     = useState(null);
  const [question, setQuestion]       = useState(null);
  const [qIndex, setQIndex]           = useState(0);
  const [totalQ, setTotalQ]           = useState(10);
  const [selected, setSelected]       = useState(null);
  const [feedback, setFeedback]       = useState(null);
  const [score, setScore]             = useState(0);
  const [correct, setCorrect]         = useState(0);
  const [error, setError]             = useState('');
  const [answerHistory, setAnswerHistory] = useState([]);

  // Start session
  const startAssessment = async () => {
    setPhase('loading');
    setError('');
    try {
      const res = await fetch('/api/assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          stream: user.stream || 'all',
          role: user.role,
          specialization: user.specialization
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSessionId(data.sessionId);
      setTotalQ(data.totalQuestions);
      setQuestion(data.firstQuestion);
      setQIndex(0);
      setScore(0);
      setCorrect(0);
      setAnswerHistory([]);
      setPhase('question');
    } catch (err) {
      setError('Failed to start assessment: ' + err.message);
      setPhase('intro');
    }
  };

  // Submit answer
  const submitAnswer = async () => {
    if (selected === null) return;
    setPhase('loading');
    try {
      const res = await fetch('/api/assessment/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: question.id,
          selectedIndex: selected
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFeedback(data);
      setScore(s => s + (data.score || 0));
      if (data.correct) setCorrect(c => c + 1);
      setAnswerHistory(h => [...h, { ...data, questionText: question.text, selectedIndex: selected }]);
      setPhase('feedback');
    } catch (err) {
      setError('Error submitting answer: ' + err.message);
      setPhase('question');
    }
  };

  // Next question or finalize
  const handleNext = async () => {
    if (!feedback) return;
    if (!feedback.hasNextQuestion) {
      await finalizeAssessment();
      return;
    }
    setPhase('loading');
    setSelected(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/assessment/question/${sessionId}/${feedback.nextIndex}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestion(data);
      setQIndex(feedback.nextIndex);
      setPhase('question');
    } catch (err) {
      setError('Failed to load next question: ' + err.message);
      setPhase('question');
    }
  };

  // Finalize assessment
  const finalizeAssessment = async () => {
    setPhase('finalizing');
    try {
      const res = await fetch('/api/assessment/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate('/results', { state: { results: data } });
    } catch (err) {
      setError('Failed to finalize: ' + err.message);
      setPhase('feedback');
    }
  };

  // ============ RENDER ============

  if (phase === 'intro') {
    return (
      <div className="assessment-page">
        <div className="page-container">
          <div className="assessment-intro card fade-in">
            <div className="intro-icon">🧠</div>
            <h1 className="intro-title">Skill Assessment</h1>
            <p className="intro-desc">
              Our ML engine will select <strong>10 adaptive questions</strong> across 5 skill domains
              based on your profile. Answer honestly for the most accurate results.
            </p>

            <div className="intro-domains">
              {Object.entries(DOMAIN_LABELS).map(([k, v]) => (
                <div key={k} className="intro-domain-chip">{v}</div>
              ))}
            </div>

            <div className="intro-rules">
              <div className="rule-item">⏱️ No time limit — take your time</div>
              <div className="rule-item">📝 10 questions, multiple choice</div>
              <div className="rule-item">🔄 Each answer is verified immediately</div>
              <div className="rule-item">📊 Detailed results with skill gap analysis</div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button className="btn btn-primary intro-btn" onClick={startAssessment}>
              Start Assessment →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="assessment-page">
        <div className="loading-spinner" style={{ minHeight: '60vh' }}>
          <div className="spinner" />
          <p>ML Engine is working...</p>
        </div>
      </div>
    );
  }

  if (phase === 'finalizing') {
    return (
      <div className="assessment-page">
        <div className="loading-spinner" style={{ minHeight: '60vh' }}>
          <div className="spinner" />
          <p style={{ fontSize: 18, fontWeight: 600 }}>Analyzing your results...</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Computing skill levels and generating insights</p>
        </div>
      </div>
    );
  }

  if (phase === 'question' && question) {
    const diffBadge = DIFFICULTY_BADGES[question.difficulty] || DIFFICULTY_BADGES.medium;
    const progress = ((qIndex) / totalQ) * 100;

    return (
      <div className="assessment-page">
        <div className="page-container">
          {/* Progress */}
          <div className="q-progress-bar">
            <div className="q-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* Top meta */}
          <div className="q-meta">
            <span className="q-counter">Question {qIndex + 1} of {totalQ}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="q-domain">{DOMAIN_LABELS[question.domain] || question.domain}</span>
              <span className="badge" style={{ background: diffBadge.color + '25', color: diffBadge.color }}>
                {diffBadge.label}
              </span>
            </div>
          </div>

          {/* Score tracker */}
          <div className="q-score-row">
            <span className="score-pill">✅ Correct: {correct}</span>
            <span className="score-pill">⭐ Score: {score}</span>
          </div>

          {/* Question card */}
          <div className="question-card card fade-in">
            <p className="question-text">{question.text}</p>

            <div className="options-list">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  className={`option-btn ${selected === i ? 'selected' : ''}`}
                  onClick={() => setSelected(i)}
                >
                  <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="option-text">{opt}</span>
                </button>
              ))}
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button
              className="btn btn-primary submit-btn"
              onClick={submitAnswer}
              disabled={selected === null}
            >
              Submit Answer →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'feedback' && feedback) {
    const isLast = !feedback.hasNextQuestion;
    return (
      <div className="assessment-page">
        <div className="page-container">
          {/* Progress */}
          <div className="q-progress-bar">
            <div className="q-progress-fill" style={{ width: `${((qIndex + 1) / totalQ) * 100}%` }} />
          </div>

          {/* Feedback card */}
          <div className={`feedback-card card fade-in ${feedback.correct ? 'correct' : 'incorrect'}`}>
            <div className="feedback-icon">
              {feedback.correct ? '✅' : '❌'}
            </div>
            <h2 className="feedback-title">
              {feedback.correct ? 'Correct!' : 'Incorrect'}
            </h2>

            {!feedback.correct && (
              <div className="correct-answer-box">
                <span className="correct-label">Correct Answer:</span>
                <span className="correct-text">
                  {String.fromCharCode(65 + feedback.correctAnswer)}. {feedback.correctOptionText}
                </span>
              </div>
            )}

            <div className="explanation-box">
              <span className="explanation-label">📖 Explanation</span>
              <p>{feedback.explanation}</p>
            </div>

            <div className="feedback-meta">
              <span>Domain: {DOMAIN_LABELS[feedback.domain] || feedback.domain}</span>
              <span>+{feedback.score} pts</span>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button
              className={`btn ${isLast ? 'btn-success' : 'btn-primary'} submit-btn`}
              onClick={handleNext}
            >
              {isLast ? '📊 View Results' : 'Next Question →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
