/**
 * Custom ML Assessment Engine
 * 
 * This module implements an adaptive assessment engine using:
 * - Domain-based question bank (questions.json)
 * - Weighted scoring by difficulty
 * - Adaptive difficulty selection
 * - Level prediction via threshold classification
 * - Skill gap analysis
 * - Performance recommendations
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load question bank
const questionsData = JSON.parse(
  readFileSync(path.join(__dirname, '../data/questions.json'), 'utf-8')
);
const ALL_QUESTIONS = questionsData.questions;

// Domain weights for overall score calculation
const DOMAIN_WEIGHTS = {
  analytical_reasoning:    0.25,
  problem_solving:         0.25,
  decision_making:         0.20,
  attention_consistency:   0.15,
  knowledge_recall:        0.15
};

// Difficulty scoring multipliers
const DIFFICULTY_SCORES = {
  easy:   40,   // Max score for easy question
  medium: 65,   // Max score for medium question
  hard:   100   // Max score for hard question
};

// Level thresholds (0-100)
const LEVEL_THRESHOLDS = [
  { level: 'Expert',       min: 85, label: '🏆 Expert',       color: '#f59e0b' },
  { level: 'Advanced',     min: 70, label: '🥇 Advanced',     color: '#10b981' },
  { level: 'Intermediate', min: 50, label: '🥈 Intermediate', color: '#3b82f6' },
  { level: 'Beginner',     min: 0,  label: '🌱 Beginner',     color: '#6b7280' }
];

// Domain to skills mapping for recommendations
const DOMAIN_SKILLS = {
  analytical_reasoning:  ['Logic', 'Pattern Recognition', 'Quantitative Aptitude', 'Deductive Reasoning'],
  problem_solving:       ['Algorithm Design', 'Data Structures', 'Optimization', 'Debugging'],
  decision_making:       ['Risk Assessment', 'Trade-off Analysis', 'Project Management', 'Strategic Thinking'],
  attention_consistency: ['Code Review', 'QA Testing', 'Detail-Oriented Work', 'Documentation'],
  knowledge_recall:      ['Technical Knowledge', 'Domain Expertise', 'Terminology', 'Standards']
};

// Resources for each domain
const DOMAIN_RESOURCES = {
  analytical_reasoning:  ['Practice aptitude tests daily', 'Solve puzzles and brain teasers', 'Study discrete mathematics'],
  problem_solving:       ['LeetCode / HackerRank challenges', 'Study algorithms & data structures', 'Read "Cracking the Coding Interview"'],
  decision_making:       ['Study decision theory', 'Practice case studies', 'Take a project management course'],
  attention_consistency: ['Practice code review exercises', 'Take proofreading practice tests', 'Develop checklists for routine tasks'],
  knowledge_recall:      ['Review core technical concepts daily', 'Take domain-specific certifications', 'Build projects to reinforce knowledge']
};

/**
 * Select questions for a session adaptively based on user profile.
 * Returns exactly `count` questions spread across all 5 domains.
 */
export function selectQuestions(userProfile, count = 10) {
  const { stream = 'all', role = '' } = userProfile;
  
  // Filter questions by stream compatibility
  const eligible = ALL_QUESTIONS.filter(q =>
    q.streams.includes('all') || q.streams.includes(stream)
  );

  // Group by domain
  const byDomain = {};
  for (const domain of Object.keys(DOMAIN_WEIGHTS)) {
    byDomain[domain] = eligible.filter(q => q.domain === domain);
  }

  // Pick questions per domain (2 per domain for 10 questions)
  const perDomain = Math.floor(count / 5);
  const selected = [];

  for (const [domain, domainQs] of Object.entries(byDomain)) {
    // Shuffle domain questions
    const shuffled = [...domainQs].sort(() => Math.random() - 0.5);
    // Pick mix of difficulties
    const easy   = shuffled.filter(q => q.difficulty === 'easy');
    const medium = shuffled.filter(q => q.difficulty === 'medium');
    const hard   = shuffled.filter(q => q.difficulty === 'hard');
    
    // Pick at least 1 easy, rest medium/hard
    const picks = [];
    if (easy.length > 0) picks.push(easy[0]);
    if (picks.length < perDomain && medium.length > 0) picks.push(medium[0]);
    if (picks.length < perDomain && hard.length > 0) picks.push(hard[0]);
    if (picks.length < perDomain && medium.length > 1) picks.push(medium[1]);
    
    selected.push(...picks.slice(0, perDomain));
  }

  // Strip answers from questions sent to client
  return selected.map(q => ({
    id: q.id,
    domain: q.domain,
    difficulty: q.difficulty,
    text: q.text,
    options: q.options
    // answer & explanation NOT sent to client
  }));
}

/**
 * Verify a single answer and return feedback.
 */
export function verifyAnswer(questionId, selectedIndex) {
  const question = ALL_QUESTIONS.find(q => q.id === questionId);
  if (!question) {
    return { correct: false, feedback: 'Question not found.', score: 0 };
  }

  const isCorrect = selectedIndex === question.answer;
  const baseScore = DIFFICULTY_SCORES[question.difficulty] || 40;
  const score = isCorrect ? baseScore : 0;

  // Partial credit for hard questions: 20% if wrong but attempted
  const partialScore = (!isCorrect && question.difficulty === 'hard') ? Math.floor(baseScore * 0.1) : 0;

  return {
    correct: isCorrect,
    correctAnswer: question.answer,
    correctOptionText: question.options[question.answer],
    explanation: question.explanation,
    domain: question.domain,
    difficulty: question.difficulty,
    score: score + partialScore
  };
}

/**
 * Compute final assessment results from a completed session.
 * answers: array of { questionId, selectedIndex, score, correct, domain }
 */
