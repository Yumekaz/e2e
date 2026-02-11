import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import socket from '../socket';
import { QRCodeCanvas } from 'qrcode.react';
import ConfirmModal from '../components/ConfirmModal';
import FileUpload from '../components/FileUpload';
import MessageAttachment from '../components/MessageAttachment';
import fileService from '../services/fileService';
import { useScreenshotDetection, useBlurOnUnfocus } from '../hooks';
import type { 
  RoomPageProps, 
  DecryptedMessage, 
  SystemMessage, 
  Message, 
  Attachment,
  EncryptedMessage,
  DeleteType
} from '../types';

// Extended attachment type with encryption
interface EncryptedAttachmentData extends Attachment {
  encrypted?: boolean;
  iv?: string | null;
  metadata?: string | null;
  decryptedUrl?: string;
}

// Message with possible attachment
interface MessageWithAttachment extends DecryptedMessage {
  attachment?: EncryptedAttachmentData;
}

function RoomPage({
  roomId,
  roomCode,
  username,
  isOwner,
  encryption,
  onUpdateRoomKey,
  onLeave,
  roomType = 'legacy'
}: RoomPageProps): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [showMembers, setShowMembers] = useState<boolean>(false);
  const [showRoomInfo, setShowRoomInfo] = useState<boolean>(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState<boolean>(false);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  
  // Message deletion state
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  
  // Privacy settings state
  const [screenshotDetectionEnabled, setScreenshotDetectionEnabled] = useState<boolean>(true);
  const [blurOnUnfocusEnabled, setBlurOnUnfocusEnabled] = useState<boolean>(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  const userHasScrolledRef = useRef<boolean>(false);

  // Blur on unfocus hook
  const { isBlurred, manualBlur, manualUnblur } = useBlurOnUnfocus({
    enabled: blurOnUnfocusEnabled,
    blurDelay: 500
  });

  // Screenshot detection hook
  const handleScreenshotDetected = useCallback(() => {
    // Emit to other users that screenshot was taken
    socket.emit('screenshot-detected', { roomId, username });
    
    // Add local system message
    setMessages(prev => [...prev, {
      type: 'system',
      text: `⚠️ You took a screenshot`,
      timestamp: Date.now()
    } as SystemMessage]);
  }, [roomId, username]);

  useScreenshotDetection({
    onScreenshot: handleScreenshotDetected,
    enabled: screenshotDetectionEnabled
  });

  // Decrypt an attachment and return a blob URL
  const decryptAttachment = async (attachment: EncryptedAttachmentData): Promise<string | null> => {
    if (!attachment.encrypted || !attachment.iv || !attachment.metadata) {
      return attachment.url;
    }

    try {
      const encryptedBlob = await fileService.downloadEncryptedFile(attachment.url);
      const decrypted = await encryption.decryptFile(
        encryptedBlob,
        attachment.iv,
        attachment.metadata
      );
      return URL.createObjectURL(decrypted.blob);
    } catch (error) {
      console.error('Failed to decrypt attachment:', error);
      return null;
    }
  };

  useEffect(() => {
    encryption.getFingerprint().then(setFingerprint);

    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => setServerUrl(data.url))
      .catch(() => setServerUrl(window.location.origin));

    socket.emit('join-room', { roomId });

    socket.on('room-data', async ({ members: roomMembers, memberKeys, encryptedMessages }) => {
      setMembers(roomMembers);
      await onUpdateRoomKey(memberKeys);

      const decrypted = await Promise.all(
        encryptedMessages.map(async (msg: EncryptedMessage) => {
          // Skip deleted messages for this user
          if (msg.deletedFor?.includes(username)) {
            return null;
          }
          
          const text = await encryption.decrypt(msg.encryptedData, msg.iv);
          
          let decryptedAttachment: EncryptedAttachmentData | undefined;
          if ((msg as any).attachment) {
            const att = (msg as any).attachment as EncryptedAttachmentData;
            if (att.encrypted) {
              const decryptedUrl = await decryptAttachment(att);
              decryptedAttachment = { ...att, decryptedUrl: decryptedUrl || undefined };
            } else {
              decryptedAttachment = att;
            }
          }

          return {
            ...msg,
            text: text || '🔒 Could not decrypt',
            decrypted: !!text,
            attachment: decryptedAttachment,
          } as MessageWithAttachment;
        })
      );
      setMessages(decrypted.filter(Boolean) as Message[]);
    });

    socket.on('new-encrypted-message', async (msg: EncryptedMessage) => {
      const text = await encryption.decrypt(msg.encryptedData, msg.iv);
      
      let decryptedAttachment: EncryptedAttachmentData | undefined;
      if ((msg as any).attachment) {
        const att = (msg as any).attachment as EncryptedAttachmentData;
        if (att.encrypted) {
          const decryptedUrl = await decryptAttachment(att);
          decryptedAttachment = { ...att, decryptedUrl: decryptedUrl || undefined };
        } else {
          decryptedAttachment = att;
        }
      }

      setMessages(prev => [...prev, {
        ...msg,
        text: text || '🔒 Could not decrypt',
        decrypted: !!text,
        attachment: decryptedAttachment,
      } as MessageWithAttachment]);
    });

    // Handle message deletion
    socket.on('message-deleted', ({ messageId, deleteType, deletedBy }) => {
      if (deleteType === 'forEveryone') {
        // Remove message completely for everyone
        setMessages(prev => prev.filter(msg => {
          if (isSystemMessage(msg)) return true;
          return (msg as DecryptedMessage).id !== messageId;
        }));
        
        // Add system message about deletion
        setMessages(prev => [...prev, {
          type: 'system',
          text: `🗑️ ${deletedBy} deleted a message`,
          timestamp: Date.now()
        } as SystemMessage]);
      } else {
        // Delete for me only - remove from current user's view
        setMessages(prev => prev.filter(msg => {
          if (isSystemMessage(msg)) return true;
          return (msg as DecryptedMessage).id !== messageId;
        }));
      }
    });

    // Handle screenshot detection from other users
    socket.on('screenshot-warning', ({ username: detectedUser }) => {
      setMessages(prev => [...prev, {
        type: 'system',
        text: `⚠️ ${detectedUser} took a screenshot`,
        timestamp: Date.now()
      } as SystemMessage]);
    });

    socket.on('user-typing', ({ username: typingUser }: { username: string }) => {
      setTypingUsers(prev => new Set(prev).add(typingUser));
      setTimeout(() => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(typingUser);
          return newSet;
        });
      }, 3000);
    });

    socket.on('member-joined', async ({ username: joinedUser }: { username: string; publicKey: string }) => {
      setMessages(prev => [...prev, {
        type: 'system',
        text: `🔐 ${joinedUser} joined with verified encryption`,
        timestamp: Date.now()
      } as SystemMessage]);
    });

    socket.on('member-left', ({ username: leftUser }: { username: string }) => {
      setMessages(prev => [...prev, {
        type: 'system',
        text: `${leftUser} left the room`,
        timestamp: Date.now()
      } as SystemMessage]);
    });

    socket.on('members-update', async ({ members: updatedMembers, memberKeys }: { members: string[]; memberKeys: Record<string, string> }) => {
      setMembers(updatedMembers);
      await onUpdateRoomKey(memberKeys);
    });

    return () => {
      socket.off('room-data');
      socket.off('new-encrypted-message');
      socket.off('message-deleted');
      socket.off('screenshot-warning');
      socket.off('user-typing');
      socket.off('member-joined');
      socket.off('member-left');
      socket.off('members-update');
      
      // Cleanup long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [roomId, encryption, onUpdateRoomKey, username]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom > 150) {
      userHasScrolledRef.current = true;
    } else {
      userHasScrolledRef.current = false;
    }
  };

  useEffect(() => {
    const hasNewMessages = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (hasNewMessages && !userHasScrolledRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      const { encryptedData, iv } = await encryption.encrypt(inputText.trim());

      socket.emit('send-encrypted-message', {
        roomId,
        encryptedData,
        iv,
        senderUsername: username
      });

      setInputText('');
    } catch (error) {
      console.error('Encryption failed:', error);
    }
  };

  const handleTyping = (): void => {
    socket.emit('typing', { roomId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleEncryptFile = async (file: File): Promise<{ blob: Blob; iv: string; metadata: string }> => {
    return await encryption.encryptFile(file);
  };

  const handleFileUploaded = async (attachment: Attachment): Promise<void> => {
    try {
      const messageText = `📎 Shared encrypted file: ${attachment.filename}`;
      const { encryptedData, iv } = await encryption.encrypt(messageText);

      socket.emit('send-encrypted-message', {
        roomId,
        encryptedData,
        iv,
        senderUsername: username,
        attachmentId: attachment.id
      });
    } catch (error) {
      console.error('Failed to send file message:', error);
    }
  };

  // Message deletion handlers
  const handleMessageContextMenu = (e: React.MouseEvent, messageId: string, senderUsername: string) => {
    e.preventDefault();
    if (senderUsername === username) {
      setSelectedMessage(messageId);
      setShowDeleteModal(true);
    }
  };

  // Long press handler for mobile
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  const handleTouchStart = (messageId: string, senderUsername: string) => {
    if (senderUsername === username) {
      longPressTimer.current = setTimeout(() => {
        setSelectedMessage(messageId);
        setShowDeleteModal(true);
      }, 600); // 600ms for long press
    }
  };
  
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleDeleteForEveryone = () => {
    if (selectedMessage) {
      socket.emit('delete-message', {
        roomId,
        messageId: selectedMessage,
        deleteType: 'forEveryone' as DeleteType,
        username
      });
      setShowDeleteModal(false);
      setSelectedMessage(null);
    }
  };

  const handleDeleteForMe = () => {
    if (selectedMessage) {
      socket.emit('delete-message', {
        roomId,
        messageId: selectedMessage,
        deleteType: 'forMe' as DeleteType,
        username
      });
      // Immediately remove from local state
      setMessages(prev => prev.filter(msg => {
        if (isSystemMessage(msg)) return true;
        return (msg as DecryptedMessage).id !== selectedMessage;
      }));
      setShowDeleteModal(false);
      setSelectedMessage(null);
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const copyRoomCode = (): void => {
    navigator.clipboard.writeText(roomCode);
  };

  const handleLeaveClick = (): void => {
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = (): void => {
    setShowLeaveConfirm(false);
    onLeave();
  };

  const handleCancelLeave = (): void => {
    setShowLeaveConfirm(false);
  };

  const isSystemMessage = (msg: Message): msg is SystemMessage => {
    return (msg as SystemMessage).type === 'system';
  };

  return (
    <div className={`room-layout ${isBlurred ? 'room-blurred' : ''}`}>
      {/* Blur Overlay */}
      {isBlurred && (
        <div className="blur-overlay" onClick={manualUnblur}>
          <div className="blur-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L4 6V12C4 17 8 21 12 22C16 21 20 17 20 12V6L12 2Z"/>
              <path d="M12 8V12M12 16H12.01"/>
            </svg>
            <p>Click to unblur messages</p>
            <span className="blur-hint">Content hidden for privacy</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="room-header">
        <div className="room-header-left">
          <button className="btn btn-icon btn-ghost" onClick={handleLeaveClick} title="Leave room">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="room-header-center">
            <div className="room-title">
              <span>Room</span>
              <span className="room-code">{roomCode}</span>
              {roomType === 'authenticated' ? (
                <span className="room-badge room-badge-auth">Auth</span>
              ) : (
                <span className="room-badge room-badge-legacy">Legacy</span>
              )}
            </div>
            <span className="room-meta">{members.length} member{members.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="room-header-right">
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => setBlurOnUnfocusEnabled(!blurOnUnfocusEnabled)}
            title={blurOnUnfocusEnabled ? "Blur on unfocus: ON" : "Blur on unfocus: OFF"}
          >
            {blurOnUnfocusEnabled ? (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </button>
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => setScreenshotDetectionEnabled(!screenshotDetectionEnabled)}
            title={screenshotDetectionEnabled ? "Screenshot detection: ON" : "Screenshot detection: OFF"}
          >
            {screenshotDetectionEnabled ? (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                <polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="2"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </button>
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => setShowRoomInfo(!showRoomInfo)}
            title="Room info"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            className="btn btn-icon btn-ghost"
            onClick={() => setShowMembers(!showMembers)}
            title="Members"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="17" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 21V18C3 16.3431 4.34315 15 6 15H12C13.6569 15 15 16.3431 15 18V21" stroke="currentColor" strokeWidth="1.5" />
              <path d="M17 15C18.6569 15 20 16.3431 20 18V21" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            className="btn btn-icon btn-danger"
            onClick={handleLeaveClick}
            title={isOwner ? "Close room" : "Leave room"}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Room Info Panel */}
      {showRoomInfo && (
        <div className="info-panel">
          <div className="info-panel-header">
            <span className="info-panel-title">Encryption Info</span>
            <button className="btn btn-icon btn-sm btn-ghost" onClick={() => setShowRoomInfo(false)}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="info-panel-body">
            <div className="info-row">
              <span className="info-label">Room Code</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span className="info-value">{roomCode}</span>
                <button className="btn btn-sm btn-secondary" onClick={copyRoomCode}>Copy</button>
              </div>
            </div>
            <div className="info-row info-row-stack">
              <span className="info-label">Mobile Join QR</span>
              <div className="qr-container">
                <QRCodeCanvas
                  value={`${serverUrl || window.location.origin}/?room=${roomCode}`}
                  size={140}
                  level={'H'}
                  marginSize={2}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Scan to join from mobile
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Your Key Fingerprint</span>
              <span className="info-value" style={{ fontSize: '0.75rem' }}>{fingerprint}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Encryption</span>
              <span className="info-value">AES-256-GCM</span>
            </div>
            <div className="info-row">
              <span className="info-label">Key Exchange</span>
              <span className="info-value">ECDH P-256</span>
            </div>
            <div className="info-row">
              <span className="info-label">Screenshot Detection</span>
              <span className="info-value" style={{ color: screenshotDetectionEnabled ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                {screenshotDetectionEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Blur on Unfocus</span>
              <span className="info-value" style={{ color: blurOnUnfocusEnabled ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                {blurOnUnfocusEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="messages-wrapper">
        {/* Messages */}
        <div
          className="messages"
          ref={messagesContainerRef}
          onScroll={handleScroll}
        >
          <div className="encryption-notice">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4 6V12C4 17 8 21 12 22C16 21 20 17 20 12V6L12 2Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Messages are end-to-end encrypted</span>
          </div>

          {messages.map((msg, index) => (
            <div
              key={(msg as DecryptedMessage).id || index}
              className={`message ${isSystemMessage(msg)
                ? 'message-system'
                : (msg as DecryptedMessage).senderUsername === username
                  ? 'message-own'
                  : 'message-other'
                }`}
              onContextMenu={(e) => {
                if (!isSystemMessage(msg)) {
                  handleMessageContextMenu(e, (msg as DecryptedMessage).id, (msg as DecryptedMessage).senderUsername);
                }
              }}
              onTouchStart={() => {
                if (!isSystemMessage(msg)) {
                  handleTouchStart((msg as DecryptedMessage).id, (msg as DecryptedMessage).senderUsername);
                }
              }}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
            >
              <div className="message-bubble">
                {!isSystemMessage(msg) && (
                  <div className="message-header">
                    <span className="message-author">{(msg as DecryptedMessage).senderUsername}</span>
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                <div className="message-text">
                  {isSystemMessage(msg) ? msg.text : (msg as DecryptedMessage).text}
                  {!isSystemMessage(msg) && (msg as DecryptedMessage).decrypted && (
                    <span className="message-status" title="Encrypted">🔒</span>
                  )}
                </div>
                {!isSystemMessage(msg) && (msg as MessageWithAttachment).attachment && (
                  <MessageAttachment
                    attachment={(msg as MessageWithAttachment).attachment!}
                  />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />

          {typingUsers.size > 0 && (
            <div className="typing">
              <div className="typing-dots">
                <span></span><span></span><span></span>
              </div>
              <span>{Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...</span>
            </div>
          )}
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <>
            <div className="sidebar-overlay" onClick={() => setShowMembers(false)} />
            <aside className="sidebar">
              <div className="sidebar-header">
                <span className="sidebar-title">Members ({members.length})</span>
                <button className="btn btn-icon btn-sm btn-ghost" onClick={() => setShowMembers(false)}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <ul className="member-list">
                {members.map((member) => (
                  <li key={member} className="member-item">
                    <div className="avatar avatar-sm">{member.charAt(0).toUpperCase()}</div>
                    <span className="member-name">{member}</span>
                    {member === username && <span className="member-you">You</span>}
                    <span className="member-verified" title="Encryption verified">🔒</span>
                  </li>
                ))}
              </ul>
            </aside>
          </>
        )}
      </div>

      {/* Message Input */}
      <form className="message-composer" onSubmit={handleSendMessage}>
        <FileUpload
          roomId={roomId}
          onFileUploaded={handleFileUploaded}
          disabled={uploadingFile}
          encryptFile={handleEncryptFile}
        />
        <div className="composer-input-wrapper">
          <input
            type="text"
            className="composer-input"
            placeholder="Type an encrypted message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleTyping}
          />
        </div>
        <button 
          type="submit" 
          className="btn btn-icon btn-primary"
          disabled={!inputText.trim()}
          style={{ width: '44px', height: '44px' }}
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>

      {/* Leave Confirmation Modal */}
      <ConfirmModal
        isOpen={showLeaveConfirm}
        title={isOwner ? "Close Room?" : "Leave Room?"}
        message={isOwner
          ? "You are the room owner. Leaving will permanently delete:"
          : "Are you sure you want to leave this room?"
        }
        details={isOwner ? [
          "All chat messages",
          "All room members",
          "The entire room"
        ] : null}
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
        confirmText={isOwner ? "Close Room" : "Leave"}
        cancelText="Cancel"
        isDanger={isOwner}
      />

      {/* Delete Message Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete Message</h3>
            <p className="modal-text">Choose how you want to delete this message:</p>
            <div className="modal-actions" style={{ flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
              <button 
                className="btn btn-danger btn-block"
                onClick={handleDeleteForEveryone}
              >
                🗑️ Delete for Everyone
              </button>
              <button 
                className="btn btn-secondary btn-block"
                onClick={handleDeleteForMe}
              >
                🗑️ Delete for Me
              </button>
              <button 
                className="btn btn-ghost btn-block"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomPage;
