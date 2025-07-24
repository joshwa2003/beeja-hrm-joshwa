import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userAPI, departmentAPI, teamAPI } from '../../utils/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  Grid,
  Alert,
  CircularProgress,
  Pagination,
  InputAdornment,
  Switch,
  FormControlLabel,
  Tooltip,
  useTheme,
  Container,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  Person,
  FilterList,
  Refresh,
  PersonAdd,
  Business,
  Groups,
  Phone,
  Email,
  CalendarToday,
} from '@mui/icons-material';

const UserManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [addFormData, setAddFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Employee',
    department: '',
    employeeId: '',
    phoneNumber: '',
    designation: '',
    joiningDate: '',
    isActive: true
  });

  // Team assignment states
  const [showTeamCreation, setShowTeamCreation] = useState(false);
  const [teamFormData, setTeamFormData] = useState({
    selectedTeam: ''
  });
  const [availableUsers, setAvailableUsers] = useState({
    teams: []
  });
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'Employee',
    department: '',
    employeeId: '',
    phoneNumber: '',
    designation: '',
    joiningDate: '',
    isActive: true
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchDepartments();
  }, [currentPage, searchTerm, roleFilter, departmentFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        role: roleFilter,
        department: departmentFilter
      };

      const response = await userAPI.getAllUsers(params);
      if (response.data.success) {
        setUsers(response.data.users);
        setTotalPages(response.data.totalPages);
        setTotalUsers(response.data.total);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await userAPI.getRoles();
      if (response.data.success) {
        setRoles(response.data.roles);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentAPI.getAllDepartments({ limit: 100, isActive: true });
      if (response.data.departments) {
        setDepartments(response.data.departments);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchAvailableTeams = async () => {
    try {
      const response = await teamAPI.getAllTeams({ limit: 1000 });
      if (response.data.success) {
        setAvailableUsers({
          teams: response.data.teams || []
        });
      }
    } catch (err) {
      console.error('Failed to fetch available teams:', err);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleRoleFilter = (e) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleDepartmentFilter = (e) => {
    setDepartmentFilter(e.target.value);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setDepartmentFilter('');
    setCurrentPage(1);
  };

  const handleOpenAddModal = async () => {
    // Reset form data
    setAddFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'Employee',
      department: '',
      employeeId: '',
      phoneNumber: '',
      designation: '',
      joiningDate: '',
      isActive: true
    });
    
    // Reset team form data
    setTeamFormData({
      selectedTeam: ''
    });
    
    // Generate initial employee ID for default role (Employee)
    try {
      const response = await userAPI.getNextEmployeeId('Employee');
      if (response.data.success) {
        setAddFormData(prev => ({
          ...prev,
          employeeId: response.data.employeeId
        }));
      }
    } catch (err) {
      console.error('Failed to generate initial employee ID:', err);
    }
    
    // Fetch available teams for assignment
    await fetchAvailableTeams();
    
    setValidationErrors({});
    setShowAddModal(true);
  };

  const formatDate = (date) => {
    if (!date) return 'Not provided';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'Admin': 'bg-danger',
      'Vice President': 'bg-primary',
      'HR BP': 'bg-info',
      'HR Manager': 'bg-info',
      'HR Executive': 'bg-info',
      'Team Manager': 'bg-warning',
      'Team Leader': 'bg-warning',
      'Employee': 'bg-secondary'
    };
    return colors[role] || 'bg-secondary';
  };

  const handleAddInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    setAddFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Auto-generate employee ID when role changes
    if (name === 'role' && value) {
      try {
        const response = await userAPI.getNextEmployeeId(value);
        if (response.data.success) {
          setAddFormData(prev => ({
            ...prev,
            employeeId: response.data.employeeId
          }));
        }
      } catch (err) {
        console.error('Failed to generate employee ID:', err);
      }
    }
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleEditUser = (userData) => {
    setEditingUser(userData);
    setEditFormData({
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      role: userData.role || 'Employee',
      department: userData.department?._id || '',
      employeeId: userData.employeeId || '',
      phoneNumber: userData.phoneNumber || '',
      designation: userData.designation || '',
      joiningDate: userData.joiningDate ? userData.joiningDate.split('T')[0] : '',
      isActive: userData.isActive !== undefined ? userData.isActive : true
    });
    setValidationErrors({});
    setShowEditModal(true);
  };

  const handleToggleUserStatus = async (userData) => {
    try {
      setError('');
      setSuccess('');

      const newStatus = !userData.isActive;
      const response = await userAPI.updateUser(userData._id, {
        isActive: newStatus
      });
      
      if (response.data.success) {
        setSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully!`);
        fetchUsers();
      }
    } catch (err) {
      console.error('Toggle user status error:', err);
      setError(getErrorMessage(err));
    }
  };

  const validateUserForm = () => {
    const errors = {};
    
    if (!addFormData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (addFormData.firstName.length > 50) {
      errors.firstName = 'First name must be less than 50 characters';
    }
    
    if (!addFormData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (addFormData.lastName.length > 50) {
      errors.lastName = 'Last name must be less than 50 characters';
    }
    
    if (!addFormData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addFormData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!addFormData.password) {
      errors.password = 'Password is required';
    } else if (addFormData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    if (!addFormData.role) {
      errors.role = 'Role is required';
    }
    
    if (addFormData.phoneNumber && !/^\+?[\d\s-()]+$/.test(addFormData.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }
    
    if (addFormData.department && addFormData.department.length > 100) {
      errors.department = 'Department name must be less than 100 characters';
    }
    
    if (addFormData.designation && addFormData.designation.length > 100) {
      errors.designation = 'Designation must be less than 100 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors = {};
    
    if (!editFormData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (editFormData.firstName.length > 50) {
      errors.firstName = 'First name must be less than 50 characters';
    }
    
    if (!editFormData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (editFormData.lastName.length > 50) {
      errors.lastName = 'Last name must be less than 50 characters';
    }
    
    if (!editFormData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!editFormData.role) {
      errors.role = 'Role is required';
    }
    
    if (editFormData.phoneNumber && !/^\+?[\d\s-()]+$/.test(editFormData.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }
    
    if (editFormData.department && editFormData.department.length > 100) {
      errors.department = 'Department name must be less than 100 characters';
    }
    
    if (editFormData.designation && editFormData.designation.length > 100) {
      errors.designation = 'Designation must be less than 100 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getErrorMessage = (error) => {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.response?.data) {
      const data = error.response.data;
      
      if (data.errors && Array.isArray(data.errors)) {
        return data.errors.map(err => err.msg || err.message).join(', ');
      }
      
      if (data.message) {
        const message = data.message.toLowerCase();
        if (message.includes('email already exists')) {
          return 'A user with this email address already exists. Please use a different email.';
        }
        if (message.includes('employee id already exists')) {
          return 'This Employee ID is already in use. Please choose a different one.';
        }
        if (message.includes('validation failed')) {
          return 'Please check your input and try again. All required fields must be filled correctly.';
        }
        return data.message;
      }
    }
    
    if (error?.message) {
      if (error.message.includes('Network Error')) {
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      }
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!validateUserForm()) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');

      const userData = {
        firstName: addFormData.firstName.trim(),
        lastName: addFormData.lastName.trim(),
        email: addFormData.email.trim().toLowerCase(),
        password: addFormData.password,
        role: addFormData.role,
        department: addFormData.department.trim(),
        phoneNumber: addFormData.phoneNumber.trim(),
        designation: addFormData.designation.trim(),
        joiningDate: addFormData.joiningDate || new Date().toISOString().split('T')[0],
        isActive: addFormData.isActive
      };

      // Only include employeeId if user is Admin and has provided one
      if (user?.role === 'Admin' && addFormData.employeeId.trim()) {
        userData.employeeId = addFormData.employeeId.trim();
      }

      // Include team assignment if enabled
      if (showTeamCreation && teamFormData.selectedTeam) {
        userData.teamId = teamFormData.selectedTeam;
      }

      const response = await userAPI.createUser(userData);
      
      if (response.data.success) {
        let successMessage = 'User created successfully!';
        
        // Team assignment is now handled in the backend during user creation
        if (showTeamCreation && teamFormData.selectedTeam) {
          successMessage = 'User created and assigned to team successfully!';
        }

        setShowAddModal(false);
        setShowTeamCreation(false);
        setAddFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          role: 'Employee',
          department: '',
          employeeId: '',
          phoneNumber: '',
          designation: '',
          joiningDate: '',
          isActive: true
        });
        setTeamFormData({
          selectedTeam: ''
        });
        setValidationErrors({});
        setSuccess(successMessage);
        fetchUsers();
      }
    } catch (err) {
      console.error('Create user error:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!validateEditForm()) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');

      const userData = {
        firstName: editFormData.firstName.trim(),
        lastName: editFormData.lastName.trim(),
        email: editFormData.email.trim().toLowerCase(),
        role: editFormData.role,
        department: editFormData.department.trim(),
        phoneNumber: editFormData.phoneNumber.trim(),
        designation: editFormData.designation.trim(),
        joiningDate: editFormData.joiningDate,
        isActive: editFormData.isActive
      };

      // Note: Employee ID is never updated after creation

      const response = await userAPI.updateUser(editingUser._id, userData);
      
      if (response.data.success) {
        setShowEditModal(false);
        setEditingUser(null);
        setEditFormData({
          firstName: '',
          lastName: '',
          email: '',
          role: 'Employee',
          department: '',
          employeeId: '',
          phoneNumber: '',
          designation: '',
          joiningDate: '',
          isActive: true
        });
        setValidationErrors({});
        setSuccess('User updated successfully!');
        fetchUsers();
      }
    } catch (err) {
      console.error('Update user error:', err);
      setError(getErrorMessage(err));
    }
  };

  const theme = useTheme();

  const getRoleChipColor = (role) => {
    const colors = {
      'Admin': 'error',
      'Vice President': 'primary',
      'HR BP': 'info',
      'HR Manager': 'success',
      'HR Executive': 'warning',
      'Team Manager': 'secondary',
      'Team Leader': 'default',
      'Employee': 'default'
    };
    return colors[role] || 'default';
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return 'U';
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
  };

  if (loading && users.length === 0) {
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
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0A192F', mb: 1 }}>
            User Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage all users and their information
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip
            label={`${totalUsers} Total Users`}
            color="primary"
            sx={{ fontWeight: 600 }}
          />
          {(user?.role === 'Admin' || user?.role === 'Vice President' || user?.role === 'HR Manager') && (
            <>
              <Button
                variant="outlined"
                startIcon={<PersonAdd />}
                onClick={() => navigate('/admin/users/add')}
                sx={{
                  borderColor: '#20C997',
                  color: '#20C997',
                  '&:hover': {
                    borderColor: '#17A085',
                    backgroundColor: 'rgba(32, 201, 151, 0.04)',
                  },
                }}
              >
                Add User
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenAddModal}
                sx={{
                  backgroundColor: '#20C997',
                  '&:hover': {
                    backgroundColor: '#17A085',
                  },
                }}
              >
                Quick Add
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Success Alert */}
      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess('')}
          sx={{ mb: 3 }}
        >
          {success}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Filters Card */}
      <Card sx={{ mb: 4, borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search Users"
                placeholder="Search by name, email, or employee ID..."
                value={searchTerm}
                onChange={handleSearch}
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Role</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={handleRoleFilter}
                  label="Filter by Role"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All Roles</MenuItem>
                  {roles.map(role => (
                    <MenuItem key={role} value={role}>{role}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Department</InputLabel>
                <Select
                  value={departmentFilter}
                  onChange={handleDepartmentFilter}
                  label="Filter by Department"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept._id} value={dept._id}>{dept.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={resetFilters}
                sx={{
                  height: '56px',
                  borderRadius: 2,
                  borderColor: 'grey.300',
                  color: 'text.secondary',
                  '&:hover': {
                    borderColor: 'grey.400',
                    backgroundColor: 'grey.50',
                  },
                }}
              >
                Reset
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table Card */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={60} sx={{ color: '#20C997' }} />
            </Box>
          ) : users.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Person sx={{ fontSize: '4rem', color: 'text.disabled', mb: 2 }} />
              <Typography variant="h5" sx={{ color: 'text.secondary', mb: 1 }}>
                No users found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search criteria
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Employee</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Team</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Employee ID</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Contact</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Joining Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((userData) => (
                      <TableRow key={userData._id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar
                              sx={{
                                bgcolor: '#0A192F',
                                color: 'white',
                                width: 40,
                                height: 40,
                                mr: 2,
                                fontWeight: 600,
                              }}
                            >
                              {getInitials(userData.firstName, userData.lastName)}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {userData.firstName} {userData.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {userData.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={userData.role}
                            color={getRoleChipColor(userData.role)}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {userData.department?.name || 'Not assigned'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {userData.team?.name || 'Not assigned'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={userData.employeeId || 'Not assigned'}
                            variant="outlined"
                            size="small"
                            sx={{ fontFamily: 'monospace' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Phone sx={{ fontSize: '0.875rem', mr: 0.5, color: 'text.secondary' }} />
                              {userData.phoneNumber || 'Not provided'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                            <CalendarToday sx={{ fontSize: '0.875rem', mr: 0.5, color: 'text.secondary' }} />
                            {formatDate(userData.joiningDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={userData.isActive ? 'Active' : 'Inactive'}
                            color={userData.isActive ? 'success' : 'error'}
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title={userData.isActive ? "Deactivate User" : "Activate User"}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleUserStatus(userData)}
                                disabled={user?.role === 'Employee'}
                                sx={{
                                  color: userData.isActive ? 'warning.main' : 'success.main',
                                  '&:hover': {
                                    backgroundColor: userData.isActive ? 'warning.light' : 'success.light',
                                  },
                                }}
                              >
                                {userData.isActive ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </Tooltip>
                            {(user?.role === 'Admin' || user?.role === 'Vice President' || user?.role === 'HR BP' || user?.role === 'HR Manager' || user?.role === 'HR Executive') && (
                              <>
                                <Tooltip title="Edit User">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditUser(userData)}
                                    sx={{
                                      color: 'primary.main',
                                      '&:hover': {
                                        backgroundColor: 'primary.light',
                                      },
                                    }}
                                  >
                                    <Edit />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete User">
                                  <IconButton
                                    size="small"
                                    onClick={async () => {
                                      if (window.confirm(`Are you sure you want to delete user ${userData.firstName} ${userData.lastName}?`)) {
                                        try {
                                          const response = await userAPI.deleteUser(userData._id);
                                          if (response.data.success) {
                                            setSuccess('User deleted successfully!');
                                            fetchUsers();
                                          }
                                        } catch (err) {
                                          setError(getErrorMessage(err));
                                        }
                                      }
                                    }}
                                    sx={{
                                      color: 'error.main',
                                      '&:hover': {
                                        backgroundColor: 'error.light',
                                      },
                                    }}
                                  >
                                    <Delete />
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
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setValidationErrors({});
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#0A192F' }}>
            Add New User
          </Typography>
        </DialogTitle>
        <form onSubmit={handleAddUser} noValidate>
          <DialogContent sx={{ pt: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={addFormData.firstName}
                  onChange={handleAddInputChange}
                  error={!!validationErrors.firstName}
                  helperText={validationErrors.firstName}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={addFormData.lastName}
                  onChange={handleAddInputChange}
                  error={!!validationErrors.lastName}
                  helperText={validationErrors.lastName}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={addFormData.email}
                  onChange={handleAddInputChange}
                  error={!!validationErrors.email}
                  helperText={validationErrors.email}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={addFormData.password}
                  onChange={handleAddInputChange}
                  error={!!validationErrors.password}
                  helperText={validationErrors.password}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!validationErrors.role}>
                  <InputLabel>Role *</InputLabel>
                  <Select
                    name="role"
                    value={addFormData.role}
                    onChange={handleAddInputChange}
                    label="Role *"
                    sx={{ borderRadius: 2 }}
                  >
                    {roles.map(role => (
                      <MenuItem key={role} value={role}>{role}</MenuItem>
                    ))}
                  </Select>
                  {validationErrors.role && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {validationErrors.role}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    name="department"
                    value={addFormData.department}
                    onChange={handleAddInputChange}
                    label="Department"
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">Select Department</MenuItem>
                    {departments.map(dept => (
                      <MenuItem key={dept._id} value={dept._id}>{dept.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={`Employee ID ${user?.role !== 'Admin' ? '(Auto-generated)' : ''}`}
                  name="employeeId"
                  value={addFormData.employeeId}
                  onChange={handleAddInputChange}
                  error={!!validationErrors.employeeId}
                  helperText={validationErrors.employeeId || (user?.role !== 'Admin' ? 'Employee ID is automatically generated based on role' : '')}
                  InputProps={{
                    readOnly: user?.role !== 'Admin',
                  }}
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2,
                      backgroundColor: user?.role !== 'Admin' ? 'grey.50' : 'transparent'
                    } 
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phoneNumber"
                  value={addFormData.phoneNumber}
                  onChange={handleAddInputChange}
                  error={!!validationErrors.phoneNumber}
                  helperText={validationErrors.phoneNumber}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Designation"
                  name="designation"
                  value={addFormData.designation}
                  onChange={handleAddInputChange}
                  error={!!validationErrors.designation}
                  helperText={validationErrors.designation}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Joining Date"
                  name="joiningDate"
                  type="date"
                  value={addFormData.joiningDate}
                  onChange={handleAddInputChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isActive"
                      checked={addFormData.isActive}
                      onChange={handleAddInputChange}
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
                  label="Active User (can login to the system)"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={() => {
                setShowAddModal(false);
                setValidationErrors({});
              }}
              sx={{ color: 'text.secondary' }}
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
              }}
            >
              Create User
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
          setValidationErrors({});
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#0A192F' }}>
            Edit User
          </Typography>
        </DialogTitle>
        <form onSubmit={handleUpdateUser} noValidate>
          <DialogContent sx={{ pt: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={editFormData.firstName}
                  onChange={handleEditInputChange}
                  error={!!validationErrors.firstName}
                  helperText={validationErrors.firstName}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={editFormData.lastName}
                  onChange={handleEditInputChange}
                  error={!!validationErrors.lastName}
                  helperText={validationErrors.lastName}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={editFormData.email}
                  onChange={handleEditInputChange}
                  error={!!validationErrors.email}
                  helperText={validationErrors.email}
                  required
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!validationErrors.role}>
                  <InputLabel>Role *</InputLabel>
                  <Select
                    name="role"
                    value={editFormData.role}
                    onChange={handleEditInputChange}
                    label="Role *"
                    sx={{ borderRadius: 2 }}
                  >
                    {roles.map(role => (
                      <MenuItem key={role} value={role}>{role}</MenuItem>
                    ))}
                  </Select>
                  {validationErrors.role && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {validationErrors.role}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    name="department"
                    value={editFormData.department}
                    onChange={handleEditInputChange}
                    label="Department"
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">Select Department</MenuItem>
                    {departments.map(dept => (
                      <MenuItem key={dept._id} value={dept._id}>{dept.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Employee ID (Read-only)"
                  name="employeeId"
                  value={editFormData.employeeId}
                  InputProps={{
                    readOnly: true,
                  }}
                  helperText="Employee ID cannot be changed after creation"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: 2,
                      backgroundColor: 'grey.50'
                    } 
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phoneNumber"
                  value={editFormData.phoneNumber}
                  onChange={handleEditInputChange}
                  error={!!validationErrors.phoneNumber}
                  helperText={validationErrors.phoneNumber}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Designation"
                  name="designation"
                  value={editFormData.designation}
                  onChange={handleEditInputChange}
                  error={!!validationErrors.designation}
                  helperText={validationErrors.designation}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Joining Date"
                  name="joiningDate"
                  type="date"
                  value={editFormData.joiningDate}
                  onChange={handleEditInputChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isActive"
                      checked={editFormData.isActive}
                      onChange={handleEditInputChange}
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
                  label="Active User (can login to the system)"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={() => {
                setShowEditModal(false);
                setEditingUser(null);
                setValidationErrors({});
              }}
              sx={{ color: 'text.secondary' }}
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
              }}
            >
              Update User
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default UserManagement;
