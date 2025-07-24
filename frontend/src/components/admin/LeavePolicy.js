import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveAPI } from '../../utils/api';
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
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ButtonGroup,
  Tooltip,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import {
  Policy,
  Add,
  Edit,
  Delete,
  Save,
  Cancel,
  Visibility,
  VisibilityOff,
  Settings,
  Info,
  CheckCircle,
  Warning,
  Error,
} from '@mui/icons-material';

const LeavePolicy = () => {
  const { hasAnyRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [policies, setPolicies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    policyName: '',
    leaveType: 'Annual',
    maxDaysPerYear: 0,
    maxConsecutiveDays: 0,
    minAdvanceNotice: 0,
    carryForwardAllowed: false,
    maxCarryForwardDays: 0,
    probationPeriodRestriction: false,
    probationMonths: 0,
    weekendIncluded: false,
    holidayIncluded: false,
    medicalCertificateRequired: false,
    medicalCertificateDays: 0,
    approvalRequired: true,
    autoApprovalDays: 0,
    description: '',
    isActive: true
  });

  const canManagePolicies = hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']);

  const leaveTypes = [
    { value: 'Annual', label: 'Annual Leave', color: '#2196F3' },
    { value: 'Sick', label: 'Sick Leave', color: '#FF9800' },
    { value: 'Maternity', label: 'Maternity Leave', color: '#E91E63' },
    { value: 'Paternity', label: 'Paternity Leave', color: '#9C27B0' },
    { value: 'Emergency', label: 'Emergency Leave', color: '#F44336' },
    { value: 'Casual', label: 'Casual Leave', color: '#4CAF50' },
    { value: 'Compensatory', label: 'Compensatory Leave', color: '#FF5722' },
    { value: 'Study', label: 'Study Leave', color: '#607D8B' },
    { value: 'Sabbatical', label: 'Sabbatical Leave', color: '#795548' },
    { value: 'Unpaid', label: 'Unpaid Leave', color: '#9E9E9E' }
  ];

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      // This would be the actual API call
      // const response = await leaveAPI.getPolicies();
      // setPolicies(response.data.policies || []);
      
      // Mock data for demonstration
      setPolicies([
        {
          _id: '1',
          policyName: 'Standard Annual Leave',
          leaveType: 'Annual',
          maxDaysPerYear: 21,
          maxConsecutiveDays: 15,
          minAdvanceNotice: 7,
          carryForwardAllowed: true,
          maxCarryForwardDays: 5,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          _id: '2',
          policyName: 'Sick Leave Policy',
          leaveType: 'Sick',
          maxDaysPerYear: 12,
          maxConsecutiveDays: 7,
          minAdvanceNotice: 0,
          medicalCertificateRequired: true,
          medicalCertificateDays: 3,
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ]);
    } catch (err) {
      setError('Failed to fetch leave policies');
      console.error('Fetch policies error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingPolicy) {
        // await leaveAPI.updatePolicy(editingPolicy._id, formData);
        setSuccess('Leave policy updated successfully!');
      } else {
        // await leaveAPI.createPolicy(formData);
        setSuccess('Leave policy created successfully!');
      }

      setShowModal(false);
      setEditingPolicy(null);
      resetForm();
      fetchPolicies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save leave policy');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      policyName: policy.policyName || '',
      leaveType: policy.leaveType || 'Annual',
      maxDaysPerYear: policy.maxDaysPerYear || 0,
      maxConsecutiveDays: policy.maxConsecutiveDays || 0,
      minAdvanceNotice: policy.minAdvanceNotice || 0,
      carryForwardAllowed: policy.carryForwardAllowed || false,
      maxCarryForwardDays: policy.maxCarryForwardDays || 0,
      probationPeriodRestriction: policy.probationPeriodRestriction || false,
      probationMonths: policy.probationMonths || 0,
      weekendIncluded: policy.weekendIncluded || false,
      holidayIncluded: policy.holidayIncluded || false,
      medicalCertificateRequired: policy.medicalCertificateRequired || false,
      medicalCertificateDays: policy.medicalCertificateDays || 0,
      approvalRequired: policy.approvalRequired !== false,
      autoApprovalDays: policy.autoApprovalDays || 0,
      description: policy.description || '',
      isActive: policy.isActive !== false
    });
    setShowModal(true);
  };

  const handleDelete = async (policyId) => {
    if (!window.confirm('Are you sure you want to delete this leave policy?')) {
      return;
    }

    try {
      setLoading(true);
      // await leaveAPI.deletePolicy(policyId);
      setSuccess('Leave policy deleted successfully!');
      fetchPolicies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete leave policy');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (policyId, currentStatus) => {
    try {
      setLoading(true);
      // await leaveAPI.updatePolicyStatus(policyId, !currentStatus);
      setSuccess(`Leave policy ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      fetchPolicies();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update policy status');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      policyName: '',
      leaveType: 'Annual',
      maxDaysPerYear: 0,
      maxConsecutiveDays: 0,
      minAdvanceNotice: 0,
      carryForwardAllowed: false,
      maxCarryForwardDays: 0,
      probationPeriodRestriction: false,
      probationMonths: 0,
      weekendIncluded: false,
      holidayIncluded: false,
      medicalCertificateRequired: false,
      medicalCertificateDays: 0,
      approvalRequired: true,
      autoApprovalDays: 0,
      description: '',
      isActive: true
    });
  };

  const openAddModal = () => {
    setEditingPolicy(null);
    resetForm();
    setShowModal(true);
  };

  const getLeaveTypeConfig = (type) => {
    return leaveTypes.find(t => t.value === type) || leaveTypes[0];
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Statistics
  const stats = {
    totalPolicies: policies.length,
    activePolicies: policies.filter(p => p.isActive).length,
    inactivePolicies: policies.filter(p => !p.isActive).length,
    leaveTypes: [...new Set(policies.map(p => p.leaveType))].length
  };

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
              <Policy sx={{ mr: 2, fontSize: '2.5rem' }} />
              Leave Policies
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Manage company leave policies and rules
            </Typography>
          </Box>
          {canManagePolicies && (
            <Button
              variant="contained"
              size="large"
              onClick={openAddModal}
              startIcon={<Add />}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.3)',
                },
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              Add Policy
            </Button>
          )}
        </Box>
      </Box>

      {/* Alerts */}
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

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                    {stats.totalPolicies}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Policies
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <Policy />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>
                    {stats.activePolicies}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Policies
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main', mb: 1 }}>
                    {stats.inactivePolicies}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Inactive Policies
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <Warning />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main', mb: 1 }}>
                    {stats.leaveTypes}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Leave Types
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                  <Settings />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Policies Table */}
      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Leave Policies
            </Typography>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Policy Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Leave Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Max Days/Year</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Max Consecutive</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Advance Notice</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {policies
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((policy) => {
                    const typeConfig = getLeaveTypeConfig(policy.leaveType);
                    return (
                      <TableRow key={policy._id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {policy.policyName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={typeConfig.label}
                            size="small"
                            sx={{
                              bgcolor: typeConfig.color,
                              color: 'white',
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {policy.maxDaysPerYear} days
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {policy.maxConsecutiveDays} days
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {policy.minAdvanceNotice} days
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={policy.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            color={policy.isActive ? 'success' : 'default'}
                            variant={policy.isActive ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell>
                          <ButtonGroup size="small" variant="outlined">
                            <Tooltip title="Edit Policy">
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(policy)}
                                disabled={!canManagePolicies}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={policy.isActive ? 'Deactivate' : 'Activate'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleStatus(policy._id, policy.isActive)}
                                disabled={!canManagePolicies}
                              >
                                {policy.isActive ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Policy">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(policy._id)}
                                disabled={!canManagePolicies}
                                color="error"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </ButtonGroup>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={policies.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Policy Modal */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {editingPolicy ? 'Edit Leave Policy' : 'Add New Leave Policy'}
          </Typography>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Policy Name"
                  name="policyName"
                  value={formData.policyName}
                  onChange={handleInputChange}
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Leave Type</InputLabel>
                  <Select
                    name="leaveType"
                    value={formData.leaveType}
                    onChange={handleInputChange}
                    label="Leave Type"
                  >
                    {leaveTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Days Per Year"
                  name="maxDaysPerYear"
                  type="number"
                  value={formData.maxDaysPerYear}
                  onChange={handleInputChange}
                  required
                  size="small"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Consecutive Days"
                  name="maxConsecutiveDays"
                  type="number"
                  value={formData.maxConsecutiveDays}
                  onChange={handleInputChange}
                  size="small"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Minimum Advance Notice (Days)"
                  name="minAdvanceNotice"
                  type="number"
                  value={formData.minAdvanceNotice}
                  onChange={handleInputChange}
                  size="small"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      name="carryForwardAllowed"
                      checked={formData.carryForwardAllowed}
                      onChange={handleInputChange}
                    />
                  }
                  label="Allow Carry Forward"
                />
              </Grid>
              {formData.carryForwardAllowed && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Carry Forward Days"
                    name="maxCarryForwardDays"
                    type="number"
                    value={formData.maxCarryForwardDays}
                    onChange={handleInputChange}
                    size="small"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      name="medicalCertificateRequired"
                      checked={formData.medicalCertificateRequired}
                      onChange={handleInputChange}
                    />
                  }
                  label="Medical Certificate Required"
                />
              </Grid>
              {formData.medicalCertificateRequired && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Medical Certificate Required After (Days)"
                    name="medicalCertificateDays"
                    type="number"
                    value={formData.medicalCertificateDays}
                    onChange={handleInputChange}
                    size="small"
                    inputProps={{ min: 1 }}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      name="approvalRequired"
                      checked={formData.approvalRequired}
                      onChange={handleInputChange}
                    />
                  }
                  label="Approval Required"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                    />
                  }
                  label="Active Policy"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  size="small"
                  placeholder="Optional policy description and additional rules"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => setShowModal(false)}
              startIcon={<Cancel />}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <Save />}
              disabled={loading}
            >
              {loading ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default LeavePolicy;