export function computeResults(answers, userProfile) {
  // Group scores by domain
  const domainData = {};
  for (const domain of Object.keys(DOMAIN_WEIGHTS)) {
    domainData[domain] = { totalScore: 0, maxScore: 0, correct: 0, total: 0 };
  }

  for (const answer of answers) {
    const q = ALL_QUESTIONS.find(q => q.id === answer.questionId);
    if (!q) continue;
    const { domain, difficulty } = q;
    domainData[domain].totalScore += answer.score || 0;
    domainData[domain].maxScore   += DIFFICULTY_SCORES[difficulty] || 40;
    domainData[domain].correct    += answer.correct ? 1 : 0;
    domainData[domain].total      += 1;
  }

  // Normalize domain scores to 0-100
  const domainScores = {};
  for (const [domain, data] of Object.entries(domainData)) {
    domainScores[domain] = data.maxScore > 0
      ? Math.round((data.totalScore / data.maxScore) * 100)
      : 50; // default if no questions in domain
  }

  // Weighted overall score
  let overallScore = 0;
  for (const [domain, weight] of Object.entries(DOMAIN_WEIGHTS)) {
    overallScore += domainScores[domain] * weight;
  }
  overallScore = Math.round(overallScore);

  // Predict level
  const levelInfo = LEVEL_THRESHOLDS.find(t => overallScore >= t.min) || LEVEL_THRESHOLDS[3];

  // Identify skill gaps (domains below 60)
  const skillGaps = Object.entries(domainScores)
    .filter(([, score]) => score < 60)
    .map(([domain]) => domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

  // Identify strengths (domains above 75)
  const strengths = Object.entries(domainScores)
    .filter(([, score]) => score >= 75)
    .map(([domain]) => domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

  // Build recommendations
  const recommendations = [];
  for (const [domain, score] of Object.entries(domainScores)) {
    if (score < 60) {
      const resources = DOMAIN_RESOURCES[domain] || [];
      const skills = DOMAIN_SKILLS[domain] || [];
      recommendations.push({
        domain: domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        score,
        skills,
        resources
      });
    }
  }

  // Generate AI-style mentor summary
  const correctCount = answers.filter(a => a.correct).length;
  const accuracy = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
  
  const mentorSummary = generateMentorSummary({
    overallScore,
    level: levelInfo.level,
    domainScores,
    skillGaps,
    strengths,
    accuracy,
    userProfile
  });

  return {
    overallScore,
    predictedLevel: levelInfo.level,
    levelLabel: levelInfo.label,
    levelColor: levelInfo.color,
    confidence: computeConfidence(answers, domainScores),
    domainScores: {
      analytical_reasoning:  domainScores.analytical_reasoning,
      problem_solving:       domainScores.problem_solving,
      decision_making:       domainScores.decision_making,
      attention_consistency: domainScores.attention_consistency,
      knowledge_recall:      domainScores.knowledge_recall
    },
    skillGaps,
    strengths,
    recommendations,
    accuracy,
    correctCount,
    totalQuestions: answers.length,
    mentorSummary,
    difficultyLevel: levelInfo.level === 'Expert' ? 'Hard' : levelInfo.level === 'Advanced' ? 'Medium-Hard' : levelInfo.level === 'Intermediate' ? 'Medium' : 'Easy'
  };
}

/**
 * Compute confidence score based on consistency of answers.
 */
function computeConfidence(answers, domainScores) {
  if (answers.length === 0) return 0;
  
  // Consistency: how close domain scores are to each other
  const scores = Object.values(domainScores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  // High consistency = high confidence; low std dev = high confidence
  const baseConfidence = Math.round(85 - stdDev * 0.5);
  return Math.max(50, Math.min(99, baseConfidence));
}

/**
 * Generate a personalized mentor summary based on results.
 */
function generateMentorSummary({ overallScore, level, domainScores, skillGaps, strengths, accuracy, userProfile }) {
  const name = userProfile.name || 'Learner';
  
  // Find best and worst domain
  const sortedDomains = Object.entries(domainScores).sort(([,a],[,b]) => b - a);
  const bestDomain = sortedDomains[0][0].replace(/_/g, ' ');
  const worstDomain = sortedDomains[sortedDomains.length - 1][0].replace(/_/g, ' ');

  const openings = [
    `Great effort, ${name}! You scored ${overallScore}/100 overall`,
    `Assessment complete, ${name}. Your score of ${overallScore}/100 reflects`,
    `Well done on completing the assessment, ${name}! With ${overallScore}/100`
  ];
  const opening = openings[Math.floor(Math.random() * openings.length)];

  let summary = `${opening}, placing you at the ${level} level with ${accuracy}% answer accuracy. `;

  if (strengths.length > 0) {
    summary += `Your strongest area is ${bestDomain.replace(/\b\w/g, c => c.toUpperCase())} — keep building on this foundation. `;
  }

  if (skillGaps.length > 0) {
    summary += `Focus your improvement energy on ${worstDomain.replace(/\b\w/g, c => c.toUpperCase())}, which shows the most room for growth. `;
  }

  if (overallScore >= 85) {
    summary += `You are performing at an expert level — consider mentoring others and contributing to open-source or advanced projects.`;
  } else if (overallScore >= 70) {
    summary += `You are well on your way to expertise. Practice advanced problems and work on real-world projects to solidify your skills.`;
  } else if (overallScore >= 50) {
    summary += `You have a solid foundation. Focus on consistent daily practice and tackle medium-difficulty challenges to level up.`;
  } else {
    summary += `Build your fundamentals by reviewing core concepts daily. Start with easy problems and gradually increase difficulty.`;
  }

  return summary;
}
