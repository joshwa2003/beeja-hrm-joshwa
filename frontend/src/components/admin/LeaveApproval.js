import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveAPI } from '../../utils/api';
import LeaveStatusBadge from '../shared/LeaveStatusBadge';
import LeaveTimeline from '../shared/LeaveTimeline';

const LeaveApproval = () => {
  const { user, hasAnyRole } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionModal, setActionModal] = useState({ show: false, action: '', leaveId: '' });
  const [comments, setComments] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    leaveType: 'all',
    department: 'all'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });
  const [stats, setStats] = useState({});

  const isTeamLeader = hasAnyRole(['Team Leader', 'Team Manager']);
  const isHR = hasAnyRole(['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin']);

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveStats();
  }, [filters, pagination.currentPage]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      
      // Prepare params, excluding 'all' values
      const params = {
        page: pagination.currentPage,
        limit: 10
      };

      // Only add filters if they're not 'all'
      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      
      if (filters.leaveType && filters.leaveType !== 'all') {
        params.leaveType = filters.leaveType;
      }
      
      if (filters.department && filters.department !== 'all') {
        params.department = filters.department;
      }

      let response;
      if (isTeamLeader && !isHR) {
        response = await leaveAPI.getTeamLeaveRequests(params);
      } else if (isHR) {
        response = await leaveAPI.getHRLeaveRequests(params);
      } else {
        response = await leaveAPI.getAllLeaveRequests(params);
      }

      setLeaveRequests(response.data.leaveRequests);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveStats = async () => {
    try {
      const response = await leaveAPI.getLeaveStats();
      setStats(response.data.stats);
    } catch (err) {
      console.error('Failed to fetch leave stats:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleViewDetails = async (leaveId) => {
    try {
      const response = await leaveAPI.getLeaveRequestById(leaveId);
      setSelectedLeave(response.data.leaveRequest);
      setShowModal(true);
    } catch (err) {
      setError('Failed to fetch leave details');
    }
  };

  const handleActionClick = (action, leaveId) => {
    setActionModal({ show: true, action, leaveId });
    setComments('');
  };

  const handleApproveReject = async () => {
    try {
      const { action, leaveId } = actionModal;
      
      if (isTeamLeader && !isHR) {
        await leaveAPI.approveRejectLeaveByTL(leaveId, action, comments);
      } else if (isHR) {
        await leaveAPI.finalApproveRejectLeave(leaveId, action, comments);
      }

      setSuccess(`Leave request ${action}d successfully`);
      setActionModal({ show: false, action: '', leaveId: '' });
      setComments('');
      fetchLeaveRequests();
      fetchLeaveStats();
      
      if (showModal) {
        const response = await leaveAPI.getLeaveRequestById(leaveId);
        setSelectedLeave(response.data.leaveRequest);
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process leave request');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const canApprove = (leave) => {
    if (isTeamLeader && !isHR) {
      return leave.status === 'Pending';
    } else if (isHR) {
      return leave.status === 'Approved by TL';
    }
    return false;
  };

  const getPageTitle = () => {
    if (isTeamLeader && !isHR) {
      return 'Team Leave Approvals';
    } else if (isHR) {
      return 'HR Leave Approvals';
    }
    return 'Leave Management';
  };

  const getPageDescription = () => {
    if (isTeamLeader && !isHR) {
      return 'Review and approve leave requests from your team members';
    } else if (isHR) {
      return 'Final approval for team leader approved leave requests';
    }
    return 'Manage all leave requests in the organization';
  };

  if (loading && leaveRequests.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">{getPageTitle()}</h2>
          <p className="text-muted">{getPageDescription()}</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h5 className="card-title">Total Requests</h5>
                  <h3 className="mb-0">{stats.totalRequests || 0}</h3>
                </div>
                <i className="bi bi-calendar3" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h5 className="card-title">Pending</h5>
                  <h3 className="mb-0">{stats.pendingRequests || 0}</h3>
                </div>
                <i className="bi bi-clock" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h5 className="card-title">Approved</h5>
                  <h3 className="mb-0">{stats.approvedRequests || 0}</h3>
                </div>
                <i className="bi bi-check-circle" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-danger text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h5 className="card-title">Rejected</h5>
                  <h3 className="mb-0">{stats.rejectedRequests || 0}</h3>
                </div>
                <i className="bi bi-x-circle" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="all">All Status</option>
                {isTeamLeader && !isHR && (
                  <>
                    <option value="Pending">Pending</option>
                    <option value="Approved by TL">Approved by TL</option>
                    <option value="Rejected by TL">Rejected by TL</option>
                    <option value="Approved">Approved by HR</option>
                    <option value="Rejected">Rejected by HR</option>
                  </>
                )}
                {isHR && (
                  <>
                    <option value="pending-hr">Pending HR Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </>
                )}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Leave Type</label>
              <select
                className="form-select"
                name="leaveType"
                value={filters.leaveType}
                onChange={handleFilterChange}
              >
                <option value="all">All Types</option>
                <option value="Casual">Casual</option>
                <option value="Sick">Sick</option>
                <option value="Earned">Earned</option>
                <option value="Maternity">Maternity</option>
                <option value="Paternity">Paternity</option>
                <option value="Emergency">Emergency</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setFilters({
                    status: 'all',
                    leaveType: 'all',
                    department: 'all'
                  });
                  setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="card">
        <div className="card-body">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-calendar-x text-muted" style={{ fontSize: '3rem' }}></i>
              <h5 className="mt-3 text-muted">No leave requests found</h5>
              <p className="text-muted">No leave requests match your current filters.</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Duration</th>
                      <th>Days</th>
                      <th>Applied Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((leave) => (
                      <tr key={leave._id}>
                        <td>
                          <div>
                            <div className="fw-semibold">
                              {leave.employee?.firstName} {leave.employee?.lastName}
                            </div>
                            <small className="text-muted">
                              {leave.employee?.employeeId} • {leave.employee?.designation}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div className="fw-semibold">{leave.leaveType}</div>
                            {leave.isHalfDay && (
                              <small className="text-muted">
                                Half Day ({leave.halfDayPeriod})
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div>
                            <div>{formatDate(leave.startDate)}</div>
                            <small className="text-muted">
                              to {formatDate(leave.endDate)}
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-info">{leave.totalDays}</span>
                        </td>
                        <td>{formatDate(leave.appliedDate)}</td>
                        <td>
                          <LeaveStatusBadge status={leave.status} />
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleViewDetails(leave._id)}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            {canApprove(leave) && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => handleActionClick('approve', leave._id)}
                                  title="Approve"
                                >
                                  <i className="bi bi-check-circle"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleActionClick('reject', leave._id)}
                                  title="Reject"
                                >
                                  <i className="bi bi-x-circle"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <nav className="mt-4">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                        disabled={pagination.currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {[...Array(pagination.totalPages)].map((_, index) => (
                      <li key={index} className={`page-item ${pagination.currentPage === index + 1 ? 'active' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setPagination(prev => ({ ...prev, currentPage: index + 1 }))}
                        >
                          {index + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                        disabled={pagination.currentPage === pagination.totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* Leave Details Modal */}
      {showModal && selectedLeave && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Leave Request Details - {selectedLeave.employee?.firstName} {selectedLeave.employee?.lastName}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Employee Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Name:</strong></td>
                          <td>{selectedLeave.employee?.firstName} {selectedLeave.employee?.lastName}</td>
                        </tr>
                        <tr>
                          <td><strong>Employee ID:</strong></td>
                          <td>{selectedLeave.employee?.employeeId}</td>
                        </tr>
                        <tr>
                          <td><strong>Department:</strong></td>
                          <td>{selectedLeave.employee?.department?.name || selectedLeave.employee?.department || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Designation:</strong></td>
                          <td>{selectedLeave.employee?.designation}</td>
                        </tr>
                      </tbody>
                    </table>

                    <h6 className="text-primary mb-3 mt-4">Leave Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Leave Type:</strong></td>
                          <td>{selectedLeave.leaveType}</td>
                        </tr>
                        <tr>
                          <td><strong>Duration:</strong></td>
                          <td>
                            {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Total Days:</strong></td>
                          <td>{selectedLeave.totalDays}</td>
                        </tr>
                        <tr>
                          <td><strong>Half Day:</strong></td>
                          <td>
                            {selectedLeave.isHalfDay ? `Yes (${selectedLeave.halfDayPeriod})` : 'No'}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Applied Date:</strong></td>
                          <td>{formatDate(selectedLeave.appliedDate)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-primary mb-3">Approval Timeline</h6>
                    <LeaveTimeline leaveRequest={selectedLeave} />
                  </div>
                </div>

                <div className="row mt-4">
                  <div className="col-12">
                    <h6 className="text-primary mb-3">Reason for Leave</h6>
                    <p className="text-muted">{selectedLeave.reason}</p>
                  </div>
                </div>

                {selectedLeave.handoverNotes && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6 className="text-primary mb-3">Handover Notes</h6>
                      <p className="text-muted">{selectedLeave.handoverNotes}</p>
                    </div>
                  </div>
                )}

                {selectedLeave.emergencyContact && selectedLeave.emergencyContact.name && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6 className="text-primary mb-3">Emergency Contact</h6>
                      <p className="text-muted">
                        <strong>{selectedLeave.emergencyContact.name}</strong><br />
                        {selectedLeave.emergencyContact.phone}<br />
                        <small>Relationship: {selectedLeave.emergencyContact.relationship}</small>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {canApprove(selectedLeave) && (
                  <>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => handleActionClick('approve', selectedLeave._id)}
                    >
                      <i className="bi bi-check-circle me-2"></i>
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleActionClick('reject', selectedLeave._id)}
                    >
                      <i className="bi bi-x-circle me-2"></i>
                      Reject
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Approve/Reject) */}
      {actionModal.show && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {actionModal.action === 'approve' ? 'Approve' : 'Reject'} Leave Request
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setActionModal({ show: false, action: '', leaveId: '' })}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">
                    Comments {actionModal.action === 'reject' ? '(Required)' : '(Optional)'}
                  </label>
                  <textarea
                    className="form-control"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows="3"
                    placeholder={`Add your ${actionModal.action === 'approve' ? 'approval' : 'rejection'} comments here...`}
                    required={actionModal.action === 'reject'}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActionModal({ show: false, action: '', leaveId: '' })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn ${actionModal.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
                  onClick={handleApproveReject}
                  disabled={actionModal.action === 'reject' && !comments.trim()}
                >
                  <i className={`bi ${actionModal.action === 'approve' ? 'bi-check-circle' : 'bi-x-circle'} me-2`}></i>
                  {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveApproval;
