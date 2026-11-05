import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './Classes.css';

const CATEGORIES = ['All', 'Computer Science', 'Web Development', 'AI & Data Science', 'System Architecture', 'Hardware & IoT', 'Cloud & DevOps', 'Management', 'Design'];
const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

export default function Classes() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [viewOnlyEnrolled, setViewOnlyEnrolled] = useState(false);
  const [activeModalClass, setActiveModalClass] = useState(null);
  const [message, setMessage] = useState('');
  
  // Instant Zoom Room State
  const [zoomModalOpen, setZoomModalOpen] = useState(false);
  const [instantRoom, setInstantRoom] = useState(null);
  const [roomTopic, setRoomTopic] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const fetchClasses = async () => {
    try {
      const url = user?.email ? `/api/classes?email=${encodeURIComponent(user.email)}` : '/api/classes';
      const res = await fetch(url);
      const data = await res.json();
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnroll = async (cls) => {
    if (!user) {
      setMessage('Please log in to enroll in live classes and earn skill points.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    try {
      const res = await fetch('/api/classes/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, classId: cls.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setClasses(prev => prev.map(c => {
        if (c.id === cls.id) {
          const newEnrolled = data.enrolled;
          return {
            ...c,
            enrolled: newEnrolled,
            enrolledCount: newEnrolled ? c.enrolledCount + 1 : Math.max(0, c.enrolledCount - 1)
          };
        }
        return c;
      }));

      setMessage(data.message);
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setMessage(err.message || 'Enrollment failed');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleCreateInstantZoom = async (e) => {
    e.preventDefault();
    setCreatingRoom(true);
    try {
      const res = await fetch('/api/zoom/instant-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: roomTopic || 'Peer Skill Exchange Study Session' })
      });
      const data = await res.json();
      setInstantRoom(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingRoom(false);
    }
  };

  const filteredClasses = classes.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesLevel = selectedLevel === 'All' || c.level === selectedLevel;
    const matchesEnrolled = !viewOnlyEnrolled || c.enrolled;

    return matchesSearch && matchesCategory && matchesLevel && matchesEnrolled;
  });

  return (
    <div className="classes-page">
      <div className="page-container">
        {/* Header Banner */}
        <div className="classes-hero card fade-in">
          <div className="classes-hero-content">
            <span className="badge badge-primary">📹 Live Zoom Masterclasses & Peer Rooms</span>
            <h1 className="classes-title">Upskill with Top Industry Experts on Zoom</h1>
            <p className="classes-subtitle">
              Join interactive, hands-on live Zoom classes. Solve problems together, design systems, and auto-sync classes into your personal timetable maker.
            </p>
            <div className="classes-cta-row" style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setZoomModalOpen(true)}>
                📹 Start Instant 1-on-1 Zoom Room
              </button>
              <Link to="/timetable" className="btn btn-secondary btn-sm">
                📅 Open Timetable Maker
              </Link>
            </div>
          </div>
          <div className="classes-hero-stats">
            <div className="chs-item">
              <span className="chs-val">8+</span>
              <span className="chs-lbl">Active Classes</span>
            </div>
            <div className="chs-item">
              <span className="chs-val">1,200+</span>
              <span className="chs-lbl">Students Enrolled</span>
            </div>
            <div className="chs-item">
              <span className="chs-val">4.9 ★</span>
              <span className="chs-lbl">Average Rating</span>
            </div>
          </div>
        </div>

        {/* Notification Toast */}
        {message && <div className="toast-banner fade-in">{message}</div>}

        {/* Search & Filter Bar */}
        <div className="classes-filter-bar card">
          <div className="cf-search">
            <span className="cf-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by topic, instructor, or skill (e.g. Graph, React, Python)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <button className="clear-btn" onClick={() => setSearchTerm('')}>✕</button>}
          </div>

          <div className="cf-selectors">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
              {LEVELS.map(lvl => <option key={lvl} value={lvl}>{lvl === 'All' ? 'All Skill Levels' : lvl}</option>)}
            </select>

            {user && (
              <button
                className={`filter-pill-btn ${viewOnlyEnrolled ? 'active' : ''}`}
                onClick={() => setViewOnlyEnrolled(!viewOnlyEnrolled)}
              >
                {viewOnlyEnrolled ? '✓ Showing Enrolled' : 'My Enrolled Classes'}
              </button>
            )}
          </div>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /><p>Loading classes...</p></div>
        ) : filteredClasses.length === 0 ? (
          <div className="empty-state card">
            <span className="empty-icon">📚</span>
            <h3>No classes found</h3>
            <p>Try adjusting your search criteria or filters.</p>
            <button className="btn btn-secondary btn-sm" onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedLevel('All'); setViewOnlyEnrolled(false); }}>
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="classes-grid">
            {filteredClasses.map(cls => {
              const spotsLeft = cls.maxCapacity - cls.enrolledCount;
              const hasZoom = cls.zoom?.joinUrl;
              return (
                <div key={cls.id} className={`class-card card fade-in ${cls.enrolled ? 'is-enrolled' : ''}`}>
                  <div className="class-top">
                    <span className="class-category">{cls.category}</span>
                    <span className={`badge badge-${cls.level === 'Expert' ? 'warning' : cls.level === 'Advanced' ? 'primary' : 'success'}`}>
                      {cls.level}
                    </span>
                  </div>

                  <h3 className="class-title" onClick={() => setActiveModalClass(cls)}>{cls.title}</h3>
                  <p className="class-desc">{cls.description}</p>

                  {/* Zoom Status Box */}
                  {hasZoom && (
                    <div className="class-zoom-banner">
                      <div className="cz-left">
                        <span className="cz-icon">📹</span>
                        <div className="cz-info">
                          <span className="cz-status">{cls.zoom.statusText}</span>
                          <span className="cz-details">ID: {cls.zoom.meetingId} • Passcode: {cls.zoom.passcode}</span>
                        </div>
                      </div>
                      <a
                        href={cls.zoom.joinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`btn btn-sm ${cls.zoom.isLive ? 'btn-danger pulse-live' : 'btn-secondary'}`}
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        {cls.zoom.isLive ? '🔴 Join Zoom' : 'Open Zoom'}
                      </a>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="class-tags">
                    {cls.tags.map(t => <span key={t} className="class-tag">{t}</span>)}
                  </div>

                  {/* Instructor Info */}
                  <div className="instructor-box">
                    <div className="instructor-avatar">{cls.instructor.avatar}</div>
                    <div className="instructor-info">
                      <div className="instructor-name">{cls.instructor.name}</div>
                      <div className="instructor-role">{cls.instructor.role}</div>
                    </div>
                    <div className="class-rating">★ {cls.instructor.rating}</div>
                  </div>

                  {/* Schedule & Duration */}
                  <div className="class-meta">
                    <div className="meta-line"><span>📅</span> {cls.schedule}</div>
                    <div className="meta-line"><span>⏳</span> {cls.duration}</div>
                    <div className="meta-line">
                      <span>👥</span> {cls.enrolledCount} enrolled ({spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'})
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="class-footer">
                    <div className="skill-points">
                      <span>⚡ +{cls.skillPoints} pts</span>
                    </div>
                    <div className="card-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActiveModalClass(cls)}
                      >
                        Details
                      </button>
                      <button
                        className={`btn btn-sm ${cls.enrolled ? 'btn-success' : 'btn-primary'}`}
                        onClick={() => handleToggleEnroll(cls)}
                      >
                        {cls.enrolled ? '✓ Enrolled' : 'Enroll Now'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Instant Zoom Room Modal */}
        {zoomModalOpen && (
          <div className="modal-backdrop" onClick={() => setZoomModalOpen(false)}>
            <div className="modal-card card fade-in" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setZoomModalOpen(false)}>✕</button>
              <h2 className="modal-title">📹 Instant Peer Zoom Room</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                Create an instant Zoom meeting room for peer study, live debugging, or skill exchange session with friends.
              </p>

              {!instantRoom ? (
                <form onSubmit={handleCreateInstantZoom}>
                  <div className="form-group">
                    <label>Study Topic / Session Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Graph Algorithms Practice with Rahul"
                      value={roomTopic}
                      onChange={(e) => setRoomTopic(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} disabled={creatingRoom}>
                    {creatingRoom ? 'Generating Room...' : '🚀 Create Instant Zoom Room'}
                  </button>
                </form>
              ) : (
                <div className="instant-room-created card" style={{ background: 'var(--bg-card-light)', padding: 20 }}>
                  <span className="badge badge-success" style={{ marginBottom: 8 }}>✓ Room Ready!</span>
                  <h3 style={{ fontSize: 18, marginBottom: 12 }}>{instantRoom.topic}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, marginBottom: 16 }}>
                    <div><strong>Meeting ID:</strong> {instantRoom.meetingId}</div>
                    <div><strong>Passcode:</strong> {instantRoom.passcode}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <a href={instantRoom.joinUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1 }}>
                      📹 Join Zoom Call Now
                    </a>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(`Join my SkillSwap Zoom study room!\nLink: ${instantRoom.joinUrl}\nID: ${instantRoom.meetingId}\nPasscode: ${instantRoom.passcode}`);
                        setMessage('📋 Zoom invite details copied to clipboard!');
                        setTimeout(() => setMessage(''), 3500);
                      }}
                    >
                      📋 Copy Invite
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Class Detail Modal */}
        {activeModalClass && (
          <div className="modal-backdrop" onClick={() => setActiveModalClass(null)}>
            <div className="modal-card card fade-in" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setActiveModalClass(null)}>✕</button>
              <div className="modal-category">{activeModalClass.category} • {activeModalClass.level} Level</div>
              <h2 className="modal-title">{activeModalClass.title}</h2>

              {activeModalClass.zoom?.joinUrl && (
                <div className="class-zoom-banner modal-zoom-box">
                  <div className="cz-left">
                    <span className="cz-icon">📹</span>
                    <div className="cz-info">
                      <span className="cz-status" style={{ fontSize: 14 }}>{activeModalClass.zoom.statusText}</span>
                      <span className="cz-details">Zoom Meeting ID: <strong>{activeModalClass.zoom.meetingId}</strong> • Passcode: <strong>{activeModalClass.zoom.passcode}</strong></span>
                    </div>
                  </div>
                  <a
                    href={activeModalClass.zoom.joinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-danger btn-sm"
                  >
                    Open in Zoom App 🚀
                  </a>
                </div>
              )}

              <div className="instructor-box modal-instructor">
                <div className="instructor-avatar">{activeModalClass.instructor.avatar}</div>
                <div>
                  <div className="instructor-name">{activeModalClass.instructor.name}</div>
                  <div className="instructor-role">{activeModalClass.instructor.role}</div>
                </div>
                <div className="class-rating">★ {activeModalClass.instructor.rating} Rating</div>
              </div>

              <div className="modal-section">
                <h4>Class Overview</h4>
                <p>{activeModalClass.description}</p>
              </div>

              <div className="modal-section">
                <h4>Prerequisites</h4>
                <p className="prereq-text">{activeModalClass.prerequisites}</p>
              </div>

              <div className="modal-grid-meta">
                <div className="mg-item"><strong>Schedule:</strong> {activeModalClass.schedule}</div>
                <div className="mg-item"><strong>Duration:</strong> {activeModalClass.duration}</div>
                <div className="mg-item"><strong>Stream Fit:</strong> {activeModalClass.stream}</div>
                <div className="mg-item"><strong>Bonus Skill Points:</strong> +{activeModalClass.skillPoints} Points</div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: 10 }}>
                <Link to="/timetable" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center' }}>
                  📅 View in Timetable
                </Link>
                <button
                  className={`btn ${activeModalClass.enrolled ? 'btn-success' : 'btn-primary'}`}
                  style={{ flex: 1.5 }}
                  onClick={() => {
                    handleToggleEnroll(activeModalClass);
                    setActiveModalClass(prev => prev ? { ...prev, enrolled: !prev.enrolled } : null);
                  }}
                >
                  {activeModalClass.enrolled ? '✓ Enrolled (Click to Leave)' : 'Enroll in this Masterclass →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
