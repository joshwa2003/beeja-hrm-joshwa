import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentAPI } from '../../utils/api';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Pagination,
  Container,
  InputAdornment,
  Switch,
  FormControlLabel,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Delete,
  PlayArrow,
  Pause,
  Business,
  CheckCircle,
  Cancel,
  People,
  Refresh,
  Close,
} from '@mui/icons-material';

const DepartmentManagement = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    headOfDepartment: '',
    budget: '',
    location: '',
    isActive: true
  });

  useEffect(() => {
    fetchDepartments();
    fetchStats();
  }, [currentPage, searchTerm]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentAPI.getAllDepartments({
        page: currentPage,
        limit: 10,
        search: searchTerm
      });

      const data = response.data;
      setDepartments(data.departments);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await departmentAPI.getDepartmentStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data by filtering out empty optional fields
      const submitData = {
        name: formData.name,
        code: formData.code,
        isActive: formData.isActive
      };

      // Only include optional fields if they have values
      if (formData.description && formData.description.trim()) {
        submitData.description = formData.description.trim();
      }
      
      if (formData.headOfDepartment && formData.headOfDepartment.trim()) {
        submitData.headOfDepartment = formData.headOfDepartment.trim();
      }
      
      if (formData.budget && formData.budget.toString().trim()) {
        submitData.budget = parseFloat(formData.budget);
      }
      
      if (formData.location && formData.location.trim()) {
        submitData.location = formData.location.trim();
      }

      if (editingDepartment) {
        await departmentAPI.updateDepartment(editingDepartment._id, submitData);
      } else {
        await departmentAPI.createDepartment(submitData);
      }

      await fetchDepartments();
      await fetchStats();
      handleCloseModal();
      
      // Show success message
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save department');
    }
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      code: department.code,
      description: department.description || '',
      headOfDepartment: department.headOfDepartment?._id || '',
      budget: department.budget || '',
      location: department.location || '',
      isActive: department.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (departmentId) => {
    if (!window.confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      await departmentAPI.deleteDepartment(departmentId);
      await fetchDepartments();
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete department');
    }
  };

  const handleStatusToggle = async (departmentId, currentStatus) => {
    const newStatus = !currentStatus;
    const statusText = newStatus ? 'activate' : 'deactivate';
    
    if (!window.confirm(`Are you sure you want to ${statusText} this department?`)) {
      return;
    }

    try {
      await departmentAPI.toggleDepartmentStatus(departmentId, newStatus);
      await fetchDepartments();
      await fetchStats();
      setError(''); // Clear any previous errors
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update department status');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDepartment(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      headOfDepartment: '',
      budget: '',
      location: '',
      isActive: true
    });
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;
    
    // Convert department code to uppercase and remove invalid characters
    if (name === 'code') {
      processedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
  };

  if (loading && departments.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress size={60} sx={{ color: '#20C997' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0A192F', mb: 1 }}>
            Department Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage company departments and organizational structure
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setShowModal(true)}
          sx={{
            backgroundColor: '#20C997',
            '&:hover': {
              backgroundColor: '#17A085',
            },
            borderRadius: 2,
            px: 3,
            py: 1.5,
            fontWeight: 600,
          }}
        >
          Add Department
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #20C997 0%, #17A085 100%)',
              color: 'white',
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Total Departments
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {stats.totalDepartments || 0}
                  </Typography>
                </Box>
                <Business sx={{ fontSize: '3rem', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
              color: 'white',
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Active Departments
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {stats.activeDepartments || 0}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: '3rem', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
              color: 'white',
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Inactive Departments
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {stats.inactiveDepartments || 0}
                  </Typography>
                </Box>
                <Cancel sx={{ fontSize: '3rem', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
              color: 'white',
              borderRadius: 3,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Avg Employees
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700 }}>
                    {stats.departmentStats ? 
                      Math.round(stats.departmentStats.reduce((sum, dept) => sum + dept.activeEmployeeCount, 0) / stats.departmentStats.length) || 0
                      : 0
                    }
                  </Typography>
                </Box>
                <People sx={{ fontSize: '3rem', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  borderColor: '#E0E0E0',
                  color: '#666',
                  '&:hover': {
                    borderColor: '#20C997',
                    backgroundColor: 'rgba(32, 201, 151, 0.04)',
                  },
                }}
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

      {/* Departments Table */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Code</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Head of Department</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Employees</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Budget</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department._id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {department.name}
                        </Typography>
                        {department.description && (
                          <Typography variant="caption" color="text.secondary">
                            {department.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={department.code}
                        variant="outlined"
                        size="small"
                        sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      {department.headOfDepartment ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {department.headOfDepartment.firstName} {department.headOfDepartment.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {department.headOfDepartment.email}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not assigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={department.employeeCount || 0}
                        color="info"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      {department.budget ? (
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          ₹{department.budget.toLocaleString()}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not set
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={department.isActive ? 'Active' : 'Inactive'}
                        color={department.isActive ? 'success' : 'error'}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit Department">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(department)}
                            sx={{
                              color: '#20C997',
                              '&:hover': {
                                backgroundColor: 'rgba(32, 201, 151, 0.1)',
                              },
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'].includes(user?.role) && (
                          <>
                            <Tooltip title={department.isActive ? 'Deactivate Department' : 'Activate Department'}>
                              <IconButton
                                size="small"
                                onClick={() => handleStatusToggle(department._id, department.isActive)}
                                sx={{
                                  color: department.isActive ? '#FF9800' : '#4CAF50',
                                  '&:hover': {
                                    backgroundColor: department.isActive ? 'rgba(255, 152, 0, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                                  },
                                }}
                              >
                                {department.isActive ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Department">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(department._id)}
                                sx={{
                                  color: '#F44336',
                                  '&:hover': {
                                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                  },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(event, page) => setCurrentPage(page)}
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
        </CardContent>
      </Card>

      {/* Add/Edit Department Dialog */}
      <Dialog
        open={showModal}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {editingDepartment ? 'Edit Department' : 'Add New Department'}
            </Typography>
            <IconButton onClick={handleCloseModal} sx={{ color: 'text.secondary' }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Department Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Department Code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="e.g., IT, HR, FIN"
                  inputProps={{
                    maxLength: 10,
                    pattern: '[A-Z0-9]+',
                    style: { textTransform: 'uppercase' }
                  }}
                  helperText="Only uppercase letters and numbers allowed"
                  required
                  sx={{ mb: 2 }}
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
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Budget"
                  name="budget"
                  type="number"
                  value={formData.budget}
                  onChange={handleInputChange}
                  inputProps={{ min: 0 }}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      name="isActive"
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#20C997',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#20C997',
                        },
                      }}
                    />
                  }
                  label="Active Department"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={handleCloseModal}
              sx={{
                color: '#666',
                borderColor: '#E0E0E0',
                '&:hover': {
                  borderColor: '#20C997',
                  backgroundColor: 'rgba(32, 201, 151, 0.04)',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: '#20C997',
                '&:hover': {
                  backgroundColor: '#17A085',
                },
                px: 3,
                fontWeight: 600,
              }}
            >
              {editingDepartment ? 'Update Department' : 'Create Department'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default DepartmentManagement;
