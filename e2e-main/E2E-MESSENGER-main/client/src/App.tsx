import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket, { reconnectWithAuth } from './socket';
import { RoomEncryption } from './crypto/encryption';
import authService from './services/authService';

// Pages
import AuthPage from './pages/AuthPage';
import UsernamePage from './pages/UsernamePage';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';

// Components
import JoinRequestModal from './components/JoinRequestModal';
import { ToastContainer } from './components/Toast';

import './styles/app.css';

// Types
import type { AuthUser, JoinRequest } from './types';

type PageType = 'auth' | 'username' | 'home' | 'room';
type EncryptionStatus = 'initializing' | 'ready' | 'error';

interface RoomState {
  roomId: string;
  roomCode: string;
  isOwner: boolean;
  memberKeys: Record<string, string>;
  roomType?: 'legacy' | 'authenticated';
}

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

function App(): JSX.Element {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAuthenticated());
  const [useNewAuth, setUseNewAuth] = useState<boolean>(true);

  // App state
  const [currentPage, setCurrentPage] = useState<PageType>('auth');
  const [username, setUsername] = useState<string>('');
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [encryptionStatus, setEncryptionStatus] = useState<EncryptionStatus>('initializing');

  // Refs
  const encryptionRef = useRef<RoomEncryption | null>(null);
  const pendingRoomCodeRef = useRef<string | null>(null);

  // Toast helper
  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info'): void => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string): void => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Check for room code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      pendingRoomCodeRef.current = roomParam;
      if (!authService.isAuthenticated()) {
        setUseNewAuth(false);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Initialize encryption
  useEffect(() => {
    const initEncryption = async (): Promise<void> => {
      try {
        if (!window.crypto || !window.crypto.subtle) {
          throw new Error('Web Crypto API not available');
        }
        encryptionRef.current = new RoomEncryption();
        await encryptionRef.current.initialize();
        setEncryptionStatus('ready');
      } catch (err) {
        console.error('Encryption init failed:', err);
        setEncryptionStatus('error');
      }
    };
    initEncryption();
  }, []);

  // Check existing auth on mount
  useEffect(() => {
    if (authService.isAuthenticated()) {
      const user = authService.getUser();
      if (user) {
        setUsername(user.username);
        setIsAuthenticated(true);
        setCurrentPage('home');
        reconnectWithAuth();

        const tryRegister = () => {
          if (socket.connected && encryptionRef.current?.publicKeyExported) {
            socket.emit('register', {
              username: user.username,
              publicKey: encryptionRef.current.publicKeyExported
            });
          } else if (!socket.connected) {
            socket.on('connect', registerOnConnect);
          }
        };

        const registerOnConnect = () => {
          if (encryptionRef.current && encryptionRef.current.publicKeyExported) {
            socket.emit('register', {
              username: user.username,
              publicKey: encryptionRef.current.publicKeyExported
            });
          }
          socket.off('connect', registerOnConnect);
        };

        setTimeout(tryRegister, 500);
      }
    } else if (useNewAuth) {
      setCurrentPage('auth');
    } else {
      setCurrentPage('username');
    }
  }, [useNewAuth]);

  // Handle socket connection/reconnection
  useEffect(() => {
    const handleConnect = () => {
      const user = authService.getUser();
      const currentUsername = user?.username || username;

      if (currentUsername && encryptionRef.current?.publicKeyExported) {
        socket.emit('register', {
          username: currentUsername,
          publicKey: encryptionRef.current.publicKeyExported
        });
      }
    };

    socket.on('connect', handleConnect);

    if (socket.connected && username && encryptionRef.current?.publicKeyExported) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [username, encryptionStatus]);

  // Socket event listeners
  useEffect(() => {
    socket.on('registered', ({ username: acceptedUsername }: { username: string }) => {
      setUsername(acceptedUsername);
      setCurrentPage('home');
      showToast('Secure session started', 'success');

      if (pendingRoomCodeRef.current) {
        handleJoinRoom(pendingRoomCodeRef.current);
        pendingRoomCodeRef.current = null;
      }
    });

    socket.on('username-taken', () => {
      showToast('Username taken. Try another!', 'error');
    });

    socket.on('room-created', async ({ roomId, roomCode, roomType }: { roomId: string; roomCode: string; roomType?: 'legacy' | 'authenticated' }) => {
      if (encryptionRef.current) {
        await encryptionRef.current.setRoomKey(roomCode, [encryptionRef.current.publicKeyExported!]);

        setCurrentRoom({
          roomId,
          roomCode,
          isOwner: true,
          memberKeys: { [username]: encryptionRef.current.publicKeyExported! },
          roomType: roomType || 'legacy'
        });
        setCurrentPage('room');
        showToast(`Room ${roomCode} created`, 'success');
      }
    });

    socket.on('join-request', ({ requestId, username: requesterName, publicKey, roomId }: JoinRequest & { roomId: string }) => {
      setJoinRequests(prev => [...prev, { requestId, username: requesterName, publicKey, roomId }]);
      showToast(`${requesterName} wants to join`, 'info');
    });

    socket.on('join-approved', async ({ roomId, roomCode, roomType, memberKeys }: { roomId: string; roomCode: string; roomType?: 'legacy' | 'authenticated'; memberKeys: Record<string, string> }) => {
      if (encryptionRef.current) {
        await encryptionRef.current.setRoomKey(roomCode, Object.values(memberKeys));

        setCurrentRoom({ roomId, roomCode, isOwner: false, memberKeys, roomType: roomType || 'legacy' });
        setCurrentPage('room');
        showToast('Joined secure room', 'success');
      }
    });

    socket.on('join-denied', () => {
      showToast('Join request denied', 'error');
    });

    socket.on('error', ({ message }: { message: string }) => {
      showToast(message, 'error');
    });

    socket.on('room-closed', () => {
      setCurrentRoom(null);
      setCurrentPage('home');
      showToast('Room was closed by owner', 'error');
    });

    return () => {
      socket.off('registered');
      socket.off('username-taken');
      socket.off('room-created');
      socket.off('join-request');
      socket.off('join-approved');
      socket.off('join-denied');
      socket.off('error');
      socket.off('room-closed');
    };
  }, [username, showToast]);

  // Auth handlers
  const handleAuth = async (user: AuthUser): Promise<void> => {
    setUsername(user.username);
    setIsAuthenticated(true);
    reconnectWithAuth();

    const registerAfterConnect = () => {
      if (encryptionStatus === 'ready' && encryptionRef.current && encryptionRef.current.publicKeyExported) {
        socket.emit('register', {
          username: user.username,
          publicKey: encryptionRef.current.publicKeyExported
        });
      }
      socket.off('connect', registerAfterConnect);
    };

    if (socket.connected) {
      registerAfterConnect();
    } else {
      socket.on('connect', registerAfterConnect);
    }
  };

  const handleLogout = async (): Promise<void> => {
    await authService.logout();
    setIsAuthenticated(false);
    setUsername('');
    setCurrentPage('auth');
    setCurrentRoom(null);
    showToast('Logged out successfully', 'success');
  };

  // Legacy username registration
  const handleRegister = async (name: string): Promise<void> => {
    if (encryptionStatus !== 'ready' || !encryptionRef.current || !encryptionRef.current.publicKeyExported) {
      showToast('Encryption initializing...', 'info');
      return;
    }

    socket.emit('register', {
      username: name,
      publicKey: encryptionRef.current.publicKeyExported
    });
  };

  // Room handlers
  const handleCreateRoom = (): void => {
    socket.emit('create-room');
  };

  const handleJoinRoom = (roomCode: string): void => {
    socket.emit('request-join', { roomCode: roomCode.toUpperCase() });
    showToast('Join request sent...', 'info');
  };

  const handleApproveJoin = async ({ requestId }: { requestId: string }): Promise<void> => {
    socket.emit('approve-join', { requestId });
    setJoinRequests(prev => prev.filter(req => req.requestId !== requestId));
  };

  const handleDenyJoin = (requestId: string): void => {
    socket.emit('deny-join', { requestId });
    setJoinRequests(prev => prev.filter(req => req.requestId !== requestId));
  };

  const handleUpdateRoomKey = async (memberKeys: Record<string, string>): Promise<void> => {
    if (currentRoom && encryptionRef.current) {
      await encryptionRef.current.setRoomKey(currentRoom.roomCode, Object.values(memberKeys));
      setCurrentRoom(prev => prev ? { ...prev, memberKeys } : null);
    }
  };

  const handleLeaveRoom = (): void => {
    if (currentRoom) {
      socket.emit('leave-room', { roomId: currentRoom.roomId });
    }
    setCurrentRoom(null);
    setCurrentPage('home');
  };

  // Toggle auth mode
  const toggleAuthMode = (): void => {
    setUseNewAuth(!useNewAuth);
    setCurrentPage(useNewAuth ? 'username' : 'auth');
  };

  return (
    <div className="app">
      {/* Top Navigation Bar */}
      <header className="status-bar">
        <div className="status-brand">
          <div className="status-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4 6V12C4 17 8 21 12 22C16 21 20 17 20 12V6L12 2Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span>SecureChat</span>
        </div>
        
        <div className="status-actions">
          <div className="status-indicator">
            <div className={`status-dot ${encryptionStatus}`}></div>
            <span>{encryptionStatus === 'ready' ? 'Encrypted' : 'Initializing...'}</span>
          </div>
          {isAuthenticated && (
            <button className="status-btn" onClick={handleLogout} title="Logout">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Encryption Error Screen */}
      {encryptionStatus === 'error' && (
        <div className="error-screen">
          <div className="error-icon">⚠️</div>
          <h2 className="error-title">Security Feature Restricted</h2>
          <p className="error-desc">
            This app uses <strong>Web Crypto API</strong> for end-to-end encryption.
            Modern browsers block this API on insecure connections.
          </p>
          <div className="error-box">
            <h3 className="error-box-title">How to fix (Chrome/Edge/Brave):</h3>
            <ol className="error-steps">
              <li>
                <span>Open:</span>
                <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>
              </li>
              <li>Enable the flag</li>
              <li>
                <span>Add:</span>
                <code style={{ color: 'var(--primary)' }}>{window.location.origin}</code>
              </li>
              <li>Relaunch browser</li>
            </ol>
          </div>
          <button 
            className="btn btn-primary btn-lg" 
            onClick={() => window.location.reload()}
            style={{ marginTop: 'var(--space-6)' }}
          >
            Reload App
          </button>
        </div>
      )}

      {/* Main Content */}
      {currentPage === 'auth' && useNewAuth && (
        <AuthPage
          onAuth={handleAuth}
          encryptionReady={encryptionStatus === 'ready'}
        />
      )}

      {currentPage === 'username' && !useNewAuth && (
        <UsernamePage
          onRegister={handleRegister}
          encryptionReady={encryptionStatus === 'ready'}
        />
      )}

      {currentPage === 'home' && (
        <HomePage
          username={username}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {currentPage === 'room' && currentRoom && encryptionRef.current && (
        <RoomPage
          roomId={currentRoom.roomId}
          roomCode={currentRoom.roomCode}
          username={username}
          isOwner={currentRoom.isOwner}
          encryption={encryptionRef.current}
          onUpdateRoomKey={handleUpdateRoomKey}
          onLeave={handleLeaveRoom}
          roomType={currentRoom.roomType}
        />
      )}

      {/* Join Request Modal */}
      {joinRequests.length > 0 && (
        <JoinRequestModal
          requests={joinRequests}
          onApprove={handleApproveJoin}
          onDeny={handleDenyJoin}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Dev toggle for auth mode */}
      {(currentPage === 'auth' || currentPage === 'username') && (
        <button
          onClick={toggleAuthMode}
          className="dev-toggle"
        >
          {useNewAuth ? 'Use Legacy Mode' : 'Use Auth Mode'}
        </button>
      )}
    </div>
  );
}

export default App;
