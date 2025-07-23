import React, { useState, useEffect } from 'react';
import { chatAPI } from '../../utils/api';

const FilePreviewModal = ({ show, onHide, attachment, messageId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  useEffect(() => {
    if (show && attachment && messageId) {
      loadFile();
    }
  }, [show, attachment, messageId]);

  useEffect(() => {
    return () => {
      // Clean up blob URL when component unmounts or modal closes
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const loadFile = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await chatAPI.downloadAttachment(messageId, attachment.fileName);
      const blob = new Blob([response.data], { type: attachment.mimeType });
      const url = URL.createObjectURL(blob);
      setFileUrl(url);
      setLoading(false);
    } catch (error) {
      console.error('Error loading file:', error);
      setError('Failed to load file');
      setLoading(false);
    }
  };

  if (!show || !attachment) return null;

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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/api/chat/attachment/${messageId}/${attachment.fileName}`;
    link.download = attachment.originalName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = attachment.mimeType && attachment.mimeType.startsWith('image/');
  const isPdf = attachment.mimeType && attachment.mimeType.includes('pdf');
  const isViewable = isImage || isPdf;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className={`bi ${getFileIcon(attachment.mimeType)} me-2`}></i>
              File Preview - {attachment.originalName}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onHide}
              aria-label="Close"
            ></button>
          </div>
          
          <div className="modal-body p-0">
            {loading && (
              <div className="d-flex justify-content-center align-items-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-danger m-3" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {!loading && !error && (
              <>
                {isImage && fileUrl ? (
                  <div className="text-center p-3">
                    <img
                      src={fileUrl}
                      alt={attachment.originalName}
                      className="img-fluid rounded"
                      style={{ maxWidth: '100%', maxHeight: '70vh' }}
                    />
                  </div>
                ) : isPdf && fileUrl ? (
                  <div style={{ height: '70vh' }}>
                    <iframe
                      src={`${fileUrl}#toolbar=0`}
                      width="100%"
                      height="100%"
                      style={{ border: 'none' }}
                      title={attachment.originalName}
                    />
                  </div>
                ) : (
                  <div className="d-flex flex-column justify-content-center align-items-center p-5">
                    <i className={`bi ${getFileIcon(attachment.mimeType)} text-muted`} style={{ fontSize: '4rem' }}></i>
                    <h5 className="mt-3 text-muted">Preview not available</h5>
                    <p className="text-muted">This file type cannot be previewed in the browser.</p>
                    <button
                      className="btn btn-primary"
                      onClick={handleDownload}
                    >
                      <i className="bi bi-download me-2"></i>
                      Download File
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <div className="me-auto">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Size: {formatFileSize(attachment.fileSize || 0)} • 
                Type: {attachment.mimeType}
              </small>
            </div>
            <div className="btn-group">
              {isViewable && fileUrl && (
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => window.open(fileUrl, '_blank')}
                >
                  <i className="bi bi-box-arrow-up-right me-1"></i>
                  Open in New Tab
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownload}
              >
                <i className="bi bi-download me-1"></i>
                Download
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onHide}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
