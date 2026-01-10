import React, { useState } from 'react';
import fileService from '../services/fileService';
import type { MessageAttachmentProps } from '../types';

function MessageAttachment({ attachment }: MessageAttachmentProps): JSX.Element | null {
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  if (!attachment) return null;

  const isImage = fileService.isImage(attachment.mimetype);
  const fileSize = fileService.formatFileSize(attachment.size);

  if (isImage && !imageError) {
    return (
      <div className="message-attachment image-attachment">
        {!imageLoaded && (
          <div className="image-placeholder">
            <span className="loading-spinner small"></span>
          </div>
        )}
        <img
          src={attachment.url}
          alt={attachment.filename}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{ display: imageLoaded ? 'block' : 'none' }}
          className="attachment-image"
        />
        <div className="image-info">
          <span className="filename">{attachment.filename}</span>
          <span className="filesize">{fileSize}</span>
        </div>
      </div>
    );
  }

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    try {
      // Use fileService to download with auth headers
      const blob = await fileService.downloadEncryptedFile(attachment.url);

      // Create object URL and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Download failed:', error);
      alert(`Download failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Non-image file
  return (
    <a
      href={attachment.url}
      onClick={handleDownload}
      className="message-attachment file-attachment"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="file-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 18V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 15L12 12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="file-info">
        <span className="filename">{attachment.filename}</span>
        <span className="filesize">{fileSize}</span>
      </div>
      <div className="download-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </a>
  );
}

export default MessageAttachment;
