import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveAPI } from '../../utils/api';
import LeaveStatusBadge from '../shared/LeaveStatusBadge';
import LeaveTimeline from '../shared/LeaveTimeline';

const LeaveHistory = () => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    leaveType: 'all',
    year: new Date().getFullYear()
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveStats();
  }, [filters, pagination.currentPage]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.currentPage,
        limit: 10,
        ...filters
      };

      const response = await leaveAPI.getMyLeaveRequests(params);
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
      const response = await leaveAPI.getLeaveStats({ year: filters.year });
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

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) {
      return;
    }

    try {
      await leaveAPI.cancelLeaveRequest(leaveId);
      fetchLeaveRequests();
      fetchLeaveStats();
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel leave request');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const canCancelLeave = (leave) => {
    return leave.status === 'Pending' && new Date(leave.startDate) > new Date();
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
          <h2 className="mb-1">My Leave History</h2>
          <p className="text-muted">View and manage your leave requests</p>
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
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h5 className="card-title">Total Days</h5>
                  <h3 className="mb-0">{stats.totalDays || 0}</h3>
                </div>
                <i className="bi bi-calendar-check" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved by TL">Approved by TL</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-md-3">
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
            <div className="col-md-3">
              <label className="form-label">Year</label>
              <select
                className="form-select"
                name="year"
                value={filters.year}
                onChange={handleFilterChange}
              >
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>{year}</option>
                  );
                })}
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setFilters({
                    status: 'all',
                    leaveType: 'all',
                    year: new Date().getFullYear()
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

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="card">
        <div className="card-body">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-calendar-x text-muted" style={{ fontSize: '3rem' }}></i>
              <h5 className="mt-3 text-muted">No leave requests found</h5>
              <p className="text-muted">You haven't submitted any leave requests yet.</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
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
                            {canCancelLeave(leave) && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleCancelLeave(leave._id)}
                                title="Cancel Request"
                              >
                                <i className="bi bi-x-circle"></i>
                              </button>
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
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Leave Request Details
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
                    <h6 className="text-primary mb-3">Leave Information</h6>
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
                          <td><strong>Status:</strong></td>
                          <td><LeaveStatusBadge status={selectedLeave.status} /></td>
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
                    <h6 className="text-primary mb-3">Reason</h6>
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
                {canCancelLeave(selectedLeave) && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleCancelLeave(selectedLeave._id)}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Cancel Request
                  </button>
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
    </div>
  );
};

export default LeaveHistory;
