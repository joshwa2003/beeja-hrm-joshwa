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
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Container,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  ButtonGroup,
  Tooltip,
  Divider,
  Stack,
} from '@mui/material';
import {
  CalendarToday,
  Schedule,
  CheckCircle,
  Cancel,
  Visibility,
  Refresh,
  FilterList,
  Clear,
  Person,
  Business,
  Event,
  Assignment,
  AttachFile,
  PictureAsPdf,
  Image,
  Warning,
} from '@mui/icons-material';

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
  const [documentPreview, setDocumentPreview] = useState({ show: false, leaveId: '', attachment: null });
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
      <Container maxWidth={false} sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ color: '#20C997', mb: 3 }} />
            <Typography variant="body1" color="text.secondary">
              Loading leave requests...
            </Typography>
          </Box>
        </Box>
      </Container>
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
              <CalendarToday sx={{ mr: 2, fontSize: '2.5rem' }} />
              {getPageTitle()}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              {getPageDescription()}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              fetchLeaveRequests();
              fetchLeaveStats();
            }}
            disabled={loading}
            startIcon={<Refresh />}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.3)',
              },
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards - Compact Design */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#1976d2', color: 'white', borderRadius: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarToday sx={{ fontSize: '1.5rem', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {stats.totalRequests || 0}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Total Requests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#ed6c02', color: 'white', borderRadius: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Schedule sx={{ fontSize: '1.5rem', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {stats.pendingRequests || 0}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#2e7d32', color: 'white', borderRadius: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ fontSize: '1.5rem', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {stats.approvedRequests || 0}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Approved
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: '#d32f2f', color: 'white', borderRadius: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Cancel sx={{ fontSize: '1.5rem', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {stats.rejectedRequests || 0}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Rejected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="Status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                size="small"
              >
                <MenuItem value="all">All Status</MenuItem>
                {isTeamLeader && !isHR && (
                  <>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Approved by TL">Approved by TL</MenuItem>
                    <MenuItem value="Rejected by TL">Rejected by TL</MenuItem>
                    <MenuItem value="Approved">Approved by HR</MenuItem>
                    <MenuItem value="Rejected">Rejected by HR</MenuItem>
                  </>
                )}
                {isHR && (
                  <>
                    <MenuItem value="pending-hr">Pending HR Approval</MenuItem>
                    <MenuItem value="Approved">Approved</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </>
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="Leave Type"
                name="leaveType"
                value={filters.leaveType}
                onChange={handleFilterChange}
                size="small"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="Casual">Casual</MenuItem>
                <MenuItem value="Sick">Sick</MenuItem>
                <MenuItem value="Earned">Earned</MenuItem>
                <MenuItem value="Maternity">Maternity</MenuItem>
                <MenuItem value="Paternity">Paternity</MenuItem>
                <MenuItem value="Emergency">Emergency</MenuItem>
                <MenuItem value="Unpaid">Unpaid</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
              <Button
                variant="outlined"
                startIcon={<Clear />}
                onClick={() => {
                  setFilters({
                    status: 'all',
                    leaveType: 'all',
                    department: 'all'
                  });
                  setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                sx={{
                  borderColor: '#20C997',
                  color: '#20C997',
                  '&:hover': {
                    borderColor: '#17A085',
                    backgroundColor: 'rgba(32, 201, 151, 0.04)',
                  },
                }}
              >
                Reset Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Success/Error Alerts */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess('')}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {success}
        </Alert>
      )}

      {/* Leave Requests Table */}
      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          {leaveRequests.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Event sx={{ fontSize: '4rem', color: 'text.disabled', mb: 2, opacity: 0.3 }} />
              <Typography variant="h4" sx={{ color: 'text.secondary', mb: 1 }}>
                No Leave Requests Found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                No leave requests match your current filters.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
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
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                mr: 1.5,
                                bgcolor: '#20C997',
                                fontSize: '0.8rem',
                              }}
                            >
                              {leave.employee?.firstName?.[0]}{leave.employee?.lastName?.[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                {leave.employee?.firstName} {leave.employee?.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {leave.employee?.employeeId} • {leave.employee?.designation}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
                          <Chip
                            label={leave.totalDays}
                            size="small"
                            sx={{
                              bgcolor: '#0288d1',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(leave.appliedDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <LeaveStatusBadge status={leave.status} />
                        </TableCell>
                        <TableCell>
                          <ButtonGroup size="small" variant="outlined">
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(leave._id)}
                                sx={{ borderColor: '#1976d2', color: '#1976d2' }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {canApprove(leave) && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleActionClick('approve', leave._id)}
                                    sx={{ borderColor: '#2e7d32', color: '#2e7d32' }}
                                  >
                                    <CheckCircle fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleActionClick('reject', leave._id)}
                                    sx={{ borderColor: '#d32f2f', color: '#d32f2f' }}
                                  >
                                    <Cancel fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </ButtonGroup>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <Pagination
                    count={pagination.totalPages}
                    page={pagination.currentPage}
                    onChange={(event, page) => setPagination(prev => ({ ...prev, currentPage: page }))}
                    color="primary"
                    size="large"
                    sx={{
                      '& .MuiPaginationItem-root': {
                        '&.Mui-selected': {
                          backgroundColor: '#20C997',
                          '&:hover': {
                            backgroundColor: '#17A085',
                          },
                        },
                      },
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

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

export default LeaveApproval;
