import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { selectQuestions, verifyAnswer, computeResults, getMLModelMetadata } from './server/ml/assessmentEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve React build in production
app.use(express.static(path.join(__dirname, 'client/dist')));

// Load mock datasets
function loadJson(filePath, defaultData) {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Failed to load ${filePath}:`, err);
  }
  return defaultData;
}

const classesData = loadJson(path.join(__dirname, 'server/data/classes.json'), { classes: [] });
const opportunitiesData = loadJson(path.join(__dirname, 'server/data/opportunities.json'), { opportunities: [] });
const seedCandidatesData = loadJson(path.join(__dirname, 'server/data/candidates.json'), { candidates: [] });
const friendsData = loadJson(path.join(__dirname, 'server/data/friends.json'), { friends: [] });

// Initialize SQLite database
const dbPath = path.join(__dirname, 'skillswap.db');
const db = new DatabaseSync(dbPath);

// Setup database tables with full audit history
const DB_SCHEMAS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'Student',
    stream TEXT,
    specialization TEXT,
    target_topic TEXT,
    streak INTEGER DEFAULT 1,
    last_active DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'SUCCESS',
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT,
    stream TEXT,
    specialization TEXT,
    target_topic TEXT,
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
  )`,
  `CREATE TABLE IF NOT EXISTS class_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    class_id TEXT NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS class_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT,
    class_id TEXT NOT NULL,
    class_title TEXT NOT NULL,
    instructor_name TEXT,
    zoom_joined BOOLEAN DEFAULT 1,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT DEFAULT 'Attended',
    attended_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS job_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    company_name TEXT,
    job_title TEXT,
    score INTEGER,
    level TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Under Review',
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS timetable_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration TEXT NOT NULL,
    type TEXT DEFAULT 'Study Session',
    zoom_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS friend_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT DEFAULT 'connected',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
];

DB_SCHEMAS.forEach(schema => {
  try {
    db.exec(schema);
  } catch (err) {
    console.error('Table init error:', err);
  }
});
console.log('✓ SQLite Database tables verified and initialized.');

// Safe column updates for existing database instances
try { db.exec(`ALTER TABLE users ADD COLUMN streak INTEGER DEFAULT 1;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN last_active DATE;`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN target_topic TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE assessments ADD COLUMN target_topic TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE job_applications ADD COLUMN status TEXT DEFAULT 'Under Review';`); } catch (e) {}
try { db.exec(`ALTER TABLE job_applications ADD COLUMN company_name TEXT;`); } catch (e) {}
try { db.exec(`ALTER TABLE job_applications ADD COLUMN job_title TEXT;`); } catch (e) {}

