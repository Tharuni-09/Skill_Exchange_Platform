# Skill Exchange Platform - Full Rebuild Plan

## Architecture

```
final_project/
├── client/                    # React.js frontend (Vite)
│   ├── src/
│   │   ├── pages/             # One component per page
│   │   │   ├── Hero.jsx + Hero.css
│   │   │   ├── Login.jsx + Login.css
│   │   │   ├── Register.jsx + Register.css
│   │   │   ├── Assessment.jsx + Assessment.css
│   │   │   ├── Results.jsx + Results.css
│   │   │   ├── Dashboard.jsx + Dashboard.css
│   │   │   ├── Leaderboard.jsx + Leaderboard.css
│   │   │   └── History.jsx + History.css
│   │   ├── components/        # Shared components
│   │   │   ├── Header.jsx + Header.css
│   │   │   └── PrivateRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx            # React Router
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── server/                    # Node.js backend
│   ├── server.js              # Express API
│   ├── ml/
│   │   └── assessmentEngine.js  # Custom ML model (JS)
│   └── data/
│       └── questions.json     # Question bank
│
├── Dockerfile
└── render.yaml
```

## ML Model Design

- **Language**: JavaScript (Node.js) — no Python needed
- **Approach**: Rule-based scoring + weighted domain classification
- **Question Bank**: JSON file with 50+ questions per domain
- **Domains**: analytical_reasoning, problem_solving, decision_making, attention_consistency, knowledge_recall
- **Question Selection**: Adaptive — selects questions based on user stream/role
- **Scoring**: Weighted by difficulty (easy=1, medium=2, hard=3), normalized to 0-100
- **Level Prediction**: Based on overall score thresholds (Beginner/Intermediate/Advanced/Expert)
- **Skill Gap Analysis**: Domains below 60% flagged as gaps
