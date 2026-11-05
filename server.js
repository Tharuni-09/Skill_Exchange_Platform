import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

app.use(cors());
app.use(express.json());

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
    ai_summary TEXT,
    assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- GEMINI HELPER FUNCTION ---
async function callGemini(prompt, systemInstruction = '') {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json"
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return JSON.parse(text);
}

// --- AUTHENTICATION APIS ---

// Dedicated Register API
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role, stream, specialization } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
    const existing = checkStmt.get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
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

    return res.status(201).json({ success: true, user, message: 'Registration successful!' });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// Dedicated Login API
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

    return res.json({ success: true, user: safeUser, message: 'Logged in successfully!' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// Current User Session Info
app.get('/api/auth/me', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email parameter required' });
  const stmt = db.prepare('SELECT id, name, email, role, stream, specialization, created_at FROM users WHERE email = ?');
  const user = stmt.get(email.toLowerCase().trim());
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ success: true, user });
});

// --- AI AGENT ENDPOINTS (GEMINI 2.5 FLASH) ---

// 1. AI Start Assessment Session: Generate tailored Question 1
app.post('/api/ai/start-session', async (req, res) => {
  const { stream, specialization, role, difficulty = 'medium' } = req.body;

  const prompt = `
Generate Question 1 of an adaptive skill assessment for a candidate in the field of "${stream || 'General Technology'}" (Specialization: "${specialization || 'General'}", Role: "${role || 'Student'}").
Difficulty level: ${difficulty}.
Target Domain: Analytical Reasoning or Core Domain Knowledge.

Respond strictly with valid JSON with this exact schema:
{
  "questionNumber": 1,
  "domain": "analytical_reasoning" (or "knowledge_recall", "problem_solving", "decision_making", "attention_consistency"),
  "domainTitle": "Analytical Reasoning",
  "difficulty": "${difficulty}",
  "text": "Clear, practical, and thoughtful question text here",
  "options": [
    "Option A text",
    "Option B text",
    "Option C text",
    "Option D text"
  ],
  "answer": 0,
  "explanation": "Brief explanation why the answer is correct."
}
`;

  try {
    const questionData = await callGemini(prompt, "You are SkillSwap AI, an expert adaptive assessment AI examiner.");
    return res.json({ success: true, question: questionData });
  } catch (err) {
    console.warn('Gemini AI fallback triggered:', err.message);
    // Intelligent fallback question if API unavailable
    const fallbackQ = {
      questionNumber: 1,
      domain: "analytical_reasoning",
      domainTitle: "Analytical Reasoning",
      difficulty: difficulty,
      text: stream && stream.toLowerCase().includes('cs') 
        ? "Which data structure follows the LIFO (Last In, First Out) principle?" 
        : "If revenue increases by 20% and expenses remain unchanged, what happens to operating margin?",
      options: stream && stream.toLowerCase().includes('cs')
        ? ["Queue", "Stack", "Array", "Linked List"]
        : ["Decreases", "Increases", "Remains same", "Becomes zero"],
      answer: 1,
      explanation: stream && stream.toLowerCase().includes('cs')
        ? "A Stack operates on Last-In First-Out (LIFO) order."
        : "Higher revenue with fixed expenses directly increases operating margin."
    };
    return res.json({ success: true, question: fallbackQ, isFallback: true });
  }
});

