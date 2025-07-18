import React, { useState, useEffect } from 'react';

const TicketAttachmentPreviewModal = ({ show, onHide, attachment }) => {
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
      
      // For ticket attachments, we can directly use the file path
      const fileUrl = `/uploads/${attachment.path}`;
      
      // Fetch the file to create a blob URL for preview
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error('Failed to load document');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDocumentUrl(url);
      
    } catch (err) {
      console.error('Error loading document:', err);
      if (err.message.includes('404')) {
        setError('Document not found');
      } else {
        setError('Failed to load document');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (attachment) {
      const link = document.createElement('a');
      link.href = `/uploads/${attachment.path}`;
      link.download = attachment.originalName;
      link.target = '_blank';
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

  const getFileIcon = (mimetype) => {
    if (mimetype?.startsWith('image/')) {
      return 'bi-file-earmark-image text-primary';
    } else if (mimetype === 'application/pdf') {
      return 'bi-file-earmark-pdf text-danger';
    } else if (mimetype?.includes('word')) {
      return 'bi-file-earmark-word text-primary';
    } else {
      return 'bi-file-earmark text-secondary';
    }
  };

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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className={`bi ${getFileIcon(attachment?.mimetype)} me-2`}></i>
              Document Preview - {attachment?.originalName}
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
                  <button
                    className="btn btn-primary"
                    onClick={handleDownload}
                  >
                    <i className="bi bi-download me-2"></i>
                    Download Instead
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && documentUrl && (
              <>
                {attachment?.mimetype === 'application/pdf' ? (
                  <iframe
                    src={documentUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 'none' }}
                    title="Document Preview"
                  />
                ) : attachment?.mimetype?.startsWith('image/') ? (
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
                ) : (
                  <div className="d-flex justify-content-center align-items-center h-100">
                    <div className="text-center">
                      <i className={`bi ${getFileIcon(attachment?.mimetype)}`} style={{ fontSize: '4rem' }}></i>
                      <h5 className="mt-3 text-muted">Preview not available</h5>
                      <p className="text-muted">This file type cannot be previewed in the browser.</p>
                      <button
                        className="btn btn-primary"
                        onClick={handleDownload}
                      >
                        <i className="bi bi-download me-2"></i>
                        Download to View
                      </button>
                    </div>
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
                  Size: {formatFileSize(attachment.size)} • 
                  Uploaded: {formatDate(attachment.uploadedAt)}
                </small>
              )}
            </div>
            
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownload}
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

export default TicketAttachmentPreviewModal;
