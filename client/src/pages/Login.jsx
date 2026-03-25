import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clapperboard, LayoutDashboard, Car, Theater, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'coordinator') navigate('/dashboard');
      else navigate('/my-trips');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (role) => {
    const accounts = {
      coordinator: { email: 'coordinator@test.com', password: 'password123' },
      driver: { email: 'driver1@test.com', password: 'password123' },
      passenger: { email: 'actor1@test.com', password: 'password123' },
    };
    const acc = accounts[role];
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
    setLoading(true);
    try {
      const user = await login(acc.email, acc.password);
      if (user.role === 'coordinator') navigate('/dashboard');
      else navigate('/my-trips');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-ambient" />
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Clapperboard size={28} strokeWidth={2} />
          </div>
          <h1>TransportHQ</h1>
          <p>Production Transportation Management</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                className="form-input form-input-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@production.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                className="form-input form-input-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? (
              <><Loader2 size={18} className="spin-icon" /> Signing in...</>
            ) : (
              <>Sign In <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="login-divider">
          <span>Demo Access</span>
        </div>

        <div className="quick-login-buttons">
          <button onClick={() => quickLogin('coordinator')} className="quick-btn" disabled={loading}>
            <LayoutDashboard size={20} />
            <span className="quick-btn-label">Coordinator</span>
            <span className="quick-btn-desc">Full dashboard</span>
          </button>
          <button onClick={() => quickLogin('driver')} className="quick-btn" disabled={loading}>
            <Car size={20} />
            <span className="quick-btn-label">Driver</span>
            <span className="quick-btn-desc">Mobile view</span>
          </button>
          <button onClick={() => quickLogin('passenger')} className="quick-btn" disabled={loading}>
            <Theater size={20} />
            <span className="quick-btn-label">Actor</span>
            <span className="quick-btn-desc">Trip status</span>
          </button>
        </div>
      </div>
    </div>
  );
}
