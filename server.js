import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
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
    streak INTEGER DEFAULT 1,
    last_active DATE,
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

  CREATE TABLE IF NOT EXISTS class_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    class_id TEXT NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS job_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    score INTEGER,
    level TEXT,
    notes TEXT,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS timetable_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration TEXT NOT NULL,
    type TEXT DEFAULT 'Study Session',
    zoom_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS friend_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT DEFAULT 'connected',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe column updates for existing database instances
try {
  db.exec(`ALTER TABLE users ADD COLUMN streak INTEGER DEFAULT 1;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE users ADD COLUMN last_active DATE;`);
} catch (e) {}

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
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, stream, specialization, streak, last_active)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);
    const result = stmt.run(name, email, password_hash, role || 'Student', stream || '', specialization || '', today);

    res.status(201).json({
      message: 'Registration successful',
      user: { id: result.lastInsertRowid, name, email, role: role || 'Student', stream, specialization, streak: 1 }
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

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        stream: user.stream,
        specialization: user.specialization,
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
  const user = db.prepare('SELECT id, name, email, role, stream, specialization, streak, last_active FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ==================== USER STREAK DETAILS ====================

app.get('/api/user/streak', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = db.prepare('SELECT name, streak, last_active FROM users WHERE email = ?').get(email);
  const assessmentsCount = db.prepare('SELECT COUNT(*) as count FROM assessments WHERE user_email = ?').get(email)?.count || 0;
  
  const currentStreak = user?.streak || Math.max(1, assessmentsCount);
  
  // Compute week activity (Mon - Sun)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon = 0
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

// ==================== ML ASSESSMENT ROUTES ====================

// Start assessment session — returns questions only (no answers)
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

// Finalize assessment and get results
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

    // Save assessment to database
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

// ==================== CLASSES / MASTERCLASSES WITH ZOOM ====================

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

// ==================== TIMETABLE MAKER ====================

app.get('/api/timetable', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    // 1. Get user's custom created slots
    const userSlots = db.prepare(`
      SELECT id, title, day_of_week as day, start_time as startTime, duration, type, zoom_url as zoomUrl
      FROM timetable_slots
      WHERE user_email = ?
      ORDER BY start_time ASC
    `).all(email);

    // 2. Auto-import slots from enrolled masterclasses with Zoom!
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

    // 3. If user has no slots at all, seed with high value default study timetable
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

// Create Instant Peer Zoom Room
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

// ==================== OPPORTUNITIES / CAREER ====================

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
      INSERT INTO job_applications (user_email, user_name, opportunity_id, score, level, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email, name || 'Applicant', opportunityId, score, level, notes || '');

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

// ==================== CANDIDATE RECRUITER DIRECTORY ====================

app.get('/api/candidates', (req, res) => {
  try {
    const dbCandidates = db.prepare(`
      SELECT 
        u.id, u.name, u.email, u.role, u.stream, u.specialization,
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
      skills: [c.stream || 'CS', c.specialization || 'Software', 'Algorithms', 'Web'],
      verified: c.attempts > 0,
      attempts: c.attempts || 1,
      bio: `SkillSwap candidate in ${c.stream || 'Computer Science'}. Verified skills and consistent streak.`
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

// ==================== LEADERBOARD & HISTORY ====================

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
  console.log(`   Classes with Zoom, Timetable Maker, Friend Suggestions & Streaks: READY\n`);
});
