import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow">
              <div className="card-body p-4">
                {/* Header */}
                <div className="text-center mb-4">
                  <i className="bi bi-building text-primary" style={{ fontSize: '3rem' }}></i>
                  <h2 className="card-title mt-2 mb-1">HRM System</h2>
                  <p className="text-muted">Sign in to your account</p>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {getErrorMessage(error)}
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={clearError}
                      aria-label="Close"
                    ></button>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} noValidate>
                  {/* Email Field */}
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      Email Address
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-envelope"></i>
                      </span>
                      <input
                        type="email"
                        className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`}
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email"
                        required
                        autoComplete="email"
                        disabled={isSubmitting}
                      />
                      {validationErrors.email && (
                        <div className="invalid-feedback">
                          {validationErrors.email}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                      Password
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-lock"></i>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={`form-control ${validationErrors.password ? 'is-invalid' : ''}`}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={togglePasswordVisibility}
                        disabled={isSubmitting}
                      >
                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                      {validationErrors.password && (
                        <div className="invalid-feedback">
                          {validationErrors.password}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="d-grid">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting || !formData.email || !formData.password}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </span>
                          Signing in...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-box-arrow-in-right me-2"></i>
                          Sign In
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Demo Credentials */}
                <div className="mt-4 p-3 bg-light rounded">
                  <h6 className="text-muted mb-2">
                    <i className="bi bi-info-circle me-1"></i>
                    Demo Credentials
                  </h6>
                  <small className="text-muted">
                    Contact your administrator for login credentials.
                  </small>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-3">
              <small className="text-muted">
                © 2024 HRM Management System. All rights reserved.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