// 2. AI Verify Answer & Generate Next Adaptive Question
app.post('/api/ai/verify-answer', async (req, res) => {
  const {
    currentQuestionNumber,
    totalQuestions = 10,
    stream,
    specialization,
    questionText,
    selectedOptionText,
    selectedOptionIndex,
    correctOptionIndex,
    domain,
    pastHistory = []
  } = req.body;

  const isLastQuestion = currentQuestionNumber >= totalQuestions;
  const isDirectMatch = selectedOptionIndex === correctOptionIndex;

  const prompt = `
The candidate just answered Question ${currentQuestionNumber} of ${totalQuestions}.
Domain: ${domain}
Candidate's Field: ${stream} (${specialization})
Question: "${questionText}"
Candidate's Selected Answer: "${selectedOptionText}"
Expected Correct Option Index: ${correctOptionIndex}
Candidate Answered Index: ${selectedOptionIndex}

Tasks:
1. Verify if the answer is conceptually correct or reasonable.
2. Provide a constructive, encouraging 1-2 sentence AI verification explanation.
3. Suggest the next question difficulty ('easy', 'medium', or 'hard') based on performance.
${!isLastQuestion ? `
4. Generate Question ${currentQuestionNumber + 1} targeting one of the remaining domains (e.g. problem_solving, decision_making, attention_consistency, knowledge_recall) tailored to ${stream}.
` : ''}

Respond strictly in valid JSON:
{
  "isCorrect": ${isDirectMatch},
  "score": ${isDirectMatch ? 100 : 0},
  "feedback": "Concise AI explanation of why this answer is right or wrong, and the core concept.",
  "nextDifficulty": "${isDirectMatch ? 'hard' : 'medium'}",
  ${!isLastQuestion ? `
  "nextQuestion": {
    "questionNumber": ${currentQuestionNumber + 1},
    "domain": "problem_solving",
    "domainTitle": "Problem Solving",
    "difficulty": "medium",
    "text": "Question text",
    "options": ["A", "B", "C", "D"],
    "answer": 0,
    "explanation": "Why answer is correct"
  }
  ` : `"nextQuestion": null`}
}
`;

  try {
    const aiResult = await callGemini(prompt, "You are SkillSwap AI, verifying answers accurately and generating adaptive follow-ups.");
    return res.json({ success: true, ...aiResult });
  } catch (err) {
    console.warn('Gemini verify fallback:', err.message);
    const fallbackFeedback = isDirectMatch
      ? "Correct! You identified the right principle."
      : "Not quite. Check the fundamental mechanics behind this concept.";
    
    let nextQ = null;
    if (!isLastQuestion) {
      nextQ = {
        questionNumber: currentQuestionNumber + 1,
        domain: "problem_solving",
        domainTitle: "Problem Solving",
        difficulty: "medium",
        text: `Given your focus in ${stream || 'Technology'}, what is the most optimal approach to handle sudden latency spikes?`,
        options: [
          "Restart the server manually each time",
          "Profile bottlenecks, enable caching, and auto-scale",
          "Ignore warnings until users report",
          "Disable all logging permanently"
        ],
        answer: 1,
        explanation: "Profiling and horizontal auto-scaling with caching handles load spikes without downtime."
      };
    }

    return res.json({
      success: true,
      isCorrect: isDirectMatch,
      score: isDirectMatch ? 100 : 0,
      feedback: fallbackFeedback,
      nextDifficulty: isDirectMatch ? "hard" : "medium",
      nextQuestion: nextQ,
      isFallback: true
    });
  }
});

