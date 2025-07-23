import React, { useState } from 'react';
import { chatAPI } from '../../utils/api';
import FilePreviewModal from './FilePreviewModal';

const MessageBubble = ({ message, currentUser, isLastMessage, showAvatar }) => {
  const [downloading, setDownloading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const isOwnMessage = message.sender._id === currentUser._id;

  // Debug logging
  console.log('MessageBubble - Message data:', {
    id: message._id,
    content: message.content,
    attachments: message.attachments,
    messageType: message.messageType,
    hasAttachments: message.attachments && message.attachments.length > 0,
    attachmentCount: message.attachments ? message.attachments.length : 0
  });

  // Additional debug for attachments
  if (message.attachments && message.attachments.length > 0) {
    console.log('MessageBubble - Attachment details:', message.attachments.map(att => ({
      fileName: att.fileName,
      originalName: att.originalName,
      mimeType: att.mimeType,
      fileSize: att.fileSize
    })));
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'bi-image';
    if (mimeType.includes('pdf')) return 'bi-file-earmark-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'bi-file-earmark-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'bi-file-earmark-excel';
    if (mimeType.includes('text')) return 'bi-file-earmark-text';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('compressed')) return 'bi-file-earmark-zip';
    return 'bi-file-earmark';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadAttachment = async (attachment) => {
    setDownloading(true);
    try {
      const response = await chatAPI.downloadAttachment(message._id, attachment.fileName);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: attachment.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
    } finally {
      setDownloading(false);
    }
  };

  const isMessageRead = () => {
    if (isOwnMessage && message.readBy) {
      return message.readBy.some(read => read.user !== currentUser._id);
    }
    return false;
  };

  const handleViewAttachment = (attachment) => {
    setSelectedAttachment(attachment);
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setSelectedAttachment(null);
  };

  const renderAttachment = (attachment, index) => {
    console.log('Rendering attachment:', {
      index,
      fileName: attachment.fileName,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize
    });
    
    // Validate attachment data
    if (!attachment || !attachment.fileName || !attachment.originalName) {
      console.error('Invalid attachment data:', attachment);
      return (
        <div key={index} className="mt-2">
          <div className="border rounded p-3 bg-light text-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Invalid attachment data
          </div>
        </div>
      );
    }
    
    const isImage = attachment.mimeType && attachment.mimeType.startsWith('image/');
    const isPdf = attachment.mimeType && attachment.mimeType.includes('pdf');
    const isViewable = isImage || isPdf || (attachment.mimeType && attachment.mimeType.includes('text'));
    
    return (
      <div key={index} className="mt-2">
        {isImage ? (
          <div className="position-relative">
            <img
              src={`/api/chat/view-attachment/${message._id}/${attachment.fileName}`}
              alt={attachment.originalName}
              className="img-fluid rounded"
              style={{ maxWidth: '300px', maxHeight: '200px', cursor: 'pointer' }}
              onClick={() => handleViewAttachment(attachment)}
              onError={(e) => {
                console.error('Image load error for:', attachment.fileName, e);
                e.target.style.display = 'none';
                const fallback = e.target.parentNode.querySelector('.attachment-fallback');
                if (fallback) {
                  fallback.style.display = 'block';
                }
              }}
            />
            <div className="position-absolute bottom-0 start-0 bg-dark bg-opacity-75 text-white px-2 py-1 rounded-end">
              <small>{attachment.originalName}</small>
            </div>
            <div className="position-absolute top-0 end-0 p-1">
              <div className="btn-group" role="group">
                <button
                  type="button"
                  className="btn btn-sm btn-light opacity-75"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewAttachment(attachment);
                  }}
                  title="View"
                >
                  <i className="bi bi-eye"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-light opacity-75"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadAttachment(attachment);
                  }}
                  title="Download"
                  disabled={downloading}
                >
                  <i className="bi bi-download"></i>
                </button>
              </div>
            </div>
            {/* Fallback for broken images */}
            <div 
              className="attachment-fallback border rounded p-3 bg-white d-flex align-items-center"
              style={{ display: 'none' }}
            >
              <i className={`${getFileIcon(attachment.mimeType)} fs-4 me-3 text-primary`}></i>
              <div className="flex-grow-1 min-w-0">
                <div className="fw-semibold text-truncate">{attachment.originalName}</div>
                <small className="text-muted">{formatFileSize(attachment.fileSize || 0)}</small>
              </div>
              <div className="btn-group ms-2" role="group">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handleViewAttachment(attachment)}
                  title="View"
                >
                  <i className="bi bi-eye"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleDownloadAttachment(attachment)}
                  title="Download"
                  disabled={downloading}
                >
                  <i className="bi bi-download"></i>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="border rounded p-3 bg-white d-flex align-items-center"
            style={{ maxWidth: '300px' }}
          >
            <i className={`${getFileIcon(attachment.mimeType)} fs-4 me-3 text-primary`}></i>
            <div className="flex-grow-1 min-w-0">
              <div className="fw-semibold text-truncate">{attachment.originalName}</div>
              <small className="text-muted">{formatFileSize(attachment.fileSize || 0)}</small>
            </div>
            <div className="btn-group ms-2" role="group">
              {isViewable && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => handleViewAttachment(attachment)}
                  title="View"
                >
                  <i className="bi bi-eye"></i>
                </button>
              )}
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => handleDownloadAttachment(attachment)}
                title="Download"
                disabled={downloading}
              >
                {downloading ? (
                  <i className="bi bi-hourglass-split"></i>
                ) : (
                  <i className="bi bi-download"></i>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`d-flex mb-3 ${isOwnMessage ? 'justify-content-end' : 'justify-content-start'}`}>
      {/* Avatar for other users */}
      {!isOwnMessage && (
        <div className="me-2" style={{ width: '32px' }}>
          {showAvatar ? (
            <div
              className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold"
              style={{ width: '32px', height: '32px', fontSize: '12px' }}
            >
              {getUserInitials(message.sender)}
            </div>
          ) : (
            <div style={{ width: '32px', height: '32px' }}></div>
          )}
        </div>
      )}

      {/* Message Content */}
      <div 
        className={`rounded-3 px-3 py-2 position-relative ${
          isOwnMessage 
            ? 'bg-primary text-white' 
            : 'bg-light text-dark border'
        }`}
        style={{ 
          maxWidth: '70%',
          wordWrap: 'break-word'
        }}
      >
        {/* Sender name for group chats or when showing avatar */}
        {!isOwnMessage && showAvatar && (
          <div className="fw-semibold mb-1" style={{ fontSize: '0.85rem' }}>
            {message.sender.firstName} {message.sender.lastName}
          </div>
        )}

        {/* Message text */}
        {message.content && message.content.trim() && message.content !== 'File attachment' && (
          <div className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className={message.content && message.content.trim() && message.content !== 'File attachment' ? 'mt-2' : ''}>
            {message.attachments.map(renderAttachment)}
          </div>
        )}

        {/* Show fallback only if truly no content and no attachments */}
        {(!message.content || !message.content.trim() || message.content === 'File attachment') && 
         (!message.attachments || message.attachments.length === 0) && (
          <div className="text-muted fst-italic">
            <i className="bi bi-exclamation-triangle me-1"></i>
            Message content unavailable
          </div>
        )}

        {/* Message metadata */}
        <div className={`d-flex align-items-center justify-content-end mt-1 ${
          isOwnMessage ? 'text-white-50' : 'text-muted'
        }`} style={{ fontSize: '0.75rem' }}>
          <span>{formatTime(message.createdAt)}</span>
          
          {/* Read status for own messages */}
          {isOwnMessage && (
            <span className="ms-1">
              {isMessageRead() ? (
                <i className="bi bi-check2-all text-info" title="Read"></i>
              ) : (
                <i className="bi bi-check2" title="Delivered"></i>
              )}
            </span>
          )}
          
          {/* Edited indicator */}
          {message.isEdited && (
            <span className="ms-1" title="Edited">
              <i className="bi bi-pencil"></i>
            </span>
          )}
        </div>

        {/* Message tail */}
        <div 
          className={`position-absolute ${
            isOwnMessage ? 'end-0 me-n1' : 'start-0 ms-n1'
          }`}
          style={{ 
            bottom: '10px',
            width: '0',
            height: '0',
            borderStyle: 'solid',
            ...(isOwnMessage ? {
              borderWidth: '8px 0 8px 8px',
              borderColor: `transparent transparent transparent var(--bs-primary)`
            } : {
              borderWidth: '8px 8px 8px 0',
              borderColor: `transparent var(--bs-light) transparent transparent`
            })
          }}
        ></div>
      </div>

      {/* Avatar placeholder for own messages */}
      {isOwnMessage && (
        <div className="ms-2" style={{ width: '32px' }}>
          {showAvatar ? (
            <div
              className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold"
              style={{ width: '32px', height: '32px', fontSize: '12px' }}
            >
              {getUserInitials(currentUser)}
            </div>
          ) : (
            <div style={{ width: '32px', height: '32px' }}></div>
          )}
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        show={showPreviewModal}
        onHide={handleClosePreview}
        attachment={selectedAttachment}
        messageId={message._id}
      />
    </div>
  );
};

export default MessageBubble;
