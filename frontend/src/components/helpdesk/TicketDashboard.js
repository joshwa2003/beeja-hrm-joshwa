import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const TicketDashboard = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [filters]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets', { params: filters });
      setTickets(response.data.tickets);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/tickets/stats');
      setStats(response.data.overview);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'Open': 'bg-primary',
      'In Progress': 'bg-warning',
      'Pending': 'bg-info',
      'Resolved': 'bg-success',
      'Closed': 'bg-secondary',
      'Escalated': 'bg-danger'
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

  const canCreateTicket = () => {
    return ['Employee', 'Team Leader', 'Team Manager', 'HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'].includes(user?.role);
  };

  const isHRRole = () => {
    return ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'].includes(user?.role);
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2><i className="bi bi-headset me-2"></i>Helpdesk Dashboard</h2>
          <p className="text-muted mb-0">Manage and track support tickets</p>
        </div>
        {canCreateTicket() && (
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/helpdesk/create'}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Create Ticket
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-2">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Total</h6>
                  <h3 className="mb-0">{stats.total || 0}</h3>
                </div>
                <i className="bi bi-ticket-perforated fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Open</h6>
                  <h3 className="mb-0">{stats.open || 0}</h3>
                </div>
                <i className="bi bi-folder2-open fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">In Progress</h6>
                  <h3 className="mb-0">{stats.inProgress || 0}</h3>
                </div>
                <i className="bi bi-arrow-clockwise fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Resolved</h6>
                  <h3 className="mb-0">{stats.resolved || 0}</h3>
                </div>
                <i className="bi bi-check-circle fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-danger text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Escalated</h6>
                  <h3 className="mb-0">{stats.escalated || 0}</h3>
                </div>
                <i className="bi bi-arrow-up-circle fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card bg-secondary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Closed</h6>
                  <h3 className="mb-0">{stats.closed || 0}</h3>
                </div>
                <i className="bi bi-archive fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select 
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Escalated">Escalated</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Category</label>
              <select 
                className="form-select"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Leave Issue">Leave Issue</option>
                <option value="Attendance Issue">Attendance Issue</option>
                <option value="Payroll / Salary Issue">Payroll / Salary Issue</option>
                <option value="Performance Review Concern">Performance Review Concern</option>
                <option value="Training / LMS Access Issue">Training / LMS Access Issue</option>
                <option value="HRMS Login Issue">HRMS Login Issue</option>
                <option value="General HR Query">General HR Query</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Priority</label>
              <select 
                className="form-select"
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Items per page</label>
              <select 
                className="form-select"
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-list-ul me-2"></i>
            Tickets ({pagination.total || 0})
          </h5>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center p-4">
              <i className="bi bi-inbox fs-1 text-muted"></i>
              <p className="text-muted mt-2">No tickets found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created By</th>
                    {isHRRole() && <th>Assigned To</th>}
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket._id}>
                      <td>
                        <span className="fw-bold text-primary">{ticket.ticketNumber}</span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          {ticket.isConfidential && (
                            <i className="bi bi-shield-lock text-warning me-2" title="Confidential"></i>
                          )}
                          <span className="text-truncate" style={{ maxWidth: '200px' }}>
                            {ticket.subject}
                          </span>
                        </div>
                      </td>
                      <td>
                        <small className="text-muted">{ticket.category}</small>
                      </td>
                      <td>
                        <span className={getPriorityBadgeClass(ticket.priority)}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(ticket.status)}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2"
                               style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                            <span className="text-white fw-bold">
                              {ticket.createdBy?.firstName?.charAt(0)}{ticket.createdBy?.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="fw-semibold" style={{ fontSize: '13px' }}>
                              {ticket.createdBy?.firstName} {ticket.createdBy?.lastName}
                            </div>
                            <small className="text-muted">{ticket.createdBy?.role}</small>
                          </div>
                        </div>
                      </td>
                      {isHRRole() && (
                        <td>
                          {ticket.assignedTo ? (
                            <div className="d-flex align-items-center">
                              <div className="bg-success rounded-circle d-flex align-items-center justify-content-center me-2"
                                   style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                                <span className="text-white fw-bold">
                                  {ticket.assignedTo?.firstName?.charAt(0)}{ticket.assignedTo?.lastName?.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="fw-semibold" style={{ fontSize: '13px' }}>
                                  {ticket.assignedTo?.firstName} {ticket.assignedTo?.lastName}
                                </div>
                                <small className="text-muted">{ticket.assignedTo?.role}</small>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">Unassigned</span>
                          )}
                        </td>
                      )}
                      <td>
                        <small className="text-muted">{formatDate(ticket.createdAt)}</small>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => window.location.href = `/helpdesk/tickets/${ticket._id}`}
                        >
                          <i className="bi bi-eye me-1"></i>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="card-footer">
            <nav>
              <ul className="pagination justify-content-center mb-0">
                <li className={`page-item ${pagination.current === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => handleFilterChange('page', pagination.current - 1)}
                    disabled={pagination.current === 1}
                  >
                    Previous
                  </button>
                </li>
                {[...Array(pagination.pages)].map((_, index) => (
                  <li key={index + 1} className={`page-item ${pagination.current === index + 1 ? 'active' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => handleFilterChange('page', index + 1)}
                    >
                      {index + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${pagination.current === pagination.pages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => handleFilterChange('page', pagination.current + 1)}
                    disabled={pagination.current === pagination.pages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDashboard;
