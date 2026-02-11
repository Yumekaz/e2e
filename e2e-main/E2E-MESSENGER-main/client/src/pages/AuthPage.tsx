import React, { useState, FormEvent, ChangeEvent } from 'react';
import authService from '../services/authService';
import type { AuthPageProps, AuthUser } from '../types';

function AuthPage({ onAuth, encryptionReady }: AuthPageProps): JSX.Element {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isLogin && password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      let result;
      if (isLogin) {
        result = await authService.login(email, password);
      } else {
        result = await authService.register(email, username, password);
      }

      onAuth(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (): void => {
    setIsLogin(!isLogin);
    setError('');
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setUsername(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setConfirmPassword(e.target.value);
  };

  return (
    <div className="page auth-page">
      <div className="card">
        <div className="card-header">
          <div className="brand">
            <div className="brand-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4L4 14V34L24 44L44 34V14L24 4Z" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                <path d="M24 18C21.5 18 19 20.5 19 24C19 27.5 21.5 30 24 30C26.5 30 29 27.5 29 24C29 20.5 26.5 18 24 18Z" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                <path d="M24 12V18M24 30V36M12 20H19M29 20H36M14 28L19 25M29 25L34 28M14 16L19 21M29 21L34 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="brand-title">SecureChat</h1>
            <p className="brand-subtitle">
              {isLogin ? 'Sign in to your secure account' : 'Create a new secure account'}
            </p>
          </div>
        </div>
        
        <form className="form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"
              className="input"
              placeholder="Email address"
              value={email}
              onChange={handleEmailChange}
              required
              autoFocus
              autoComplete="email"
            />
          </div>
          
          {!isLogin && (
            <div className="input-group">
              <input
                type="text"
                className="input"
                placeholder="Username"
                value={username}
                onChange={handleUsernameChange}
                minLength={3}
                maxLength={20}
                pattern="^[a-zA-Z0-9_]+$"
                required
                autoComplete="username"
              />
            </div>
          )}
          
          <div className="input-group">
            <input
              type="password"
              className="input"
              placeholder="Password"
              value={password}
              onChange={handlePasswordChange}
              minLength={8}
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>
          
          {!isLogin && (
            <div className="input-group">
              <input
                type="password"
                className="input"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
          )}
          
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block btn-lg"
            disabled={loading || !encryptionReady}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </>
            ) : encryptionReady ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                {isLogin ? 'Sign In' : 'Create Account'}
              </>
            ) : (
              <>
                <span className="spinner"></span>
                Initializing...
              </>
            )}
          </button>
        </form>
        
        <div className="auth-switch">
          <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
          <button type="button" className="btn-link" onClick={toggleMode}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>

        <div className="security-info">
          <svg className="security-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4 6V12C4 17 8 21 12 22C16 21 20 17 20 12V6L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="security-content">
            <span className="security-title">End-to-End Encrypted</span>
            <span className="security-desc">Your messages are encrypted before they leave your device</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
