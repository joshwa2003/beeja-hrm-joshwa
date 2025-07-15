import React, { useState, useEffect } from 'react';
import { leaveAPI } from '../../utils/api';

const DocumentPreviewModal = ({ show, onHide, leaveId, attachment }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  useEffect(() => {
    if (show && attachment) {
      loadDocument();
    }
    return () => {
      // Clean up blob URL when modal closes
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [show, attachment]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await leaveAPI.downloadLeaveDocument(leaveId, attachment.fileName);
      
      // Create blob URL for preview
      const blob = new Blob([response.data], { type: attachment.mimeType });
      const url = URL.createObjectURL(blob);
      setDocumentUrl(url);
      
    } catch (err) {
      if (err.response?.status === 410) {
        setError('Document has expired and is no longer available');
      } else if (err.response?.status === 404) {
        setError('Document not found');
      } else {
        setError('Failed to load document');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (documentUrl) {
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = attachment.originalName || attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleClose = () => {
    if (documentUrl) {
      URL.revokeObjectURL(documentUrl);
      setDocumentUrl('');
    }
    setError('');
    onHide();
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className={`bi ${attachment?.mimeType === 'application/pdf' ? 'bi-file-earmark-pdf text-danger' : 'bi-file-earmark-image text-primary'} me-2`}></i>
              Document Preview - {attachment?.originalName || attachment?.fileName}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
            ></button>
          </div>
          
          <div className="modal-body p-0" style={{ height: '70vh' }}>
            {loading && (
              <div className="d-flex justify-content-center align-items-center h-100">
                <div className="text-center">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted">Loading document...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="d-flex justify-content-center align-items-center h-100">
                <div className="text-center">
                  <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
                  <h5 className="mt-3 text-muted">Unable to Load Document</h5>
                  <p className="text-muted">{error}</p>
                </div>
              </div>
            )}

            {!loading && !error && documentUrl && (
              <>
                {attachment?.mimeType === 'application/pdf' ? (
                  <iframe
                    src={documentUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    title="Document Preview"
                  />
                ) : (
                  <div className="d-flex justify-content-center align-items-center h-100 p-3">
                    <img
                      src={documentUrl}
                      alt="Document Preview"
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <div className="me-auto">
              {attachment && (
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Size: {formatFileSize(attachment.fileSize)} • 
                  Uploaded: {formatDate(attachment.uploadDate)}
                  {attachment.expiryDate && (
                    <span className="ms-2">
                      • Expires: {formatDate(attachment.expiryDate)}
                    </span>
                  )}
                </small>
              )}
            </div>
            
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownload}
              disabled={loading || error || !documentUrl}
            >
              <i className="bi bi-download me-2"></i>
              Download
            </button>
            
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default DocumentPreviewModal;
