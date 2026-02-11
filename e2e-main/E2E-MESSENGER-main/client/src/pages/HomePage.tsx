import React, { useState, FormEvent, ChangeEvent } from 'react';
import type { HomePageProps } from '../types';

function HomePage({ username, onCreateRoom, onJoinRoom }: HomePageProps): JSX.Element {
  const [roomCode, setRoomCode] = useState<string>('');
  const [showJoinForm, setShowJoinForm] = useState<boolean>(false);

  const handleJoin = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (roomCode.trim().length === 6) {
      onJoinRoom(roomCode.trim());
    }
  };

  const handleRoomCodeChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  };

  return (
    <div className="page home-page">
      <div className="card">
        {/* User Profile Section */}
        <div className="user-profile">
          <div className="avatar">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="user-label">Logged in as</div>
            <div className="user-name">{username}</div>
          </div>
          <div className="status-pill">
            Secure
          </div>
        </div>

        {/* Action Buttons */}
        <div className="actions">
          <button 
            className="action-btn"
            onClick={onCreateRoom}
          >
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="action-title">Create Room</span>
            <span className="action-desc">Start a new encrypted conversation</span>
          </button>

          <button 
            className="action-btn"
            onClick={() => setShowJoinForm(!showJoinForm)}
          >
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 3H19C20.1 3 21 3.9 21 5V19C21 20.1 20.1 21 19 21H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M10 17L15 12L10 7M15 12H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="action-title">Join Room</span>
            <span className="action-desc">Enter with a 6-digit code</span>
          </button>
        </div>

        {/* Join Room Form */}
        {showJoinForm && (
          <div className="join-section">
            <div className="join-header">
              <span className="join-title">Enter Room Code</span>
              <span className="code-hint">{roomCode.length}/6</span>
            </div>
            <form onSubmit={handleJoin}>
              <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
                <input
                  type="text"
                  className="input input-code"
                  placeholder="XXXXXX"
                  value={roomCode}
                  onChange={handleRoomCodeChange}
                  maxLength={6}
                  autoFocus
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary btn-block"
                disabled={roomCode.length !== 6}
              >
                Request to Join
              </button>
            </form>
          </div>
        )}

        {/* Features List */}
        <div className="features">
          <div className="feature-item">
            <span className="feature-icon">🔐</span>
            <div className="feature-content">
              <span className="feature-title">End-to-End Encrypted</span>
              <span className="feature-desc">Messages and files encrypted before leaving your device</span>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">👁️‍🗨️</span>
            <div className="feature-content">
              <span className="feature-title">Zero Knowledge</span>
              <span className="feature-desc">Server never sees plaintext content</span>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔑</span>
            <div className="feature-content">
              <span className="feature-title">Perfect Forward Secrecy</span>
              <span className="feature-desc">Unique keys for each session</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
