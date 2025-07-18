import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { getRoutingInfo } from '../../utils/hrRouting';
import TicketAttachmentPreviewModal from './TicketAttachmentPreviewModal';

const TicketDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [relatedFAQs, setRelatedFAQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
  const [closeLoading, setCloseLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tickets/${id}`);
      setTicket(response.data.ticket);
      setConversation(response.data.conversation || []);
      setRelatedFAQs(response.data.relatedFAQs || []);
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      setError('Error loading ticket details');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setMessageLoading(true);
    try {
      const formData = new FormData();
      formData.append('message', newMessage.trim());
      
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      await api.post(`/tickets/${id}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setNewMessage('');
      setAttachments([]);
      setSuccess('Message sent successfully');
      
      // Refresh conversation
      await fetchTicketDetails();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error sending message');
    } finally {
      setMessageLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      await api.patch(`/tickets/${id}/status`, {
        status: newStatus,
        reason: statusReason
      });
      
      setShowStatusModal(false);
      setNewStatus('');
      setStatusReason('');
      setSuccess('Ticket status updated successfully');
      
      // Refresh ticket details
      await fetchTicketDetails();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Error updating ticket status');
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      await api.post(`/tickets/${id}/feedback`, feedback);
      
      setShowFeedbackModal(false);
      setSuccess('Feedback submitted successfully');
      
      // Refresh ticket details
      await fetchTicketDetails();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError('Error submitting feedback');
    }
  };

  const handleResolveByHR = async () => {
    const resolutionComment = prompt('Please provide a resolution comment (optional):');
    
    if (!window.confirm('Are you sure you want to resolve this ticket? The employee will be able to confirm or reopen it.')) {
      return;
    }

    setCloseLoading(true);
    try {
      await api.patch(`/tickets/${id}/resolve`, {
        resolutionComment: resolutionComment || ''
      });
      
      setSuccess('Ticket resolved by HR. Employee can now confirm or reopen.');
      
      // Refresh ticket details
      await fetchTicketDetails();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error resolving ticket by HR:', error);
      setError(error.response?.data?.message || 'Error resolving ticket');
    } finally {
      setCloseLoading(false);
    }
  };

  const handleConfirmByEmployee = async () => {
    if (!window.confirm('Are you sure the issue is resolved? This will close the ticket.')) {
      return;
    }

    setCloseLoading(true);
    try {
      await api.patch(`/tickets/${id}/confirm`);
      
      setSuccess('Ticket confirmed and closed successfully');
      
      // Refresh ticket details
      await fetchTicketDetails();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error confirming ticket by employee:', error);
      setError(error.response?.data?.message || 'Error confirming ticket');
    } finally {
      setCloseLoading(false);
    }
  };

  const handleReopenByEmployee = async () => {
    const reason = prompt('Please provide a reason for reopening this ticket:');
    
    if (!reason || !reason.trim()) {
      setError('Reason is required to reopen the ticket');
      return;
    }

    if (!window.confirm('Are you sure you want to reopen this ticket?')) {
      return;
    }

    setCloseLoading(true);
    try {
      await api.patch(`/tickets/${id}/reopen`, {
        reason: reason.trim()
      });
      
      setSuccess('Ticket reopened successfully');
      
      // Refresh ticket details
      await fetchTicketDetails();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error reopening ticket by employee:', error);
      setError(error.response?.data?.message || 'Error reopening ticket');
    } finally {
      setCloseLoading(false);
    }
  };

  const handleEscalate = async () => {
    try {
      const reason = prompt('Please provide a reason for escalation:');
      if (!reason) return;

      await api.patch(`/tickets/${id}/escalate`, { reason });
      
      setSuccess('Ticket escalated successfully');
      
      // Refresh ticket details
      await fetchTicketDetails();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error escalating ticket:', error);
      setError('Error escalating ticket');
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      return true;
    });

    if (attachments.length + validFiles.length > 3) {
      setError('Maximum 3 files allowed per message.');
      return;
    }

    setAttachments(prev => [...prev, ...validFiles]);
    setError('');
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handlePreviewAttachment = (attachment) => {
    setSelectedAttachment(attachment);
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setSelectedAttachment(null);
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'Open': 'bg-primary',
      'In Progress': 'bg-warning',
      'Pending': 'bg-info',
      'Resolved': 'bg-success',
      'Closed': 'bg-secondary',
      'Escalated': 'bg-danger',
      'Reopened': 'bg-warning'
    };
    return `badge ${statusClasses[status] || 'bg-secondary'}`;
  };

  const getPriorityBadgeClass = (priority) => {
    const priorityClasses = {
      'Low': 'bg-success',
      'Medium': 'bg-warning',
      'High': 'bg-danger',
      'Critical': 'bg-dark'
    };
    return `badge ${priorityClasses[priority] || 'bg-secondary'}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isHRRole = () => {
    return ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'].includes(user?.role);
  };

  const canUpdateStatus = () => {
    return isHRRole() || ticket?.createdBy?._id === user?._id;
  };

  const canEscalate = () => {
    return isHRRole() || ticket?.createdBy?._id === user?._id;
  };

  const canProvideFeedback = () => {
    return ticket?.createdBy?._id === user?._id && 
           (ticket?.status === 'Resolved' || ticket?.status === 'Closed') &&
           !ticket?.feedback?.rating;
  };

  const canHRResolve = () => {
    // HR can resolve if:
    // 1. User has HR role
    // 2. Ticket is not closed and not already resolved
    // 3. Ticket is not permanently closed by HR
    
    const resolutionStatus = ticket?.resolutionStatus || {};
    
    // Hide resolve button if ticket is permanently closed by HR
    if (resolutionStatus.permanentlyClosedByHR) {
      return false;
    }
    
    return isHRRole() && 
           ticket?.status !== 'Closed' && 
           ticket?.status !== 'Resolved';
  };

  const canEmployeeConfirm = () => {
    // Always show confirm button when ticket is resolved and user is not HR
    const isResolved = ticket?.status === 'Resolved';
    const isNotHR = !isHRRole();
    
    console.log('canEmployeeConfirm debug:', {
      isResolved,
      isNotHR,
      ticketStatus: ticket?.status,
      userRole: user?.role
    });
    
    return isResolved && isNotHR;
  };

  const canEmployeeReopen = () => {
    // Show reopen button when:
    // 1. User is not HR
    // 2. Ticket is resolved OR closed (but within reopen deadline)
    // 3. Within reopen deadline (if set)
    // 4. NOT permanently closed by HR
    
    const isNotHR = !isHRRole();
    const isResolvedOrClosed = ticket?.status === 'Resolved' || ticket?.status === 'Closed';
    
    // Check if permanently closed by HR - if so, cannot reopen
    const resolutionStatus = ticket?.resolutionStatus || {};
    if (resolutionStatus.permanentlyClosedByHR) {
      console.log('canEmployeeReopen: false - permanently closed by HR');
      return false;
    }
    
    // Check reopen deadline - for old tickets without resolutionStatus, allow 3 days from resolved date
    let withinDeadline = true;
    
    if (resolutionStatus.reopenDeadline) {
      withinDeadline = new Date() <= new Date(resolutionStatus.reopenDeadline);
    } else if (ticket?.resolvedAt) {
      // For old tickets, calculate 3 days from resolved date
      const threeDaysFromResolved = new Date(ticket.resolvedAt);
      threeDaysFromResolved.setDate(threeDaysFromResolved.getDate() + 3);
      withinDeadline = new Date() <= threeDaysFromResolved;
    }
    
    // Check reopen count limit - default to 3 if not set
    const maxAllowed = resolutionStatus.maxReopenAllowed || 3;
    const currentCount = resolutionStatus.reopenCount || 0;
    const canReopen = currentCount < maxAllowed;
    
    console.log('canEmployeeReopen debug:', {
      isNotHR,
      isResolvedOrClosed,
      withinDeadline,
      canReopen,
      permanentlyClosedByHR: resolutionStatus.permanentlyClosedByHR,
      reopenDeadline: resolutionStatus.reopenDeadline,
      resolvedAt: ticket?.resolvedAt,
      currentCount,
      maxAllowed,
      ticketStatus: ticket?.status
    });
    
    return isNotHR && isResolvedOrClosed && withinDeadline && canReopen;
  };

  const getResolutionStatusMessage = () => {
    const resolutionStatus = ticket?.resolutionStatus || {};
    
    if (ticket?.status === 'Resolved') {
      if (resolutionStatus.employeeConfirmed) {
        return {
          type: 'success',
          message: 'This ticket has been resolved and confirmed by the employee.'
        };
      } else {
        const deadlineDate = resolutionStatus.reopenDeadline ? new Date(resolutionStatus.reopenDeadline).toLocaleDateString() : null;
        return {
          type: 'info',
          message: `HR has resolved this ticket. Please confirm if the issue is fixed or reopen if needed${deadlineDate ? ` (deadline: ${deadlineDate})` : ''}.`
        };
      }
    }
    
    if (ticket?.status === 'Closed') {
      if (resolutionStatus.permanentlyClosedByHR) {
        return {
          type: 'secondary',
          message: 'This ticket has been permanently closed by HR and cannot be reopened.'
        };
      } else if (resolutionStatus.employeeConfirmed) {
        return {
          type: 'success',
          message: 'This ticket has been resolved and confirmed by the employee.'
        };
      }
    }
    
    if (ticket?.status === 'Reopened') {
      return {
        type: 'warning',
        message: 'This ticket has been reopened by the employee and reassigned to HR.'
      };
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center p-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container-fluid">
        <div className="text-center p-5">
          <i className="bi bi-exclamation-triangle fs-1 text-warning"></i>
          <h3 className="mt-3">Ticket Not Found</h3>
          <p className="text-muted">The ticket you're looking for doesn't exist or you don't have access to it.</p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/helpdesk'}
          >
            Back to Helpdesk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex align-items-center mb-4">
        <button 
          className="btn btn-outline-secondary me-3"
          onClick={() => window.history.back()}
        >
          <i className="bi bi-arrow-left"></i>
        </button>
        <div className="flex-grow-1">
          <div className="d-flex align-items-center">
            <h2 className="me-3">
              <i className="bi bi-ticket-perforated me-2"></i>
              {ticket.ticketNumber}
            </h2>
            <span className={getStatusBadgeClass(ticket.status)}>
              {ticket.status}
            </span>
            <span className={`${getPriorityBadgeClass(ticket.priority)} ms-2`}>
              {ticket.priority}
            </span>
            {ticket.isConfidential && (
              <span className="badge bg-warning ms-2">
                <i className="bi bi-shield-lock me-1"></i>
                Confidential
              </span>
            )}
          </div>
          <p className="text-muted mb-0">{ticket.subject}</p>
        </div>
        
        {/* Action Buttons */}
        <div className="d-flex gap-2">
          {canUpdateStatus() && (
            <button 
              className="btn btn-outline-primary"
              onClick={() => setShowStatusModal(true)}
            >
              <i className="bi bi-arrow-repeat me-1"></i>
              Update Status
            </button>
          )}
          {canEscalate() && ticket.status !== 'Closed' && ticket.status !== 'Resolved' && (
            <button 
              className="btn btn-outline-warning"
              onClick={handleEscalate}
            >
              <i className="bi bi-arrow-up-circle me-1"></i>
              Escalate
            </button>
          )}
          {canProvideFeedback() && (
            <button 
              className="btn btn-outline-success"
              onClick={() => setShowFeedbackModal(true)}
            >
              <i className="bi bi-star me-1"></i>
              Provide Feedback
            </button>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle me-2"></i>
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Resolution Status Message */}
      {getResolutionStatusMessage() && (
        <div className={`alert alert-${getResolutionStatusMessage().type} fade show`} role="alert">
          <i className={`bi bi-${getResolutionStatusMessage().type === 'success' ? 'check-circle' : getResolutionStatusMessage().type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2`}></i>
          {getResolutionStatusMessage().message}
        </div>
      )}

      <div className="row">
        {/* Main Content */}
        <div className="col-lg-8">
          {/* Ticket Details */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Ticket Information
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Category:</strong> {ticket.category}</p>
                  {ticket.subcategory && (
                    <p><strong>Subcategory:</strong> {ticket.subcategory}</p>
                  )}
                  
                  {/* HR Routing Information */}
                  <div className="mb-3 p-2 bg-light rounded border">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-person-badge me-2 text-primary"></i>
                      <div>
                        <strong className="text-primary">HR Department:</strong>
                        <span className="ms-2">
                          {ticket.isManuallyAssigned && ticket.assignedTo 
                            ? ticket.assignedTo.role 
                            : getRoutingInfo(ticket.category).assignedRole}
                        </span>
                      </div>
                    </div>
                    {getRoutingInfo(ticket.category).isConfidential && (
                      <div className="d-flex align-items-center mt-1">
                        <i className="bi bi-shield-lock me-2 text-warning"></i>
                        <small className="text-warning">
                          <strong>Confidential Ticket</strong>
                        </small>
                      </div>
                    )}
                  </div>
                  
                  <p><strong>Created:</strong> {formatDate(ticket.createdAt)}</p>
                  {ticket.resolvedAt && (
                    <p><strong>Resolved:</strong> {formatDate(ticket.resolvedAt)}</p>
                  )}
                </div>
                <div className="col-md-6">
                  <p><strong>Created By:</strong> {ticket.createdBy?.firstName} {ticket.createdBy?.lastName}</p>
                  {ticket.assignedTo && (
                    <p><strong>Assigned To:</strong> {ticket.assignedTo?.firstName} {ticket.assignedTo?.lastName} ({ticket.assignedTo?.role})</p>
                  )}
                  {ticket.escalationLevel > 0 && (
                    <p><strong>Escalation Level:</strong> {ticket.escalationLevel}</p>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <h6>Description:</h6>
                <p className="text-muted">{ticket.description}</p>
              </div>
              
              {/* Ticket Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-3">
                  <h6>Attachments:</h6>
                  <div className="row">
                    {ticket.attachments.map((attachment, index) => (
                      <div key={index} className="col-md-6 mb-2">
                        <div className="d-flex align-items-center p-2 border rounded bg-light">
                          <div className="me-2">
                            {attachment.mimetype?.startsWith('image/') ? (
                              <i className="bi bi-file-earmark-image text-primary fs-5"></i>
                            ) : attachment.mimetype === 'application/pdf' ? (
                              <i className="bi bi-file-earmark-pdf text-danger fs-5"></i>
                            ) : attachment.mimetype?.includes('word') ? (
                              <i className="bi bi-file-earmark-word text-primary fs-5"></i>
                            ) : (
                              <i className="bi bi-file-earmark text-secondary fs-5"></i>
                            )}
                          </div>
                          <div className="flex-grow-1 me-2">
                            <div className="fw-semibold text-truncate" style={{ fontSize: '14px' }}>
                              {attachment.originalName}
                            </div>
                            <small className="text-muted">
                              {formatFileSize(attachment.size)} • {formatDate(attachment.uploadedAt)}
                            </small>
                          </div>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handlePreviewAttachment(attachment)}
                              title="Preview file"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Feedback Display */}
              {ticket.feedback?.rating && (
                <div className="mt-3 p-3 bg-light rounded">
                  <h6>Customer Feedback:</h6>
                  <div className="d-flex align-items-center mb-2">
                    <span className="me-2">Rating:</span>
                    {[...Array(5)].map((_, i) => (
                      <i 
                        key={i} 
                        className={`bi bi-star${i < ticket.feedback.rating ? '-fill' : ''} text-warning`}
                      ></i>
                    ))}
                    <span className="ms-2">({ticket.feedback.rating}/5)</span>
                  </div>
                  {ticket.feedback.comment && (
                    <p className="mb-0 text-muted">{ticket.feedback.comment}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Conversation */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-chat-dots me-2"></i>
                Conversation ({conversation.length})
              </h5>
            </div>
            <div className="card-body" style={{ height: '400px', overflowY: 'auto' }}>
              {conversation.length === 0 ? (
                <div className="text-center text-muted">
                  <i className="bi bi-chat fs-1"></i>
                  <p className="mt-2">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div>
                  {conversation.map((message) => (
                    <div key={message._id} className={`d-flex mb-3 ${message.author._id === user._id ? 'justify-content-end' : ''}`}>
                      <div className={`card ${message.author._id === user._id ? 'bg-primary text-white' : 'bg-light'}`} style={{ maxWidth: '70%' }}>
                        <div className="card-body p-3">
                          <div className="d-flex align-items-center mb-2">
                            <div className={`rounded-circle d-flex align-items-center justify-content-center me-2 ${message.author._id === user._id ? 'bg-white text-primary' : 'bg-primary text-white'}`}
                                 style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                              <span className="fw-bold">
                                {message.author.firstName?.charAt(0)}{message.author.lastName?.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-grow-1">
                              <div className="fw-semibold" style={{ fontSize: '14px' }}>
                                {message.author.firstName} {message.author.lastName}
                              </div>
                              <small className={message.author._id === user._id ? 'text-white-50' : 'text-muted'}>
                                {message.author.role} • {formatDate(message.createdAt)}
                              </small>
                            </div>
                          </div>
                          <p className="mb-0">{message.message}</p>
                          
                          {/* Message Attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2">
                              {message.attachments.map((attachment, index) => (
                                <div key={index} className="d-flex align-items-center mt-1">
                                  <i className="bi bi-paperclip me-1"></i>
                                  <button
                                    className={`btn btn-link p-0 text-decoration-none ${message.author._id === user._id ? 'text-white' : 'text-primary'}`}
                                    onClick={() => handlePreviewAttachment(attachment)}
                                    style={{ fontSize: 'inherit' }}
                                  >
                                    {attachment.originalName}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            {/* Message Input - Show when ticket is not closed, or when reopened */}
            {(ticket.status !== 'Closed' || ticket.status === 'Reopened') && (
              <div className="card-footer">
                <form onSubmit={handleSendMessage}>
                  <div className="mb-3">
                    <textarea
                      className="form-control"
                      rows={3}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message here..."
                      disabled={messageLoading}
                    />
                  </div>
                  
                  {/* File Attachments */}
                  <div className="mb-3">
                    <input
                      type="file"
                      className="form-control"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileChange}
                      disabled={messageLoading}
                    />
                    
                    {attachments.length > 0 && (
                      <div className="mt-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="d-flex align-items-center justify-content-between bg-light p-2 rounded mb-1">
                            <div className="d-flex align-items-center">
                              <i className="bi bi-file-earmark me-2"></i>
                              <div>
                                <div className="fw-semibold" style={{ fontSize: '14px' }}>{file.name}</div>
                                <small className="text-muted">{formatFileSize(file.size)}</small>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeAttachment(index)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="d-flex justify-content-end">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={messageLoading || !newMessage.trim()}
                    >
                      {messageLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-send me-2"></i>
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          {/* Related FAQs */}
          {relatedFAQs.length > 0 && (
            <div className="card mb-3">
              <div className="card-header">
                <h6 className="mb-0">
                  <i className="bi bi-lightbulb me-2"></i>
                  Related FAQs
                </h6>
              </div>
              <div className="card-body">
                {relatedFAQs.map((faq) => (
                  <div key={faq._id} className="border-bottom pb-2 mb-2">
                    <h6 className="fw-semibold mb-1">{faq.question}</h6>
                    <p className="text-muted small mb-1">
                      {faq.answer.substring(0, 80)}...
                    </p>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => window.open(`/helpdesk/faq/${faq._id}`, '_blank')}
                    >
                      Read More
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ticket Actions */}
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="bi bi-gear me-2"></i>
                Quick Actions
              </h6>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                {/* Resolution Workflow Buttons */}
                {canHRResolve() && (
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={handleResolveByHR}
                    disabled={closeLoading}
                  >
                    {closeLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Resolving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-1"></i>
                        Resolve Ticket
                      </>
                    )}
                  </button>
                )}
                
                {canEmployeeConfirm() && (
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={handleConfirmByEmployee}
                    disabled={closeLoading}
                  >
                    {closeLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Confirming...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-1"></i>
                        Confirm Resolution
                      </>
                    )}
                  </button>
                )}
                
                {canEmployeeReopen() && (
                  <button 
                    className="btn btn-warning btn-sm"
                    onClick={handleReopenByEmployee}
                    disabled={closeLoading}
                  >
                    {closeLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Reopening...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Reopen Ticket
                      </>
                    )}
                  </button>
                )}
                
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => window.location.href = '/helpdesk'}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Ticket Status</h5>
                <button type="button" className="btn-close" onClick={() => setShowStatusModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">New Status</label>
                  <select 
                    className="form-select"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="">Select Status</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                    <option value="Reopened">Reopened</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Reason (Optional)</label>
                  <textarea 
                    className="form-control"
                    rows={3}
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Provide a reason for the status change..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleStatusUpdate}
                  disabled={!newStatus}
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Provide Feedback</h5>
                <button type="button" className="btn-close" onClick={() => setShowFeedbackModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Rating</label>
                  <div className="d-flex align-items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="btn btn-link p-0 me-1"
                        onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                      >
                        <i className={`bi bi-star${star <= feedback.rating ? '-fill' : ''} text-warning fs-4`}></i>
                      </button>
                    ))}
                    <span className="ms-2">({feedback.rating}/5)</span>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Comment (Optional)</label>
                  <textarea 
                    className="form-control"
                    rows={3}
                    value={feedback.comment}
                    onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Share your experience with our support..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFeedbackModal(false)}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSubmitFeedback}
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Attachment Preview Modal */}
      <TicketAttachmentPreviewModal
        show={showPreviewModal}
        onHide={handleClosePreview}
        attachment={selectedAttachment}
      />
    </div>
  );
};

export default TicketDetails;
