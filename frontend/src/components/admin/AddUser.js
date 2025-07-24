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
  Grid,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Paper,
  useTheme,
  Container,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  PersonAdd,
  Save,
  Groups,
  Info,
} from '@mui/icons-material';

const AddUser = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    fetchRoles();
    fetchDepartments();
    generateInitialEmployeeId();
  }, []);

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

  const generateInitialEmployeeId = async () => {
    try {
      const response = await userAPI.getNextEmployeeId('Employee');
      if (response.data.success) {
        setFormData(prev => ({
          ...prev,
          employeeId: response.data.employeeId
        }));
      }
    } catch (err) {
      console.error('Failed to generate initial employee ID:', err);
    }
  };

  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Auto-generate employee ID when role changes
    if (name === 'role' && value) {
      try {
        const response = await userAPI.getNextEmployeeId(value);
        if (response.data.success) {
          setFormData(prev => ({
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

  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.length > 50) {
      errors.firstName = 'First name must be less than 50 characters';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.length > 50) {
      errors.lastName = 'Last name must be less than 50 characters';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    
    if (formData.phoneNumber && !/^\+?[\d\s-()]+$/.test(formData.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }
    
    if (formData.department && formData.department.length > 100) {
      errors.department = 'Department name must be less than 100 characters';
    }
    
    if (formData.designation && formData.designation.length > 100) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
        isActive: formData.isActive
      };

      // Only include department if it's selected (not empty)
      if (formData.department && formData.department.trim()) {
        userData.department = formData.department.trim();
      }

      // Only include phoneNumber if it's provided (not empty)
      if (formData.phoneNumber && formData.phoneNumber.trim()) {
        userData.phoneNumber = formData.phoneNumber.trim();
      }

      // Only include designation if it's provided (not empty)
      if (formData.designation && formData.designation.trim()) {
        userData.designation = formData.designation.trim();
      }

      // Only include employeeId if user is Admin and has provided one
      if (user?.role === 'Admin' && formData.employeeId && formData.employeeId.trim()) {
        userData.employeeId = formData.employeeId.trim();
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

        setSuccess(successMessage);
        
        // Show success message briefly, then redirect to User Management
        setTimeout(() => {
          navigate('/admin/users');
        }, 2000); // Redirect after 2 seconds to allow user to see the success message
      }
    } catch (err) {
      console.error('Create user error:', err);
      setError(getErrorMessage(err));
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamAssignmentToggle = async (checked) => {
    setShowTeamCreation(checked);
    if (checked) {
      await fetchAvailableTeams();
    }
  };

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0A192F', mb: 1 }}>
            Add New User
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create a new user account in the system
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/users')}
          sx={{
            borderColor: 'grey.300',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'grey.400',
              backgroundColor: 'grey.50',
            },
          }}
        >
          Back to User Management
        </Button>
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

      {/* Form Card */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit} noValidate>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
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
                  value={formData.lastName}
                  onChange={handleInputChange}
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
                  value={formData.email}
                  onChange={handleInputChange}
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
                  value={formData.password}
                  onChange={handleInputChange}
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
                    value={formData.role}
                    onChange={handleInputChange}
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
                    value={formData.department}
                    onChange={handleInputChange}
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
                  value={formData.employeeId}
                  onChange={handleInputChange}
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
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  error={!!validationErrors.phoneNumber}
                  helperText={validationErrors.phoneNumber}
                  placeholder="e.g., +1234567890"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  error={!!validationErrors.designation}
                  helperText={validationErrors.designation}
                  placeholder="e.g., Software Engineer"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Joining Date"
                  name="joiningDate"
                  type="date"
                  value={formData.joiningDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
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

              {/* Team Assignment Section - Only for Employee role */}
              {(user?.role === 'Admin' || user?.role === 'HR Manager') && formData.role === 'Employee' && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                      <Groups sx={{ mr: 1 }} />
                      Team Assignment
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showTeamCreation}
                          onChange={(e) => handleTeamAssignmentToggle(e.target.checked)}
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
                      label="Assign to Team"
                    />
                  </Box>
                  
                  {showTeamCreation && (
                    <Paper sx={{ p: 3, backgroundColor: 'grey.50', borderRadius: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Select Team *</InputLabel>
                        <Select
                          value={teamFormData.selectedTeam || ''}
                          onChange={(e) => setTeamFormData(prev => ({...prev, selectedTeam: e.target.value}))}
                          label="Select Team *"
                          sx={{ borderRadius: 2 }}
                        >
                          <MenuItem value="">Choose a team...</MenuItem>
                          {availableUsers.teams && availableUsers.teams.map(team => (
                            <MenuItem key={team._id} value={team._id}>
                              {team.name} ({team.code}) - {team.department?.name || 'No Department'}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Select an existing team to assign this user to. Teams are created in Team Management.
                        <br />
                        <strong>Note:</strong> Team assignment is only available for Employee role. Team Managers and Team Leaders are assigned through Team Management.
                      </Typography>
                    </Paper>
                  )}
                </Grid>
              )}
              
              {/* Info message for non-Employee roles */}
              {(user?.role === 'Admin' || user?.role === 'HR Manager') && formData.role !== 'Employee' && ['Team Manager', 'Team Leader'].includes(formData.role) && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Info sx={{ mr: 1 }} />
                      <Typography variant="body2">
                        <strong>Team Assignment:</strong> {formData.role} roles are assigned to teams through the Team Management interface, not during user creation.
                      </Typography>
                    </Box>
                  </Alert>
                </Grid>
              )}
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/admin/users')}
                sx={{
                  borderColor: 'grey.300',
                  color: 'text.secondary',
                  '&:hover': {
                    borderColor: 'grey.400',
                    backgroundColor: 'grey.50',
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                sx={{
                  backgroundColor: '#20C997',
                  '&:hover': {
                    backgroundColor: '#17A085',
                  },
                }}
              >
                {loading ? 'Creating User...' : 'Create User'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default AddUser;
