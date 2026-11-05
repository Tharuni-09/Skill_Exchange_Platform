import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './FriendSuggestions.css';

export default function FriendSuggestions() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suggestions'); // 'suggestions' | 'connected'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStream, setSelectedStream] = useState('All');
  const [message, setMessage] = useState('');
  const [activeZoomFriend, setActiveZoomFriend] = useState(null);

  useEffect(() => {
    fetchFriends();
  }, [user]);

  const fetchFriends = async () => {
    try {
      const email = user?.email || 'demo@skillswap.com';
      const res = await fetch(`/api/friends?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setFriends(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleConnect = async (friend) => {
    try {
      const email = user?.email || 'demo@skillswap.com';
      const res = await fetch('/api/friends/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, friendId: friend.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFriends(prev => prev.map(f => f.id === friend.id ? { ...f, connected: data.connected } : f));
      setMessage(data.message);
      setTimeout(() => setMessage(''), 3500);
    } catch (err) {
      setMessage(`Connection error: ${err.message}`);
      setTimeout(() => setMessage(''), 3500);
    }
  };

  const filteredFriends = friends.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          f.targetRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          f.skillsToTeach.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          f.skillsToLearn.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStream = selectedStream === 'All' || f.stream === selectedStream;
    const matchesTab = activeTab === 'suggestions' ? true : f.connected;

    return matchesSearch && matchesStream && matchesTab;
  });

  const connectedCount = friends.filter(f => f.connected).length;

  return (
    <div className="friends-page">
      <div className="page-container">
        {/* Hero Header */}
        <div className="friends-hero card fade-in">
          <div>
            <span className="badge badge-primary">🤝 Peer Learning & Study Buddies</span>
            <h1 className="friends-title">AI Study Buddy & Skill Swap Matcher</h1>
            <p className="friends-subtitle">
              Exchange skills directly with peers! Find study partners matched to your learning gaps, compare streaks, and launch 1-on-1 Zoom sessions to solve problems together.
            </p>
          </div>

          <div className="friends-hero-stats">
            <div className="fhs-item">
              <span className="fhs-val">{friends.length}+</span>
              <span className="fhs-lbl">Peer Learners</span>
            </div>
            <div className="fhs-item">
              <span className="fhs-val" style={{ color: '#10b981' }}>{connectedCount}</span>
              <span className="fhs-lbl">My Study Group</span>
            </div>
            <div className="fhs-item">
              <span className="fhs-val" style={{ color: '#f59e0b' }}>🔥 20d</span>
              <span className="fhs-lbl">Average Streak</span>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message && <div className="toast-banner fade-in">{message}</div>}

        {/* Controls */}
        <div className="friends-controls card">
          <div className="fc-tabs">
            <button
              className={`fc-tab ${activeTab === 'suggestions' ? 'active' : ''}`}
              onClick={() => setActiveTab('suggestions')}
            >
              🌟 Recommended Study Buddies ({friends.length})
            </button>
            <button
              className={`fc-tab ${activeTab === 'connected' ? 'active' : ''}`}
              onClick={() => setActiveTab('connected')}
            >
              👥 My Connected Friends ({connectedCount})
            </button>
          </div>

          <div className="fc-search-row">
            <div className="fc-search-wrap">
              <span className="fc-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search buddies by name, target role, or skills to swap (e.g. React, DSA, Python)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && <button className="clear-btn" onClick={() => setSearchTerm('')}>✕</button>}
            </div>

            <select value={selectedStream} onChange={(e) => setSelectedStream(e.target.value)}>
              <option value="All">All Streams</option>
              <option value="CS">CS Stream</option>
              <option value="IT">IT Stream</option>
              <option value="ECE">ECE Stream</option>
              <option value="Management">Management</option>
            </select>
          </div>
        </div>

        {/* Friends Grid */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /><p>Finding peer matches...</p></div>
        ) : filteredFriends.length === 0 ? (
          <div className="empty-state card">
            <span className="empty-icon">🤝</span>
            <h3>No study buddies found</h3>
            <p>
              {activeTab === 'connected'
                ? "You haven't connected with any study buddies yet. Switch to suggestions to send invites!"
                : 'Try adjusting your search terms or stream filters.'}
            </p>
          </div>
        ) : (
          <div className="friends-grid">
            {filteredFriends.map(friend => (
              <div key={friend.id} className="friend-card card fade-in">
                {/* Header */}
                <div className="friend-top">
                  <div className="friend-avatar-wrap">
                    <div className="friend-avatar">{friend.avatar}</div>
                    {friend.online && <span className="online-indicator" title="Online Now" />}
                  </div>

                  <div className="friend-id">
                    <div className="friend-name-row">
                      <h3 className="friend-name">{friend.name}</h3>
                      <span className="friend-match-badge">
                        ⚡ {friend.matchPercentage}% Match
                      </span>
                    </div>
                    <div className="friend-role">{friend.targetRole}</div>
                    <div className="friend-stream-tag">{friend.stream} • {friend.mutualFriends} mutual study buddies</div>
                  </div>
                </div>

                {/* Score & Streak Metrics */}
                <div className="friend-metrics-row">
                  <div className="fm-box">
                    <span className="fm-lbl">ML Score</span>
                    <span className="fm-val text-gradient">{friend.score}/100</span>
                  </div>
                  <div className="fm-box">
                    <span className="fm-lbl">Level</span>
                    <span className="fm-val">{friend.level}</span>
                  </div>
                  <div className="fm-box">
                    <span className="fm-lbl">Streak</span>
                    <span className="fm-val" style={{ color: '#f59e0b' }}>🔥 {friend.streak} Days</span>
                  </div>
                </div>

                {/* Skill Swap Breakdown */}
                <div className="skill-swap-box">
                  <div className="ss-col">
                    <span className="ss-lbl teach-lbl">Can Teach You:</span>
                    <div className="ss-tags">
                      {friend.skillsToTeach.map(s => <span key={s} className="ss-tag teach">{s}</span>)}
                    </div>
                  </div>

                  <div className="ss-divider">⇄</div>

                  <div className="ss-col">
                    <span className="ss-lbl learn-lbl">Wants to Learn:</span>
                    <div className="ss-tags">
                      {friend.skillsToLearn.map(s => <span key={s} className="ss-tag learn">{s}</span>)}
                    </div>
                  </div>
                </div>

                <p className="friend-bio">"{friend.bio}"</p>

                {/* Footer Action */}
                <div className="friend-footer">
                  <button
                    className={`btn btn-sm ${friend.connected ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => handleToggleConnect(friend)}
                  >
                    {friend.connected ? '✓ Connected' : '+ Add Study Buddy'}
                  </button>

                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => setActiveZoomFriend(friend)}
                  >
                    📹 1-on-1 Zoom
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 1-on-1 Zoom Session Modal */}
        {activeZoomFriend && (
          <div className="modal-backdrop" onClick={() => setActiveZoomFriend(null)}>
            <div className="modal-card card fade-in" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setActiveZoomFriend(null)}>✕</button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div className="friend-avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                  {activeZoomFriend.avatar}
                </div>
                <div>
                  <h2 className="modal-title" style={{ marginBottom: 2 }}>
                    Study Room with {activeZoomFriend.name}
                  </h2>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    {activeZoomFriend.targetRole} • 🔥 {activeZoomFriend.streak}-Day Streak
                  </div>
                </div>
              </div>

              <div className="card" style={{ background: 'var(--bg-card-light)', padding: 18, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="badge badge-success">Zoom Meeting Ready</span>
                  <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>⚡ +50 Streak XP on Join</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Meet with {activeZoomFriend.name} to solve algorithms, trade coding feedback, or practice interview questions.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <a
                  href={activeZoomFriend.zoomRoom}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  🚀 Launch Zoom Study Call
                </a>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(`Hey ${activeZoomFriend.name}, let's hop on Zoom for our SkillSwap study session!\n${activeZoomFriend.zoomRoom}`);
                    setMessage(`📋 Zoom invite copied! Send it to ${activeZoomFriend.name}.`);
                    setTimeout(() => setMessage(''), 3500);
                  }}
                >
                  📋 Copy Invite
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
