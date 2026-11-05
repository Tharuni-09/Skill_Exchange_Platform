import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'skillswap.db');
const db = new DatabaseSync(dbPath);

// Create database tables
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
    assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- AUTHENTICATION APIS ---

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role, stream, specialization } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const existing = checkStmt.get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const insertStmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, stream, specialization)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = insertStmt.run(
      name.trim(),
      email.toLowerCase().trim(),
      password_hash,
      role || 'Student',
      stream || '',
      specialization || ''
    );

    const user = {
      id: Number(info.lastInsertRowid),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role || 'Student',
      stream: stream || '',
      specialization: specialization || ''
    };

    return res.status(201).json({ success: true, user, message: 'Account created successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      stream: user.stream,
      specialization: user.specialization,
      created_at: user.created_at
    };

    return res.json({ success: true, user: safeUser, message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// --- ASSESSMENT APIS ---

// Save assessment result
app.post('/api/assessments', (req, res) => {
  try {
    const data = req.body;
    if (!data.user_email || data.overall_score === undefined) {
      return res.status(400).json({ error: 'user_email and overall_score are required' });
    }

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM assessments WHERE user_email = ?');
    const pastCount = countStmt.get(data.user_email.toLowerCase().trim())?.count || 0;
    const streak = pastCount + 1;

    const stmt = db.prepare(`
      INSERT INTO assessments (
        user_email, user_name, user_role, stream, specialization,
        overall_score, predicted_level, confidence,
        analytical_reasoning, problem_solving, decision_making,
        attention_consistency, knowledge_recall, skill_gaps,
        difficulty_level, streaks, assessment_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.user_email.toLowerCase().trim(),
      data.user_name || '',
      data.user_role || '',
      data.stream || '',
      data.specialization || '',
      Number(data.overall_score) || 0,
      data.predicted_level || 'Intermediate',
      Number(data.confidence) || 80,
      Number(data.analytical_reasoning) || 0,
      Number(data.problem_solving) || 0,
      Number(data.decision_making) || 0,
      Number(data.attention_consistency) || 0,
      Number(data.knowledge_recall) || 0,
      data.skill_gaps || 'None',
      data.difficulty_level || 'medium',
      streak,
      new Date().toISOString()
    );

    return res.status(201).json({ success: true, id: Number(info.lastInsertRowid), streaks: streak });
  } catch (err) {
    console.error('Save assessment error:', err);
    return res.status(500).json({ error: 'Failed to save assessment' });
  }
});

// Get assessments by email or all
app.get('/api/assessments', (req, res) => {
  try {
    const { email } = req.query;
    let records = [];
    if (email) {
      const stmt = db.prepare('SELECT * FROM assessments WHERE user_email = ? ORDER BY id ASC');
      records = stmt.all(email.toLowerCase().trim());
    } else {
      const stmt = db.prepare('SELECT * FROM assessments ORDER BY id DESC LIMIT 100');
      records = stmt.all();
    }
    return res.json({ success: true, data: records });
  } catch (err) {
    console.error('Fetch assessments error:', err);
    return res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// Dynamic Leaderboard
app.get('/api/leaderboard', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT user_name as name, MAX(overall_score) as score, predicted_level as level, MAX(streaks) as streak
      FROM assessments
      GROUP BY user_email
      ORDER BY score DESC
      LIMIT 20
    `);
    const rows = stmt.all();
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Serve frontend static files
app.use(express.static(__dirname));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 SkillSwap Backend Server running on port ${PORT}`);
});