// Seed realistic candidate applications if job_applications is empty
try {
  const count = db.prepare('SELECT COUNT(*) as count FROM job_applications').get()?.count || 0;
  if (count === 0) {
    const seedApps = [
      { email: 'aditya.v@example.com', name: 'Aditya Varma', oppId: 'opp_001', company: 'Google', title: 'Software Engineering Intern', score: 94, level: 'Expert', notes: 'Winner of National Hackathon 2025. 28-day streak on SkillSwap.', status: 'Shortlisted' },
      { email: 'sneha.k@example.com', name: 'Sneha Kulkarni', oppId: 'opp_002', company: 'Microsoft', title: 'Junior Full-Stack Engineer', score: 88, level: 'Advanced', notes: 'Production React 19 and Node.js microservices. 19-day streak.', status: 'Interview Scheduled' },
      { email: 'rohan.d@example.com', name: 'Rohan Deshpande', oppId: 'opp_003', company: 'Razorpay', title: 'Backend Engineering Fellow', score: 84, level: 'Advanced', notes: 'Certified Kubernetes Application Developer. 14-day streak.', status: 'Under Review' },
      { email: 'priyanka.n@example.com', name: 'Priyanka Nair', oppId: 'opp_006', company: 'Texas Instruments', title: 'Embedded Software Engineer', score: 79, level: 'Advanced', notes: 'IoT smart energy monitoring hardware & firmware. 22-day streak.', status: 'Under Review' },
      { email: 'karthik.r@example.com', name: 'Karthik Raja', oppId: 'opp_004', company: 'Stripe', title: 'Data Science & Risk Analytics Intern', score: 76, level: 'Advanced', notes: 'NLP & anomaly detection research project. 11-day streak.', status: 'Under Review' },
      { email: 'meera.s@example.com', name: 'Meera Sen', oppId: 'opp_005', company: 'Swiggy', title: 'Associate Product Analyst', score: 72, level: 'Advanced', notes: 'Top decision-making score (85%) & funnel analytics. 16-day streak.', status: 'Shortlisted' }
    ];
    const stmt = db.prepare(`
      INSERT INTO job_applications (user_email, user_name, opportunity_id, company_name, job_title, score, level, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    seedApps.forEach(a => stmt.run(a.email, a.name, a.oppId, a.company, a.title, a.score, a.level, a.notes, a.status));
  }
} catch (e) {
  console.error('Seed app error:', e);
}

// In-memory session store for active assessments
const sessions = new Map();

// Helper to log user login history into the database
function recordLoginHistory(email, name, req, status = 'SUCCESS') {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ua = req.headers['user-agent'] || 'Web Browser';
    db.prepare(`
      INSERT INTO login_history (user_email, user_name, ip_address, user_agent, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(email, name || 'User', String(ip), String(ua), status);
    console.log(`[AUDIT] Login recorded in SQLite for ${email} (${status})`);
  } catch (err) {
    console.error('[AUDIT ERROR] Failed to record login history:', err);
  }
}

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, stream, specialization, targetTopic, target_topic } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const today = new Date().toISOString().split('T')[0];
    const userTopic = targetTopic || target_topic || '';
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, stream, specialization, target_topic, streak, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    const result = stmt.run(name, email, password_hash, role || 'Student', stream || '', specialization || '', userTopic, today);

    // Save login history
    recordLoginHistory(email, name, req, 'REGISTER_LOGIN');

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: result.lastInsertRowid,
        name,
        email,
        role: role || 'Student',
        stream,
        specialization,
        targetTopic: userTopic,
        streak: 1
      }
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
      recordLoginHistory(email, 'Unknown', req, 'FAILED_USER_NOT_FOUND');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      recordLoginHistory(email, user.name, req, 'FAILED_WRONG_PASSWORD');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Refresh streak logic on login
    const today = new Date().toISOString().split('T')[0];
    let streak = user.streak || 1;
    if (user.last_active) {
      const last = new Date(user.last_active);
      const curr = new Date(today);
      const diffDays = Math.round((curr - last) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak += 1;
      } else if (diffDays > 1) {
        streak = 1;
      }
    }
    db.prepare('UPDATE users SET streak = ?, last_active = ? WHERE email = ?').run(streak, today, email);

    // Record login history in database
    recordLoginHistory(email, user.name, req, 'SUCCESS');

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        stream: user.stream,
        specialization: user.specialization,
        targetTopic: user.target_topic || '',
        streak
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
  const user = db.prepare('SELECT id, name, email, role, stream, specialization, target_topic, streak, last_active FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, targetTopic: user.target_topic || '' });
});

// Update user target focus topic
app.post('/api/user/update-topic', (req, res) => {
  const { email, targetTopic } = req.body;
  if (!email || targetTopic === undefined) {
    return res.status(400).json({ error: 'Email and targetTopic are required' });
  }
  try {
    db.prepare('UPDATE users SET target_topic = ? WHERE email = ?').run(targetTopic, email);
    res.json({ message: 'Target topic updated successfully', targetTopic });
  } catch (err) {
    console.error('Update topic error:', err);
    res.status(500).json({ error: 'Failed to update target topic' });
  }
});

// ==================== USER STREAK DETAILS ====================

