import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentAPI } from '../../utils/api';

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
          <h2 className="mb-1">Department Management</h2>
          <p className="text-muted">Manage company departments and organizational structure</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Add Department
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h5 className="card-title">Total Departments</h5>
                  <h3 className="mb-0">{stats.totalDepartments || 0}</h3>
                </div>
                <i className="bi bi-building" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h5 className="card-title">Active Departments</h5>
                  <h3 className="mb-0">{stats.activeDepartments || 0}</h3>
                </div>
                <i className="bi bi-check-circle" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h5 className="card-title">Inactive Departments</h5>
                  <h3 className="mb-0">{stats.inactiveDepartments || 0}</h3>
                </div>
                <i className="bi bi-x-circle" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <h5 className="card-title">Avg Employees</h5>
                  <h3 className="mb-0">
                    {stats.departmentStats ? 
                      Math.round(stats.departmentStats.reduce((sum, dept) => sum + dept.activeEmployeeCount, 0) / stats.departmentStats.length) || 0
                      : 0
                    }
                  </h3>
                </div>
                <i className="bi bi-people" style={{ fontSize: '2rem', opacity: 0.7 }}></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6 text-end">
              <button 
                className="btn btn-outline-secondary me-2"
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
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
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError('')}
          ></button>
        </div>
      )}

      {/* Departments Table */}
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
                <tr>
                  <th>Department</th>
                  <th>Code</th>
                  <th>Head of Department</th>
                  <th>Employees</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((department) => (
                  <tr key={department._id}>
                    <td>
                      <div>
                        <div className="fw-semibold">{department.name}</div>
                        {department.description && (
                          <small className="text-muted">{department.description}</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-secondary">{department.code}</span>
                    </td>
                    <td>
                      {department.headOfDepartment ? (
                        <div>
                          <div>{department.headOfDepartment.firstName} {department.headOfDepartment.lastName}</div>
                          <small className="text-muted">{department.headOfDepartment.email}</small>
                        </div>
                      ) : (
                        <span className="text-muted">Not assigned</span>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-info">{department.employeeCount || 0}</span>
                    </td>
                    <td>
                      {department.budget ? (
                        <span>₹{department.budget.toLocaleString()}</span>
                      ) : (
                        <span className="text-muted">Not set</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${department.isActive ? 'bg-success' : 'bg-danger'}`}>
                        {department.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group" role="group">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEdit(department)}
                          title="Edit Department"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        {['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'].includes(user?.role) && (
                          <>
                            <button
                              className={`btn btn-sm ${department.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
                              onClick={() => handleStatusToggle(department._id, department.isActive)}
                              title={department.isActive ? 'Deactivate Department' : 'Activate Department'}
                            >
                              <i className={`bi ${department.isActive ? 'bi-pause-circle' : 'bi-play-circle'}`}></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDelete(department._id)}
                              title="Delete Department"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-4">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                </li>
                {[...Array(totalPages)].map((_, index) => (
                  <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => setCurrentPage(index + 1)}
                    >
                      {index + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* Add/Edit Department Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingDepartment ? 'Edit Department' : 'Add New Department'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={handleCloseModal}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Department Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Department Code *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="code"
                          value={formData.code}
                          onChange={handleInputChange}
                          style={{ textTransform: 'uppercase' }}
                          placeholder="e.g., IT, HR, FIN"
                          pattern="[A-Z0-9]+"
                          title="Department code must contain only uppercase letters and numbers"
                          maxLength="10"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="3"
                    ></textarea>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Budget</label>
                        <input
                          type="number"
                          className="form-control"
                          name="budget"
                          value={formData.budget}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Location</label>
                        <input
                          type="text"
                          className="form-control"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                      />
                      <label className="form-check-label">
                        Active Department
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingDepartment ? 'Update Department' : 'Create Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
