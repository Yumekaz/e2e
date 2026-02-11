import React, { useState, FormEvent, ChangeEvent } from 'react';

interface UsernamePageProps {
  onRegister: (name: string) => void;
  encryptionReady: boolean;
}

function UsernamePage({ onRegister, encryptionReady }: UsernamePageProps): JSX.Element {
  const [name, setName] = useState<string>('');

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (name.trim() && encryptionReady) {
      onRegister(name.trim());
    }
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setName(e.target.value);
  };

  return (
    <div className="page username-page">
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
            <p className="brand-subtitle">Enter a username to start an encrypted session. No account required.</p>
          </div>
        </div>
        
        <form className="form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              className="input"
              placeholder="Choose a username"
              value={name}
              onChange={handleNameChange}
              maxLength={20}
              autoFocus
              autoComplete="username"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block btn-lg"
            disabled={!name.trim() || !encryptionReady}
          >
            {encryptionReady ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L4 6V12C4 17 8 21 12 22C16 21 20 17 20 12V6L12 2Z"/>
                  <path d="M9 12L11 14L15 10"/>
                </svg>
                Start Secure Session
              </>
            ) : (
              <>
                <span className="spinner"></span>
                Generating Keys...
              </>
            )}
          </button>
        </form>

        <div className="security-info">
          <svg className="security-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4 6V12C4 17 8 21 12 22C16 21 20 17 20 12V6L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="security-content">
            <span className="security-title">Zero-Knowledge Encryption</span>
            <span className="security-desc">Messages are encrypted in your browser. The server cannot read them.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UsernamePage;