app.get('/api/user/streak', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = db.prepare('SELECT name, streak, last_active FROM users WHERE email = ?').get(email);
  const assessmentsCount = db.prepare('SELECT COUNT(*) as count FROM assessments WHERE user_email = ?').get(email)?.count || 0;
  
  const currentStreak = user?.streak || Math.max(1, assessmentsCount);
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIdx = (new Date().getDay() + 6) % 7;
  const weekMap = days.map((day, idx) => ({
    day,
    active: idx <= todayIdx && (todayIdx - idx < currentStreak)
  }));

  const badges = [
    { title: '3-Day Spark', target: 3, unlocked: currentStreak >= 3, icon: '⚡' },
    { title: '7-Day Grinder', target: 7, unlocked: currentStreak >= 7, icon: '🔥' },
    { title: '14-Day Consistency Pro', target: 14, unlocked: currentStreak >= 14, icon: '🏆' },
    { title: '30-Day Master', target: 30, unlocked: currentStreak >= 30, icon: '👑' }
  ];

  res.json({
    streak: currentStreak,
    assessmentsCount,
    weekMap,
    badges,
    streakMultiplier: currentStreak >= 7 ? '1.5x' : currentStreak >= 3 ? '1.2x' : '1.0x',
    flameActive: true
  });
});

// ==================== ML ASSESSMENT & ASSIGNMENTS RESULTS ====================

