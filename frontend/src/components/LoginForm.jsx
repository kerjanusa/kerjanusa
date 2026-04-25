import { useState } from 'react';
import useAuth from '../hooks/useAuth';
import '../styles/authForm.css';

const LoginForm = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const authData = await login(email, password);
      onSuccess?.(authData);
    } catch {
      // Error is handled by Zustand store
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="Email recruiter"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Ketik password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="auth-form-support">
        <label className="auth-form-remember" htmlFor="remember_device">
          <input
            id="remember_device"
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
            disabled={isLoading}
          />
          <span>Ingat perangkat ini</span>
        </label>
        <button type="button" className="auth-form-forgot" disabled={isLoading}>
          Lupa kata sandi?
        </button>
      </div>

      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading ? 'Memproses...' : 'Login'}
      </button>
    </form>
  );
};

export default LoginForm;
