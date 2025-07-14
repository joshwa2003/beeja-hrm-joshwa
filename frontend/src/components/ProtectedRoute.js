import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRoles = [], requiredLevel = null }) => {
  const { isAuthenticated, isLoading, user, hasAnyRole, canAccess } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card border-danger">
              <div className="card-body text-center">
                <i className="bi bi-shield-exclamation text-danger" style={{ fontSize: '3rem' }}></i>
                <h4 className="card-title text-danger mt-3">Access Denied</h4>
                <p className="card-text">
                  You don't have the required permissions to access this page.
                </p>
                <p className="text-muted">
                  Required roles: {requiredRoles.join(', ')}
                </p>
                <p className="text-muted">
                  Your role: {user?.role}
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check level-based access
  if (requiredLevel && !canAccess(requiredLevel)) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card border-warning">
              <div className="card-body text-center">
                <i className="bi bi-shield-exclamation text-warning" style={{ fontSize: '3rem' }}></i>
                <h4 className="card-title text-warning mt-3">Insufficient Privileges</h4>
                <p className="card-text">
                  You don't have sufficient privileges to access this page.
                </p>
                <p className="text-muted">
                  Your role: {user?.role}
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render the protected component
  return children;
};

export default ProtectedRoute;
