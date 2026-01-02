import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

// Predefined credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '1234';
const STAFF_USERNAME = 'agent';
const STAFF_PASSWORD = '1234';

interface LoginProps {
  onLogin: (role: 'full' | 'limited') => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      onLogin('full');
      navigate('/dashboard');
      return;
    }

    if (username === STAFF_USERNAME && password === STAFF_PASSWORD) {
      onLogin('limited');
      navigate('/bons');
      return;
    }

    setError('Invalid username or password');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Web-Pense</h1>
        <h2>Inventory & Expense Management</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-button">
            Login
          </button>
        </form>
        <div className="login-hint">
          <p>Full access: admin / 1234</p>
          <p>Frais+Bons only: agent / 1234</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