app.post('/api/assessment/start', (req, res) => {
  try {
    const { email, name, stream, role, specialization } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const userProfile = { email, name, stream: stream || 'all', role: role || 'Student', specialization };
    const questions = selectQuestions(userProfile, 10);

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessions.set(sessionId, {
      userProfile,
      questions,
      answers: [],
      startTime: Date.now(),
      currentIndex: 0
    });

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

app.post('/api/assessment/answer', (req, res) => {
  const { sessionId, questionId, selectedIndex } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  const result = verifyAnswer(questionId, selectedIndex);

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

app.post('/api/assessment/finalize', async (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });

  try {
    const evaluation = computeResults(session.answers, session.userProfile);
    const { userProfile } = session;

    // Calculate streak
    let currentStreak = 1;
    const today = new Date().toISOString().split('T')[0];
    try {
      const user = db.prepare('SELECT streak, last_active FROM users WHERE email = ?').get(userProfile.email);
      if (user) {
        currentStreak = (user.streak || 1) + 1;
        db.prepare('UPDATE users SET streak = ?, last_active = ? WHERE email = ?').run(currentStreak, today, userProfile.email);
      }
    } catch (streakErr) {
      console.error('Streak update error:', streakErr);
    }

    // Save assessment results history to database
    try {
      const stmt = db.prepare(`
        INSERT INTO assessments (
          user_email, user_name, user_role, stream, specialization,
          overall_score, predicted_level, confidence,
          analytical_reasoning, problem_solving, decision_making,
          attention_consistency, knowledge_recall,
          skill_gaps, difficulty_level, streaks, mentor_summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        currentStreak,
        evaluation.mentorSummary
      );
    } catch (dbErr) {
      console.error('DB save error:', dbErr);
    }

    sessions.delete(sessionId);

    res.json({
      ...evaluation,
      streak: currentStreak
    });
  } catch (err) {
    console.error('Finalize error:', err);
    res.status(500).json({ error: 'Failed to compute results' });
  }
});

// ==================== ML MODEL & KAGGLE DATASETS METADATA ====================

app.get('/api/ml/model-info', (req, res) => {
  try {
    const metadata = getMLModelMetadata();
    res.json(metadata);
  } catch (err) {
    console.error('Error fetching ML model info:', err);
    res.status(500).json({ error: 'Failed to fetch ML model metadata' });
  }
});

// ==================== CLASSES & ATTENDANCE HISTORY ====================

app.get('/api/classes', (req, res) => {
  const { email } = req.query;
  let enrolledIds = new Set();
  
  if (email) {
    try {
      const rows = db.prepare('SELECT class_id FROM class_enrollments WHERE user_email = ?').all(email);
      enrolledIds = new Set(rows.map(r => r.class_id));
    } catch (e) {}
  }

  const list = classesData.classes.map(c => ({
    ...c,
    enrolled: enrolledIds.has(c.id)
  }));

  res.json(list);
});

app.post('/api/classes/enroll', (req, res) => {
  const { email, classId } = req.body;
  if (!email || !classId) {
    return res.status(400).json({ error: 'Email and classId are required' });
  }

  try {
    const existing = db.prepare('SELECT id FROM class_enrollments WHERE user_email = ? AND class_id = ?').get(email, classId);
    if (existing) {
      db.prepare('DELETE FROM class_enrollments WHERE user_email = ? AND class_id = ?').run(email, classId);
      return res.json({ message: 'Un-enrolled successfully', enrolled: false });
    } else {
      db.prepare('INSERT INTO class_enrollments (user_email, class_id) VALUES (?, ?)').run(email, classId);
      return res.json({ message: 'Enrolled successfully! Zoom meet link added to your Timetable.', enrolled: true });
    }
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Failed to update enrollment' });
  }
});

// Save class attendance into database when user joins or marks attended
app.post('/api/classes/attend', (req, res) => {
  const { email, name, classId, classTitle, instructorName, durationMinutes } = req.body;
  if (!email || !classId) {
    return res.status(400).json({ error: 'Email and classId are required' });
  }

  try {
    db.prepare(`
      INSERT INTO class_attendance (user_email, user_name, class_id, class_title, instructor_name, zoom_joined, duration_minutes)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(email, name || 'Student', classId, classTitle || 'Live Masterclass', instructorName || 'Instructor', durationMinutes || 60);

    res.json({ message: 'Class attendance recorded successfully in database!' });
  } catch (err) {
    console.error('Attendance error:', err);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// ==================== UNIFIED HISTORY ENDPOINT ====================

app.get('/api/history/all', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    // 1. Assessment / Assignment results
    const assessments = db.prepare(`
      SELECT * FROM assessments WHERE user_email = ? ORDER BY assessment_date DESC LIMIT 25
    `).all(email).map(r => ({
      ...r,
      skill_gaps: r.skill_gaps ? JSON.parse(r.skill_gaps) : []
    }));

    // 2. Classes attended history
    const classesAttended = db.prepare(`
      SELECT * FROM class_attendance WHERE user_email = ? ORDER BY attended_at DESC LIMIT 25
    `).all(email);

    // If attendance is empty, populate sample past attended classes for display
    let finalClasses = classesAttended;
    if (finalClasses.length === 0) {
      finalClasses = [
        { id: 1, class_title: 'Mastering Advanced Data Structures & Graph Algorithms', instructor_name: 'Dr. Arvind Ramesh', zoom_joined: 1, duration_minutes: 90, attended_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 2, class_title: 'Full-Stack React & Node.js Production Architecture', instructor_name: 'Pooja Hegde', zoom_joined: 1, duration_minutes: 60, attended_at: new Date(Date.now() - 3 * 86400000).toISOString() }
      ];
    }

    // 3. Login history
    const logins = db.prepare(`
      SELECT * FROM login_history WHERE user_email = ? ORDER BY login_time DESC LIMIT 25
    `).all(email);

    // 4. Job applications
    const applications = db.prepare(`
      SELECT * FROM job_applications WHERE user_email = ? ORDER BY applied_at DESC LIMIT 25
    `).all(email);

    res.json({
      assessments,
      classesAttended: finalClasses,
      logins,
      applications
    });
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ==================== TIMETABLE MAKER ====================

app.get('/api/timetable', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const userSlots = db.prepare(`
      SELECT id, title, day_of_week as day, start_time as startTime, duration, type, zoom_url as zoomUrl
      FROM timetable_slots
      WHERE user_email = ?
      ORDER BY start_time ASC
    `).all(email);

    const enrolledRows = db.prepare('SELECT class_id FROM class_enrollments WHERE user_email = ?').all(email);
    const enrolledIds = new Set(enrolledRows.map(r => r.class_id));
    
    const enrolledClassSlots = [];
    classesData.classes.forEach(c => {
      if (enrolledIds.has(c.id) && c.days) {
        c.days.forEach(day => {
          enrolledClassSlots.push({
            id: `enrolled_${c.id}_${day}`,
            title: `🎓 ${c.title}`,
            day: day,
            startTime: c.timeSlot || '18:00',
            duration: '90m',
            type: 'Live Masterclass',
            zoomUrl: c.zoom?.joinUrl,
            meetingId: c.zoom?.meetingId,
            passcode: c.zoom?.passcode,
            instructor: c.instructor?.name,
            isLive: c.zoom?.isLive,
            autoImported: true
          });
        });
      }
    });

    let defaultSlots = [];
    if (userSlots.length === 0 && enrolledClassSlots.length === 0) {
      defaultSlots = [
        { id: 'def_1', title: '🧠 Daily ML Assessment & Aptitude', day: 'Monday', startTime: '09:00', duration: '45m', type: 'Self Study', zoomUrl: '' },
        { id: 'def_2', title: '💻 LeetCode DSA Patterns (Graphs/Trees)', day: 'Tuesday', startTime: '17:00', duration: '60m', type: 'Problem Solving', zoomUrl: '' },
        { id: 'def_3', title: '👥 Peer Zoom Code Review', day: 'Wednesday', startTime: '19:30', duration: '45m', type: 'Peer Exchange', zoomUrl: 'https://zoom.us/j/84920193847' },
        { id: 'def_4', title: '🚀 Full-Stack Project Building', day: 'Thursday', startTime: '16:00', duration: '90m', type: 'Project Work', zoomUrl: '' },
        { id: 'def_5', title: '🏆 Weekly Leaderboard Mock Sprint', day: 'Friday', startTime: '18:00', duration: '60m', type: 'Sprint Quiz', zoomUrl: '' },
        { id: 'def_6', title: '🎯 System Design & Architecture', day: 'Saturday', startTime: '11:00', duration: '75m', type: 'System Architecture', zoomUrl: 'https://zoom.us/j/93201928471' }
      ];
    }

    res.json([
      ...userSlots,
      ...enrolledClassSlots,
      ...defaultSlots
    ]);
  } catch (err) {
    console.error('Timetable error:', err);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

app.post('/api/timetable', (req, res) => {
  const { email, title, day, startTime, duration, type, zoomUrl } = req.body;
  if (!email || !title || !day || !startTime) {
    return res.status(400).json({ error: 'Title, day, and start time are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO timetable_slots (user_email, title, day_of_week, start_time, duration, type, zoom_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(email, title, day, startTime, duration || '60m', type || 'Study Session', zoomUrl || '');

    res.status(201).json({
      message: 'Timetable slot scheduled successfully!',
      slot: {
        id: result.lastInsertRowid,
        title,
        day,
        startTime,
        duration: duration || '60m',
        type: type || 'Study Session',
        zoomUrl: zoomUrl || ''
      }
    });
  } catch (err) {
    console.error('Save slot error:', err);
    res.status(500).json({ error: 'Failed to save timetable slot' });
  }
});

app.delete('/api/timetable/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM timetable_slots WHERE id = ?').run(id);
    res.json({ message: 'Slot removed from timetable' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

// ==================== FRIEND SUGGESTIONS & STUDY BUDDY ====================

app.get('/api/friends', (req, res) => {
  const { email } = req.query;
  let connectedIds = new Set();

  if (email) {
    try {
      const rows = db.prepare('SELECT friend_id FROM friend_connections WHERE user_email = ?').all(email);
      connectedIds = new Set(rows.map(r => r.friend_id));
    } catch (e) {}
  }

  const list = friendsData.friends.map(f => ({
    ...f,
    connected: connectedIds.has(f.id)
  }));

  res.json(list);
});

app.post('/api/friends/connect', (req, res) => {
  const { email, friendId } = req.body;
  if (!email || !friendId) {
    return res.status(400).json({ error: 'Email and friendId required' });
  }

  try {
    const existing = db.prepare('SELECT id FROM friend_connections WHERE user_email = ? AND friend_id = ?').get(email, friendId);
    if (existing) {
      db.prepare('DELETE FROM friend_connections WHERE user_email = ? AND friend_id = ?').run(email, friendId);
      return res.json({ connected: false, message: 'Study connection removed' });
    } else {
      db.prepare('INSERT INTO friend_connections (user_email, friend_id) VALUES (?, ?)').run(email, friendId);
      return res.json({ connected: true, message: 'Connected! You can now join peer Zoom rooms together.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

app.post('/api/zoom/instant-room', (req, res) => {
  const { topic } = req.body;
  const meetingId = `${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
  const passcode = `SWAP${Math.floor(1000 + Math.random() * 9000)}`;
  const joinUrl = `https://zoom.us/j/${meetingId.replace(/\s+/g, '')}?pwd=${passcode}`;

  res.json({
    topic: topic || 'Peer Skill Exchange & Study Room',
    meetingId,
    passcode,
    joinUrl,
    createdAt: new Date().toISOString()
  });
});

// ==================== OPPORTUNITIES & APPLICATIONS ====================

app.get('/api/opportunities', (req, res) => {
  const { email } = req.query;
  let appliedIds = new Set();

  if (email) {
    try {
      const rows = db.prepare('SELECT opportunity_id FROM job_applications WHERE user_email = ?').all(email);
      appliedIds = new Set(rows.map(r => r.opportunity_id));
    } catch (e) {}
  }

  const list = opportunitiesData.opportunities.map(opp => ({
    ...opp,
    applied: appliedIds.has(opp.id)
  }));

  res.json(list);
});

app.post('/api/opportunities/apply', (req, res) => {
  const { email, name, opportunityId, notes } = req.body;
  if (!email || !opportunityId) {
    return res.status(400).json({ error: 'Email and opportunityId are required' });
  }

  try {
    const opp = opportunitiesData.opportunities.find(o => o.id === opportunityId);
    const company = opp?.company || 'Tech Partner';
    const title = opp?.title || 'Engineering Role';

    const latestAssessment = db.prepare(`
      SELECT overall_score, predicted_level 
      FROM assessments 
      WHERE user_email = ? 
      ORDER BY assessment_date DESC LIMIT 1
    `).get(email);

    const score = latestAssessment ? latestAssessment.overall_score : 0;
    const level = latestAssessment ? latestAssessment.predicted_level : 'Unassessed';

    const existing = db.prepare('SELECT id FROM job_applications WHERE user_email = ? AND opportunity_id = ?').get(email, opportunityId);
    if (existing) {
      return res.status(400).json({ error: 'You have already applied for this opportunity' });
    }

    db.prepare(`
      INSERT INTO job_applications (user_email, user_name, opportunity_id, company_name, job_title, score, level, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Under Review')
    `).run(email, name || 'Applicant', opportunityId, company, title, score, level, notes || '');

    res.json({
      message: 'Application submitted successfully with your verified SkillSwap ML score!',
      applied: true,
      verifiedScore: score,
      level
    });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Failed to apply' });
  }
});

// ==================== COMPANY VIEW & APPLICANT SCREENING ====================

// Returns candidates who applied ("candidates in the application")
app.get('/api/company/applications', (req, res) => {
  try {
    const apps = db.prepare(`
      SELECT 
        ja.id as applicationId,
        ja.user_email as email,
        ja.user_name as name,
        ja.opportunity_id as opportunityId,
        ja.company_name as company,
        ja.job_title as jobTitle,
        ja.score,
        ja.level,
        ja.notes,
        ja.status,
        ja.applied_at as appliedAt,
        COALESCE(u.stream, 'CS') as stream,
        COALESCE(u.specialization, 'Software Engineering') as specialization,
        COALESCE(u.streak, 1) as streak
      FROM job_applications ja
      LEFT JOIN users u ON ja.user_email = u.email
      ORDER BY ja.applied_at DESC
    `).all();

    res.json(apps);
  } catch (err) {
    console.error('Fetch applications error:', err);
    res.status(500).json({ error: 'Failed to load applications' });
  }
});

// Recruiter updates application status
app.post('/api/company/application-status', (req, res) => {
  const { applicationId, status } = req.body;
  if (!applicationId || !status) {
    return res.status(400).json({ error: 'applicationId and status are required' });
  }

  try {
    db.prepare('UPDATE job_applications SET status = ? WHERE id = ?').run(status, applicationId);
    res.json({ message: `Applicant status updated to '${status}' successfully!` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Returns all candidates for recruiter directory
app.get('/api/candidates', (req, res) => {
  try {
    const dbCandidates = db.prepare(`
      SELECT 
        u.id, u.name, u.email, u.role, u.stream, u.specialization, u.target_topic,
        COALESCE(u.streak, 1) as streak,
        COALESCE(MAX(a.overall_score), 0) as overallScore,
        COALESCE(a.predicted_level, 'Intermediate') as predictedLevel,
        COUNT(a.id) as attempts,
        a.analytical_reasoning,
        a.problem_solving,
        a.decision_making,
        a.attention_consistency,
        a.knowledge_recall,
        a.skill_gaps
      FROM users u
      LEFT JOIN assessments a ON u.email = a.user_email
      GROUP BY u.email
      ORDER BY overallScore DESC
    `).all();

    const formattedDbCandidates = dbCandidates.map(c => ({
      id: `user_${c.id}`,
      name: c.name,
      email: c.email,
      role: c.role || 'Student',
      stream: c.stream || 'CS',
      specialization: c.specialization || 'Software Engineering',
      targetTopic: c.target_topic || 'Supervised Learning & Algorithms',
      overallScore: c.overallScore || 70,
      predictedLevel: c.predictedLevel || 'Intermediate',
      streak: Math.max(c.streak, 1),
      lastActive: 'Today',
      location: 'India',
      availability: 'Immediately Available',
      domainScores: {
        analytical_reasoning: c.analytical_reasoning || 70,
        problem_solving: c.problem_solving || 70,
        decision_making: c.decision_making || 70,
        attention_consistency: c.attention_consistency || 70,
        knowledge_recall: c.knowledge_recall || 70
      },
      strengths: c.overallScore >= 70 ? ['Consistent Learner', 'Problem Solving'] : ['Active Learner'],
      skills: [c.stream || 'CS', c.specialization || 'Software', c.target_topic || 'Algorithms'].filter(Boolean),
      verified: c.attempts > 0,
      attempts: c.attempts || 1,
      bio: `SkillSwap candidate in ${c.stream || 'Computer Science'}${c.target_topic ? ` focusing on ${c.target_topic}` : ''}. Verified skills and consistent streak.`
    }));

    const seed = seedCandidatesData.candidates || [];
    const dbEmails = new Set(formattedDbCandidates.map(c => c.email));
    const merged = [
      ...formattedDbCandidates,
      ...seed.filter(s => !dbEmails.has(s.email))
    ];

    res.json(merged);
  } catch (err) {
    console.error('Candidate fetch error:', err);
    res.json(seedCandidatesData.candidates || []);
  }
});

// ==================== LEADERBOARD ====================

app.get('/api/leaderboard', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT user_name as name, user_email as email, 
             MAX(overall_score) as best_score, predicted_level as level,
             MAX(streaks) as streak,
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

// Catch-all: serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 SkillSwap Server running on port ${PORT}`);
  console.log(`   Database: SQLite audit history active (Logins, Assessments, Classes, Applications)`);
  console.log(`   Company View & Search/Filter Portal: READY\n`);
});
