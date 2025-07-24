import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveAPI } from '../../utils/api';
import LeaveStatusBadge from '../shared/LeaveStatusBadge';
import LeaveTimeline from '../shared/LeaveTimeline';
import DocumentPreviewModal from '../shared/DocumentPreviewModal';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  MenuItem,
  Alert,
  Chip,
  Paper,
  Container,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  CalendarToday,
  Visibility,
  Cancel,
  Assessment,
  FilterList,
  Refresh,
  AttachFile,
} from '@mui/icons-material';

const LeaveHistory = () => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [documentPreview, setDocumentPreview] = useState({ show: false, leaveId: '', attachment: null });
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewDocument = (leaveId, attachment) => {
    setDocumentPreview({
      show: true,
      leaveId: leaveId,
      attachment: attachment
    });
  };

  const handleCloseDocumentPreview = () => {
    setDocumentPreview({ show: false, leaveId: '', attachment: null });
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
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Page Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center' }}>
              <Assessment sx={{ mr: 2, fontSize: '2.5rem' }} />
              My Leave History
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              View and manage your leave requests
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">Total Requests</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {stats.totalRequests || 0}
                  </Typography>
                </Box>
                <CalendarToday sx={{ fontSize: '2rem', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #ed6c02 0%, #e65100 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">Pending</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {stats.pendingRequests || 0}
                  </Typography>
                </Box>
                <Assessment sx={{ fontSize: '2rem', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">Approved</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {stats.approvedRequests || 0}
                  </Typography>
                </Box>
                <Assessment sx={{ fontSize: '2rem', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #0288d1 0%, #01579b 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">Total Days</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {stats.totalDays || 0}
                  </Typography>
                </Box>
                <CalendarToday sx={{ fontSize: '2rem', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
            <FilterList sx={{ mr: 1 }} />
            Filter Options
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Approved by TL">Approved by TL</MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Leave Type</InputLabel>
                <Select
                  name="leaveType"
                  value={filters.leaveType}
                  onChange={handleFilterChange}
                  label="Leave Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="Casual">Casual</MenuItem>
                  <MenuItem value="Sick">Sick</MenuItem>
                  <MenuItem value="Earned">Earned</MenuItem>
                  <MenuItem value="Maternity">Maternity</MenuItem>
                  <MenuItem value="Paternity">Paternity</MenuItem>
                  <MenuItem value="Emergency">Emergency</MenuItem>
                  <MenuItem value="Unpaid">Unpaid</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select
                  name="year"
                  value={filters.year}
                  onChange={handleFilterChange}
                  label="Year"
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <MenuItem key={year} value={year}>{year}</MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => {
                  setFilters({
                    status: 'all',
                    leaveType: 'all',
                    year: new Date().getFullYear()
                  });
                  setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                fullWidth
              >
                Reset
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Leave Requests Table */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CalendarToday sx={{ fontSize: '4rem', color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
                No leave requests found
              </Typography>
              <Typography color="text.secondary">
                You haven't submitted any leave requests yet.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Leave Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Days</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Applied Date</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaveRequests.map((leave) => (
                      <TableRow key={leave._id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {leave.leaveType}
                            </Typography>
                            {leave.isHalfDay && (
                              <Typography variant="caption" color="text.secondary">
                                Half Day ({leave.halfDayPeriod})
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {formatDate(leave.startDate)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              to {formatDate(leave.endDate)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={leave.totalDays} color="info" size="small" />
                        </TableCell>
                        <TableCell>{formatDate(leave.appliedDate)}</TableCell>
                        <TableCell>
                          <LeaveStatusBadge status={leave.status} />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleViewDetails(leave._id)}
                              title="View Details"
                            >
                              <Visibility />
                            </IconButton>
                            {canCancelLeave(leave) && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleCancelLeave(leave._id)}
                                title="Cancel Request"
                              >
                                <Cancel />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <TablePagination
                  component="div"
                  count={pagination.totalCount}
                  page={pagination.currentPage - 1}
                  onPageChange={(event, newPage) => {
                    setPagination(prev => ({ ...prev, currentPage: newPage + 1 }));
                  }}
                  rowsPerPage={10}
                  onRowsPerPageChange={() => {}}
                  rowsPerPageOptions={[10]}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

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

                {/* Supporting Documents Section */}
                {selectedLeave.attachments && selectedLeave.attachments.length > 0 && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6 className="text-primary mb-3">
                        <i className="bi bi-paperclip me-2"></i>
                        Supporting Documents ({selectedLeave.attachments.length})
                      </h6>
                      <div className="row">
                        {selectedLeave.attachments.map((attachment, index) => (
                          <div key={index} className="col-md-6 mb-3">
                            <div className="card border">
                              <div className="card-body p-3">
                                <div className="d-flex align-items-center">
                                  <i className={`bi ${attachment.mimeType === 'application/pdf' ? 'bi-file-earmark-pdf text-danger' : 'bi-file-earmark-image text-primary'} me-3`} style={{ fontSize: '2rem' }}></i>
                                  <div className="flex-grow-1">
                                    <h6 className="mb-1">{attachment.originalName || attachment.fileName}</h6>
                                    <small className="text-muted">
                                      {formatFileSize(attachment.fileSize)} • 
                                      Uploaded: {formatDate(attachment.uploadDate)}
                                    </small>
                                    {attachment.expiryDate && new Date() > new Date(attachment.expiryDate) && (
                                      <div>
                                        <small className="text-danger">
                                          <i className="bi bi-exclamation-triangle me-1"></i>
                                          Document expired
                                        </small>
                                      </div>
                                    )}
                                  </div>
                                  <div className="ms-2">
                                    {attachment.expiryDate && new Date() <= new Date(attachment.expiryDate) ? (
                                      <button
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => handleViewDocument(selectedLeave._id, attachment)}
                                        title="View Document"
                                      >
                                        <i className="bi bi-eye"></i>
                                      </button>
                                    ) : (
                                      <button
                                        className="btn btn-sm btn-outline-secondary"
                                        disabled
                                        title="Document expired"
                                      >
                                        <i className="bi bi-eye-slash"></i>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        show={documentPreview.show}
        onHide={handleCloseDocumentPreview}
        leaveId={documentPreview.leaveId}
        attachment={documentPreview.attachment}
      />
    </Container>
  );
};

export default LeaveHistory;
