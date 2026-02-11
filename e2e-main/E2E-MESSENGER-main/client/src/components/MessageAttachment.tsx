import React, { useState } from 'react';
import type { Attachment } from '../types';

interface MessageAttachmentProps {
  attachment: Attachment & { decryptedUrl?: string };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(filename: string): JSX.Element {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    );
  }
  
  if (['pdf'].includes(ext || '')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5"/>
        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16 13H8" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16 17H8" stroke="currentColor" strokeWidth="1.5"/>
        <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    );
  }
  
  if (['doc', 'docx', 'txt', 'md'].includes(ext || '')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5"/>
        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5"/>
        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.5"/>
        <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    );
  }
  
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="currentColor" strokeWidth="1.5"/>
      <polyline points="13 2 13 9 20 9" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function MessageAttachment({ attachment }: MessageAttachmentProps): JSX.Element {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isImage = attachment.mimetype.startsWith('image/');
  const displayUrl = attachment.decryptedUrl || attachment.url;

  if (isImage && !imageError) {
    return (
      <div className="attachment attachment-image">
        {!imageLoaded && (
          <div className="image-placeholder">
            <span className="spinner spinner-sm"></span>
          </div>
        )}
        <img
          src={displayUrl}
          alt={attachment.filename}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{ display: imageLoaded ? 'block' : 'none' }}
          onClick={() => window.open(displayUrl, '_blank')}
        />
        <div className="image-info">
          <span>{attachment.filename}</span>
          <span>{formatFileSize(attachment.size)}</span>
        </div>
      </div>
    );
  }

  return (
    <a 
      href={displayUrl} 
      download={attachment.filename}
      className="attachment attachment-file"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="attachment-icon">
        {getFileIcon(attachment.filename)}
      </div>
      <div className="attachment-info">
        <span className="attachment-name">{attachment.filename}</span>
        <span className="attachment-size">{formatFileSize(attachment.size)}</span>
      </div>
      <div className="download-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </a>
  );
}

export default MessageAttachment;
