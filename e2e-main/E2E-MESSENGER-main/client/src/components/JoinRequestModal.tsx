import React from 'react';
import type { JoinRequest } from '../types';

interface JoinRequestModalProps {
  requests: JoinRequest[];
  onApprove: ({ requestId }: { requestId: string }) => Promise<void>;
  onDeny: (requestId: string) => void;
}

function JoinRequestModal({ requests, onApprove, onDeny }: JoinRequestModalProps): JSX.Element | null {
  if (requests.length === 0) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '450px' }}>
        <h3 className="modal-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Join Requests ({requests.length})
        </h3>
        <p className="modal-text">
          Review and approve users who want to join your room.
        </p>
        
        <div className="request-list">
          {requests.map((request) => (
            <div key={request.requestId} className="request-item">
              <div className="request-user">
                <div className="avatar avatar-sm">
                  {request.username.charAt(0).toUpperCase()}
                </div>
                <div className="request-info">
                  <span className="request-username">{request.username}</span>
                  <span className="request-label">
                    <span style={{ fontSize: '10px' }}>🔑</span>
                    Has encryption key
                  </span>
                </div>
              </div>
              <div className="request-actions">
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => onDeny(request.requestId)}
                >
                  Deny
                </button>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => onApprove({ requestId: request.requestId })}
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default JoinRequestModal;
