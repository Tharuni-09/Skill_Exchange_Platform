import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './Timetable.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOT_TYPES = [
  'Live Masterclass',
  'Peer Zoom Exchange',
  'DSA / Problem Solving',
  'ML Assessment',
  'Self Study',
  'Project Building'
];

const TYPE_COLORS = {
  'Live Masterclass': { bg: 'rgba(99,102,241,0.2)', border: '#6366f1', text: '#818cf8' },
  'Peer Zoom Exchange': { bg: 'rgba(16,185,129,0.2)', border: '#10b981', text: '#34d399' },
  'DSA / Problem Solving': { bg: 'rgba(245,158,11,0.2)', border: '#f59e0b', text: '#fbbf24' },
  'ML Assessment': { bg: 'rgba(239,68,68,0.2)', border: '#ef4444', text: '#f87171' },
  'Self Study': { bg: 'rgba(139,92,246,0.2)', border: '#8b5cf6', text: '#a78bfa' },
  'Project Building': { bg: 'rgba(6,182,212,0.2)', border: '#06b6d4', text: '#22d3ee' }
};

export default function Timetable() {
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDayFilter, setActiveDayFilter] = useState('All');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [message, setMessage] = useState('');

  // New slot form
  const [newTitle, setNewTitle] = useState('');
  const [newDay, setNewDay] = useState('Monday');
  const [newTime, setNewTime] = useState('17:00');
  const [newDuration, setNewDuration] = useState('60m');
  const [newType, setNewType] = useState('DSA / Problem Solving');
  const [newZoomUrl, setNewZoomUrl] = useState('');

  useEffect(() => {
    fetchTimetable();
  }, [user]);

  const fetchTimetable = async () => {
    try {
      const email = user?.email || 'demo@skillswap.com';
      const res = await fetch(`/api/timetable?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const email = user?.email || 'demo@skillswap.com';
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          title: newTitle,
          day: newDay,
          startTime: newTime,
          duration: newDuration,
          type: newType,
          zoomUrl: newZoomUrl
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSlots(prev => [...prev, data.slot]);
      setMessage('✅ Slot added to your weekly timetable!');
      setTimeout(() => setMessage(''), 3500);

      // Reset
      setNewTitle('');
      setNewZoomUrl('');
      setAddModalOpen(false);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
      setTimeout(() => setMessage(''), 3500);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    try {
      await fetch(`/api/timetable/${slotId}`, { method: 'DELETE' });
      setSlots(prev => prev.filter(s => s.id !== slotId));
      setMessage('🗑️ Slot removed from timetable');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Group slots by Day
  const slotsByDay = DAYS.reduce((acc, day) => {
    acc[day] = slots.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {});

  const displayedDays = activeDayFilter === 'All' ? DAYS : [activeDayFilter];

  return (
    <div className="timetable-page">
      <div className="page-container">
        {/* Top Header */}
        <div className="timetable-hero card fade-in">
          <div>
            <span className="badge badge-primary">📅 Smart Study & Zoom Schedule Planner</span>
            <h1 className="tt-title">Weekly Timetable Maker</h1>
            <p className="tt-subtitle">
              Plan your learning consistency. Your enrolled Zoom masterclasses are auto-synced here. Schedule self-study, peer problem-solving slots, and maintain your streak!
            </p>
          </div>

          <div className="tt-hero-actions">
            <button className="btn btn-primary" onClick={() => setAddModalOpen(true)}>
              ➕ Add Study / Zoom Slot
            </button>
            <button className="btn btn-secondary" onClick={() => window.print()}>
              🖨️ Export / Print Schedule
            </button>
          </div>
        </div>

        {/* Message Toast */}
        {message && <div className="toast-banner fade-in">{message}</div>}

        {/* Day Filter Pills */}
        <div className="tt-day-filter-bar card">
          <div className="tt-days-list">
            <button
              className={`tt-day-btn ${activeDayFilter === 'All' ? 'active' : ''}`}
              onClick={() => setActiveDayFilter('All')}
            >
              All Days ({slots.length})
            </button>
            {DAYS.map(day => (
              <button
                key={day}
                className={`tt-day-btn ${activeDayFilter === day ? 'active' : ''}`}
                onClick={() => setActiveDayFilter(day)}
              >
                {day} ({slotsByDay[day]?.length || 0})
              </button>
            ))}
          </div>

          <div className="tt-legend">
            {Object.keys(TYPE_COLORS).map(type => (
              <div key={type} className="legend-item">
                <span className="legend-dot" style={{ background: TYPE_COLORS[type].border }} />
                <span>{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Timetable Grid */}
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /><p>Loading timetable...</p></div>
        ) : (
          <div className="timetable-grid">
            {displayedDays.map(day => {
              const daySlots = slotsByDay[day] || [];
              const isToday = DAYS[(new Date().getDay() + 6) % 7] === day;

              return (
                <div key={day} className={`day-column card ${isToday ? 'is-today' : ''}`}>
                  <div className="day-column-header">
                    <div>
                      <h3 className="day-title">{day}</h3>
                      {isToday && <span className="today-badge">Today</span>}
                    </div>
                    <span className="day-slots-count">{daySlots.length} sessions</span>
                  </div>

                  <div className="day-slots-container">
                    {daySlots.length === 0 ? (
                      <div className="empty-day-slot">
                        <span>No sessions scheduled</span>
                        <button
                          className="btn-add-mini"
                          onClick={() => {
                            setNewDay(day);
                            setAddModalOpen(true);
                          }}
                        >
                          + Add slot
                        </button>
                      </div>
                    ) : (
                      daySlots.map(slot => {
                        const styleInfo = TYPE_COLORS[slot.type] || TYPE_COLORS['Self Study'];
                        return (
                          <div
                            key={slot.id}
                            className="slot-card fade-in"
                            style={{
                              background: styleInfo.bg,
                              borderLeft: `4px solid ${styleInfo.border}`
                            }}
                          >
                            <div className="slot-top">
                              <span className="slot-time">⏰ {slot.startTime} ({slot.duration})</span>
                              <span className="slot-type" style={{ color: styleInfo.text }}>
                                {slot.type}
                              </span>
                            </div>

                            <h4 className="slot-title">{slot.title}</h4>

                            {slot.instructor && (
                              <div className="slot-instructor">Instructor: {slot.instructor}</div>
                            )}

                            {/* Zoom Link Button */}
                            {slot.zoomUrl ? (
                              <div className="slot-zoom-actions">
                                <a
                                  href={slot.zoomUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-join-zoom"
                                >
                                  📹 Join Zoom Meet
                                </a>
                                {slot.passcode && (
                                  <span className="slot-passcode">Pass: {slot.passcode}</span>
                                )}
                              </div>
                            ) : null}

                            {/* Delete custom slot */}
                            {!slot.autoImported && (
                              <button
                                className="slot-delete-btn"
                                title="Remove slot"
                                onClick={() => handleDeleteSlot(slot.id)}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Slot Modal */}
        {addModalOpen && (
          <div className="modal-backdrop" onClick={() => setAddModalOpen(false)}>
            <div className="modal-card card fade-in" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setAddModalOpen(false)}>✕</button>
              <h2 className="modal-title">➕ Schedule Timetable Slot</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                Add your self-study blocks, Zoom peer sessions, or coding practice to stay on track.
              </p>

              <form onSubmit={handleAddSlot} className="add-slot-form">
                <div className="form-group">
                  <label>Session Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Graph Algorithms LeetCode / Peer Zoom Call"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Day of Week *</label>
                    <select value={newDay} onChange={(e) => setNewDay(e.target.value)}>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Start Time (24h) *</label>
                    <input
                      type="time"
                      required
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Duration</label>
                    <select value={newDuration} onChange={(e) => setNewDuration(e.target.value)}>
                      <option value="30m">30 Minutes</option>
                      <option value="45m">45 Minutes</option>
                      <option value="60m">1 Hour</option>
                      <option value="90m">1.5 Hours</option>
                      <option value="120m">2 Hours</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Session Category</label>
                    <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                      {SLOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Zoom Meeting Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/84920193847?pwd=..."
                    value={newZoomUrl}
                    onChange={(e) => setNewZoomUrl(e.target.value)}
                  />
                </div>

                <div className="modal-actions" style={{ marginTop: 20 }}>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    Save to My Timetable 🚀
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
