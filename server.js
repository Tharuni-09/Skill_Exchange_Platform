import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { selectQuestions, verifyAnswer, computeResults } from './server/ml/assessmentEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve React build in production
app.use(express.static(path.join(__dirname, 'client/dist')));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'skillswap.db');
const db = new DatabaseSync(dbPath);

// Setup database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'Student',
    stream TEXT,
    specialization TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT,
    stream TEXT,
    specialization TEXT,
    overall_score INTEGER NOT NULL,
    predicted_level TEXT,
    confidence INTEGER,
    analytical_reasoning INTEGER,
    problem_solving INTEGER,
    decision_making INTEGER,
    attention_consistency INTEGER,
    knowledge_recall INTEGER,
    skill_gaps TEXT,
    difficulty_level TEXT,
    streaks INTEGER DEFAULT 1,
    mentor_summary TEXT,
    assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// In-memory session store for active assessments
const sessions = new Map();

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, stream, specialization } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, stream, specialization)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(name, email, password_hash, role || 'Student', stream || '', specialization || '');

    res.status(201).json({
      message: 'Registration successful',
      user: { id: result.lastInsertRowid, name, email, role: role || 'Student', stream, specialization }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        stream: user.stream,
        specialization: user.specialization
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user by email
app.get('/api/auth/me', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = db.prepare('SELECT id, name, email, role, stream, specialization FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ==================== ML ASSESSMENT ROUTES ====================

// Start assessment session — returns questions only (no answers)
app.post('/api/assessment/start', (req, res) => {
  try {
    const { email, name, stream, role, specialization } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const userProfile = { email, name, stream: stream || 'all', role: role || 'Student', specialization };
    const questions = selectQuestions(userProfile, 10);

    // Create session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessions.set(sessionId, {
      userProfile,
      questions,          // full questions WITH answers (server-side only)
      answers: [],
      startTime: Date.now(),
      currentIndex: 0
    });

    // Return questions WITHOUT answers
    res.json({
      sessionId,
      totalQuestions: questions.length,
      firstQuestion: {
        index: 0,
        total: questions.length,
        ...questions[0]
      }
    });
  } catch (err) {
    console.error('Start assessment error:', err);
    res.status(500).json({ error: 'Failed to start assessment' });
  }
});

// Get a specific question by index
app.get('/api/assessment/question/:sessionId/:index', (req, res) => {
  const { sessionId, index } = req.params;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  const idx = parseInt(index);
  if (idx < 0 || idx >= session.questions.length) {
    return res.status(400).json({ error: 'Invalid question index' });
  }

  const q = session.questions[idx];
  res.json({
    index: idx,
    total: session.questions.length,
    id: q.id,
    domain: q.domain,
    difficulty: q.difficulty,
    text: q.text,
    options: q.options
  });
});

// Submit answer for a question
app.post('/api/assessment/answer', (req, res) => {
  const { sessionId, questionId, selectedIndex } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  // Verify answer using ML engine
  const result = verifyAnswer(questionId, selectedIndex);

  // Store answer in session
  session.answers.push({
    questionId,
    selectedIndex,
    correct: result.correct,
    score: result.score,
    domain: result.domain
  });

  const nextIndex = session.currentIndex + 1;
  session.currentIndex = nextIndex;
  const hasMore = nextIndex < session.questions.length;

  res.json({
    correct: result.correct,
    correctAnswer: result.correctAnswer,
    correctOptionText: result.correctOptionText,
    explanation: result.explanation,
    domain: result.domain,
    difficulty: result.difficulty,
    score: result.score,
    questionNumber: session.answers.length,
    hasNextQuestion: hasMore,
    nextIndex: hasMore ? nextIndex : null
  });
});

// Finalize assessment and get results
app.post('/api/assessment/finalize', async (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  try {
    const evaluation = computeResults(session.answers, session.userProfile);

    // Save to database
    const { userProfile } = session;
    try {
      const stmt = db.prepare(`
        INSERT INTO assessments (
          user_email, user_name, user_role, stream, specialization,
          overall_score, predicted_level, confidence,
          analytical_reasoning, problem_solving, decision_making,
          attention_consistency, knowledge_recall,
          skill_gaps, difficulty_level, mentor_summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        userProfile.email,
        userProfile.name,
        userProfile.role,
        userProfile.stream,
        userProfile.specialization,
        evaluation.overallScore,
        evaluation.predictedLevel,
        evaluation.confidence,
        evaluation.domainScores.analytical_reasoning,
        evaluation.domainScores.problem_solving,
        evaluation.domainScores.decision_making,
        evaluation.domainScores.attention_consistency,
        evaluation.domainScores.knowledge_recall,
        JSON.stringify(evaluation.skillGaps),
        evaluation.difficultyLevel,
        evaluation.mentorSummary
      );
    } catch (dbErr) {
      console.error('DB save error:', dbErr);
      // Don't fail the response — return results even if DB save fails
    }

    // Clean up session
    sessions.delete(sessionId);

    res.json(evaluation);
  } catch (err) {
    console.error('Finalize error:', err);
    res.status(500).json({ error: 'Failed to compute results' });
  }
});

// ==================== LEADERBOARD & HISTORY ====================

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT user_name as name, user_email as email, 
             MAX(overall_score) as best_score, predicted_level as level,
             COUNT(*) as attempts
      FROM assessments
      GROUP BY user_email
      ORDER BY best_score DESC
      LIMIT 20
    `).all();
    res.json(rows);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Assessment history for a user
app.get('/api/assessments', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const rows = db.prepare(`
      SELECT * FROM assessments 
      WHERE user_email = ? 
      ORDER BY assessment_date DESC 
      LIMIT 20
    `).all(email);
    res.json(rows.map(r => ({
      ...r,
      skill_gaps: r.skill_gaps ? JSON.parse(r.skill_gaps) : []
    })));
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Catch-all: serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 SkillSwap Server running on port ${PORT}`);
  console.log(`   ML Assessment Engine: ACTIVE`);
  console.log(`   Question Bank loaded from: server/data/questions.json\n`);
});
