import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Register.css';

const STREAMS = ['CS', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Management', 'Other'];
const ROLES   = ['Student', 'Fresher', 'Working Professional', 'Educator', 'Researcher'];

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
    role: '', stream: '', specialization: ''
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email,
          password: form.password, role: form.role,
          stream: form.stream, specialization: form.specialization
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      login(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-blur" />
      <div className="auth-box register-box card fade-in">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">⚡</div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join SkillSwap and discover your skill level</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-msg">{error}</div>}

          <div className="register-grid">
            <div className="form-group">
              <label>Full Name *</label>
              <input name="name" type="text" placeholder="Your full name"
                value={form.name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input name="email" type="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input name="password" type="password" placeholder="Min 6 characters"
                value={form.password} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input name="confirm" type="password" placeholder="Repeat password"
                value={form.confirm} onChange={handleChange} />
            </div>
          </div>

          <div className="register-grid">
            <div className="form-group">
              <label>Role</label>
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="">Select role</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Stream / Branch</label>
              <select name="stream" value={form.stream} onChange={handleChange}>
                <option value="">Select stream</option>
                {STREAMS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Specialization (optional)</label>
            <input name="specialization" type="text" placeholder="e.g. Machine Learning, Web Dev"
              value={form.specialization} onChange={handleChange} />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? (
              <><span className="btn-spinner" /> Creating account...</>
            ) : 'Create Account →'}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Log in here</Link>
        </div>
      </div>
    </div>
  );
}