// 3. AI Final Assessment Evaluation & Roadmap Assignment
app.post('/api/ai/finalize', async (req, res) => {
  const { user, answersHistory = [] } = req.body;

  const correctCount = answersHistory.filter(a => a.isCorrect).length;
  const totalCount = Math.max(1, answersHistory.length);
  const rawPercentage = Math.round((correctCount / totalCount) * 100);

  const prompt = `
Act as an expert AI Examiner evaluating a complete assessment for:
Candidate: ${user?.name || 'Candidate'}
Role: ${user?.role || 'Student'}
Stream: ${user?.stream || 'Computer Science'}
Specialization: ${user?.specialization || 'General'}
Raw Correct Answers: ${correctCount} out of ${totalCount} (${rawPercentage}%)

Detailed Answers History:
${JSON.stringify(answersHistory.map(a => ({ domain: a.domain, isCorrect: a.isCorrect, feedback: a.feedback })), null, 2)}

Provide an authoritative AI evaluation.
Return strictly valid JSON:
{
  "overallScore": ${rawPercentage},
  "predictedLevel": "${rawPercentage >= 80 ? 'Expert' : rawPercentage >= 60 ? 'Advanced' : rawPercentage >= 40 ? 'Intermediate' : 'Beginner'}",
  "confidenceScore": ${Math.min(95, 60 + Math.round(rawPercentage * 0.35))},
  "domainScores": {
    "analytical_reasoning": ${Math.min(100, Math.max(20, rawPercentage + 5))},
    "problem_solving": ${Math.min(100, Math.max(20, rawPercentage - 5))},
    "decision_making": ${Math.min(100, Math.max(20, rawPercentage + 2))},
    "attention_consistency": ${Math.min(100, Math.max(20, rawPercentage))},
    "knowledge_recall": ${Math.min(100, Math.max(20, rawPercentage - 2))}
  },
  "skillGaps": [
    "Specific diagnosed skill gap 1",
    "Specific diagnosed skill gap 2"
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ],
  "aiSummary": "A concise 2-sentence summary of the candidate's core strengths and growth trajectory."
}
`;

  let evalData;
  try {
    evalData = await callGemini(prompt, "You are SkillSwap AI Chief Examiner delivering personalized performance diagnostics.");
  } catch (err) {
    console.warn('AI finalize fallback:', err.message);
    evalData = {
      overallScore: rawPercentage,
      predictedLevel: rawPercentage >= 80 ? 'Expert' : rawPercentage >= 60 ? 'Advanced' : rawPercentage >= 40 ? 'Intermediate' : 'Beginner',
      confidenceScore: 85,
      domainScores: {
        analytical_reasoning: Math.min(100, rawPercentage + 5),
        problem_solving: Math.max(20, rawPercentage - 5),
        decision_making: rawPercentage,
        attention_consistency: Math.min(100, rawPercentage + 2),
        knowledge_recall: rawPercentage
      },
      skillGaps: rawPercentage < 70 ? ["Deep Systems Architecture", "Edge-Case Problem Solving"] : ["Advanced Performance Optimization"],
      recommendations: [
        "Engage in targeted peer workshops in the marketplace",
        "Practice scenario-based problem solving regularly",
        "Review core foundational principles weekly"
      ],
      aiSummary: `${user?.name || 'The candidate'} showed solid grasp of foundational concepts with clear growth potential in specialized problem-solving.`
    };
  }

  // Save to database
  try {
    const userEmail = (user?.email || 'guest@skillswap.ai').toLowerCase().trim();
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM assessments WHERE user_email = ?');
    const pastCount = countStmt.get(userEmail)?.count || 0;
    const streak = pastCount + 1;

    const stmt = db.prepare(`
      INSERT INTO assessments (
        user_email, user_name, user_role, stream, specialization,
        overall_score, predicted_level, confidence,
        analytical_reasoning, problem_solving, decision_making,
        attention_consistency, knowledge_recall, skill_gaps,
        difficulty_level, streaks, ai_summary, assessment_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      userEmail,
      user?.name || 'Anonymous',
      user?.role || 'Student',
      user?.stream || 'General',
      user?.specialization || 'General',
      evalData.overallScore,
      evalData.predictedLevel,
      evalData.confidenceScore,
      evalData.domainScores.analytical_reasoning,
      evalData.domainScores.problem_solving,
      evalData.domainScores.decision_making,
      evalData.domainScores.attention_consistency,
      evalData.domainScores.knowledge_recall,
      (evalData.skillGaps || []).join(', ') || 'None',
      'adaptive',
      streak,
      evalData.aiSummary || '',
      new Date().toISOString()
    );

    return res.json({
      success: true,
      evaluation: evalData,
      assessmentId: Number(info.lastInsertRowid),
      streak
    });
  } catch (dbErr) {
    console.error('Failed to save assessment to database:', dbErr);
    return res.json({ success: true, evaluation: evalData, streak: 1 });
  }
});

// --- GENERAL ENDPOINTS ---

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

// Serve frontend static assets
app.use(express.static(__dirname));

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 SkillSwap Backend Server with Gemini AI Agent running on port ${PORT}`);
});
