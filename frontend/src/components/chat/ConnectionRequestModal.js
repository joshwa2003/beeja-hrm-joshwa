import React, { useState } from 'react';

const ConnectionRequestModal = ({ user, onSend, onClose }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    
    try {
      await onSend(user._id, message.trim());
    } catch (error) {
      console.error('Error sending connection request:', error);
    } finally {
      setSending(false);
    }
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-person-plus me-2"></i>
              Send Connection Request
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={sending}
            ></button>
          </div>

          <div className="modal-body">
            {/* User Info */}
            <div className="d-flex align-items-center mb-4 p-3 bg-light rounded">
              <div className="me-3">
                <div
                  className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold"
                  style={{ width: '50px', height: '50px', fontSize: '18px' }}
                >
                  {getUserInitials(user)}
                </div>
              </div>
              <div>
                <h6 className="mb-1">{user.firstName} {user.lastName}</h6>
                <small className="text-muted">{user.role}</small>
              </div>
            </div>

            {/* Info Message */}
            <div className="alert alert-info d-flex align-items-start">
              <i className="bi bi-info-circle me-2 mt-1"></i>
              <div>
                <strong>Connection Required</strong>
                <p className="mb-0 mt-1">
                  As an Employee, you need approval from {user.role}s to start a conversation. 
                  Send a connection request with an optional message explaining why you'd like to connect.
                </p>
              </div>
            </div>

            {/* Request Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="requestMessage" className="form-label">
                  Message <span className="text-muted">(Optional)</span>
                </label>
                <textarea
                  id="requestMessage"
                  className="form-control"
                  rows="4"
                  placeholder="Hi, I would like to connect with you regarding..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  disabled={sending}
                />
                <div className="form-text">
                  {message.length}/500 characters
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending}
                >
                  {sending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      Send Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionRequestModal;
