import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiPost } from './api.js';

export default function Login({ onLogin }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await apiPost('/login', { username, password });
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-card">
      <h1>{t('app.title')}</h1>
      <p className="subtitle">{t('login.title')}</p>
      <form onSubmit={handleSubmit}>
        <label>
          {t('login.username')}
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          {t('login.password')}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? t('login.signingIn') : t('login.signIn')}
        </button>
      </form>
    </div>
  );
}
