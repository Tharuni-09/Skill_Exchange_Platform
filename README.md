# SkillSwap AI

An intelligent peer-to-peer skill exchange platform with adaptive assessment, real-time analytics, peer learning marketplace, and job referrals.

## Features
- **Adaptive Assessments**: Multi-domain skill evaluation (CS, Commerce, General) across difficulty tiers (Easy, Medium, Hard).
- **Interactive Analytics**: Real-time Radar and Bar charts via Chart.js displaying strength areas and identified skill gaps.
- **Student Dashboard**: Streak tracking, class metrics, and upcoming workshop links.
- **Peer Marketplace**: Browse and join live Zoom skill sessions with peer mentors.
- **Leaderboard**: Compete with peer learners and track rankings.
- **Referral Eligibility**: Auto-unlock job & internship referral opportunities matching your test scores.

## Quick Start (Local)
1. Double-click `index.html` to open in any browser, or
2. Run a local server:
   ```bash
   python -m http.server 3000
   ```
   Open `http://localhost:3000`.

## Deployment to Render
1. Push this repository to GitHub.
2. Sign in to [Render](https://dashboard.render.com/).
3. Click **New +** > **Static Site**.
4. Connect your GitHub repository.
5. Set:
   - **Build Command**: *(leave blank)*
   - **Publish Directory**: `.`
6. Click **Create Static Site**.
