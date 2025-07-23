import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Container,
  Paper,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Business,
  Login as LoginIcon,
  Info,
} from '@mui/icons-material';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const location = useLocation();
  const theme = useTheme();

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      if (error) {
        clearError();
      }
    };
  }, [error, clearError]);

  const validateForm = () => {
    const errors = {};
    
    // Email validation
    if (!formData.email) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Redirect if already authenticated
  const from = location.state?.from?.pathname || '/dashboard';
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }
    
    // Clear any existing errors only after validation passes
    if (error) {
      clearError();
    }
    
    setIsSubmitting(true);

    try {
      const result = await login(formData);
      if (result.success) {
        // Redirect will happen automatically due to isAuthenticated change
        console.log('Login successful');
        // Only clear form on successful login
        setFormData({
          email: '',
          password: '',
        });
      } else {
        // Error will be displayed via the error state from AuthContext
        console.log('Login failed:', result.error);
        // Form data remains intact - no clearing on failure
      }
    } catch (error) {
      console.error('Login error:', error);
      // Form data remains intact - no clearing on failure
      // The error will be handled by AuthContext and displayed to user
    } finally {
      setIsSubmitting(false);
    }
  };

  const getErrorMessage = (error) => {
    if (typeof error === 'string') {
      return error;
    }
    
    // Handle different types of errors
    if (error?.message) {
      const message = error.message.toLowerCase();
      if (message.includes('invalid credentials') || message.includes('unauthorized')) {
        return 'Invalid email address or password. Please check your credentials and try again.';
      }
      if (message.includes('account is deactivated')) {
        return 'Your account has been deactivated. Please contact your administrator.';
      }
      if (message.includes('network') || message.includes('fetch')) {
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      }
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #F1F3F4 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            border: `1px solid ${theme.palette.grey[200]}`,
            boxShadow: '0 4px 20px rgba(10, 25, 47, 0.1)',
          }}
        >
          <CardContent sx={{ p: 5 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: '#0A192F',
                  mb: 2,
                  boxShadow: '0 4px 12px rgba(10, 25, 47, 0.3)',
                }}
              >
                <Business sx={{ fontSize: 40, color: '#FFFFFF' }} />
              </Box>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontWeight: 700,
                  color: '#0A192F',
                  mb: 1,
                  fontSize: '2rem',
                }}
              >
                Beeja HRM
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#4A5568',
                  fontSize: '1.1rem',
                }}
              >
                Sign in to your account
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert
                severity="error"
                onClose={clearError}
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  '& .MuiAlert-message': {
                    fontSize: '0.95rem',
                  },
                }}
              >
                {getErrorMessage(error)}
              </Alert>
            )}

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {/* Email Field */}
              <TextField
                fullWidth
                type="email"
                name="email"
                label="Email Address"
                value={formData.email}
                onChange={handleChange}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
                disabled={isSubmitting}
                autoComplete="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              {/* Password Field */}
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                name="password"
                label="Password"
                value={formData.password}
                onChange={handleChange}
                error={!!validationErrors.password}
                helperText={validationErrors.password}
                disabled={isSubmitting}
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={togglePasswordVisibility}
                        disabled={isSubmitting}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 4,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isSubmitting || !formData.email || !formData.password}
                startIcon={
                  isSubmitting ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <LoginIcon />
                  )
                }
                sx={{
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  backgroundColor: '#20C997',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(32, 201, 151, 0.3)',
                  '&:hover': {
                    backgroundColor: '#17A085',
                    boxShadow: '0 4px 12px rgba(32, 201, 151, 0.4)',
                  },
                  '&:disabled': {
                    backgroundColor: '#A0AEC0',
                    color: '#FFFFFF',
                  },
                }}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </Box>

            {/* Divider */}
            <Divider sx={{ my: 4 }} />

            {/* Demo Credentials */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                backgroundColor: theme.palette.background.secondary,
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[200]}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Info
                  sx={{
                    color: theme.palette.info.main,
                    mr: 1,
                    fontSize: 20,
                  }}
                />
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                  }}
                >
                  Demo Credentials
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  lineHeight: 1.5,
                }}
              >
                Contact your administrator for login credentials.
              </Typography>
            </Paper>
          </CardContent>
        </Card>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: '0.875rem',
            }}
          >
            © 2024 HRM Management System. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;
