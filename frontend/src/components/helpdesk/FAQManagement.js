import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const FAQManagement = () => {
  const { user } = useAuth();
  const [faqs, setFaqs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    status: 'Published',
    search: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    subcategory: '',
    tags: [],
    keywords: [],
    priority: 0,
    status: 'Published',
    isPublic: true,
    visibleToRoles: [
      'Admin', 'Vice President', 'HR BP', 'HR Manager', 
      'HR Executive', 'Team Manager', 'Team Leader', 'Employee'
    ]
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const categories = [
    'Leave & Attendance',
    'Payroll & Salary',
    'HR Policies',
    'Recruitment',
    'Training & Development',
    'Performance Management',
    'IT & System Issues',
    'General HR',
    'Benefits & Compensation',
    'Compliance & Legal'
  ];

  const allRoles = [
    'Admin', 'Vice President', 'HR BP', 'HR Manager', 
    'HR Executive', 'Team Manager', 'Team Leader', 'Employee'
  ];

  useEffect(() => {
    fetchFAQs();
    fetchStats();
  }, [filters]);

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/faq', { 
        params: { 
          ...filters,
          includeUnpublished: true 
        } 
      });
      setFaqs(response.data.faqs);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      setError('Error loading FAQs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/faq/stats');
      setStats(response.data.overview);
    } catch (error) {
      console.error('Error fetching FAQ stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'tags' || name === 'keywords') {
      // Handle comma-separated values
      const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
      setFormData(prev => ({
        ...prev,
        [name]: arrayValue
      }));
    } else if (name === 'visibleToRoles') {
      // Handle checkbox array
      setFormData(prev => ({
        ...prev,
        visibleToRoles: checked 
          ? [...prev.visibleToRoles, value]
          : prev.visibleToRoles.filter(role => role !== value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      category: '',
      subcategory: '',
      tags: [],
      keywords: [],
      priority: 0,
      status: 'Published',
      isPublic: true,
      visibleToRoles: [
        'Admin', 'Vice President', 'HR BP', 'HR Manager', 
        'HR Executive', 'Team Manager', 'Team Leader', 'Employee'
      ]
    });
  };

  const handleCreateFAQ = async (e) => {
    e.preventDefault();
    try {
      await api.post('/faq', formData);
      setSuccess('FAQ created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchFAQs();
      fetchStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error creating FAQ:', error);
      setError(error.response?.data?.message || 'Error creating FAQ');
    }
  };

  const handleEditFAQ = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/faq/${selectedFAQ._id}`, formData);
      setSuccess('FAQ updated successfully');
      setShowEditModal(false);
      setSelectedFAQ(null);
      resetForm();
      fetchFAQs();
      fetchStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating FAQ:', error);
      setError(error.response?.data?.message || 'Error updating FAQ');
    }
  };

  const handleDeleteFAQ = async (faqId) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) return;
    
    try {
      await api.delete(`/faq/${faqId}`);
      setSuccess('FAQ deleted successfully');
      fetchFAQs();
      fetchStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      setError(error.response?.data?.message || 'Error deleting FAQ');
    }
  };

  const openEditModal = (faq) => {
    setSelectedFAQ(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      subcategory: faq.subcategory || '',
      tags: faq.tags || [],
      keywords: faq.keywords || [],
      priority: faq.priority || 0,
      status: faq.status,
      isPublic: faq.isPublic,
      visibleToRoles: faq.visibleToRoles || []
    });
    setShowEditModal(true);
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'Published': 'bg-success',
      'Draft': 'bg-warning',
      'Archived': 'bg-secondary'
    };
    return `badge ${statusClasses[status] || 'bg-secondary'}`;
  };

  const canManageFAQs = () => {
    return ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'].includes(user?.role);
  };

  const canDeleteFAQs = () => {
    return ['HR Manager', 'HR BP', 'Vice President', 'Admin'].includes(user?.role);
  };

  if (!canManageFAQs()) {
    return (
      <div className="container-fluid">
        <div className="text-center p-5">
          <i className="bi bi-shield-exclamation fs-1 text-warning"></i>
          <h3 className="mt-3">Access Denied</h3>
          <p className="text-muted">You don't have permission to manage FAQs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2><i className="bi bi-question-circle me-2"></i>FAQ Management</h2>
          <p className="text-muted mb-0">Manage frequently asked questions and knowledge base</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Create FAQ
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle me-2"></i>
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Total FAQs</h6>
                  <h3 className="mb-0">{stats.total || 0}</h3>
                </div>
                <i className="bi bi-question-circle fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Published</h6>
                  <h3 className="mb-0">{stats.published || 0}</h3>
                </div>
                <i className="bi bi-check-circle fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Draft</h6>
                  <h3 className="mb-0">{stats.draft || 0}</h3>
                </div>
                <i className="bi bi-file-earmark fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Total Views</h6>
                  <h3 className="mb-0">{stats.totalViews || 0}</h3>
                </div>
                <i className="bi bi-eye fs-1 opacity-50"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Category</label>
              <select 
                className="form-select"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select 
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search FAQs..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Items per page</label>
              <select 
                className="form-select"
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* FAQs Table */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-list-ul me-2"></i>
            FAQs ({pagination.total || 0})
          </h5>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : faqs.length === 0 ? (
            <div className="text-center p-4">
              <i className="bi bi-inbox fs-1 text-muted"></i>
              <p className="text-muted mt-2">No FAQs found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Question</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Helpful</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {faqs.map((faq) => (
                    <tr key={faq._id}>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '300px' }}>
                          <strong>{faq.question}</strong>
                          <br />
                          <small className="text-muted">
                            {faq.answer.substring(0, 100)}...
                          </small>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary">{faq.category}</span>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(faq.status)}>
                          {faq.status}
                        </span>
                      </td>
                      <td>
                        <i className="bi bi-eye me-1"></i>
                        {faq.viewCount || 0}
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <i className="bi bi-hand-thumbs-up text-success me-1"></i>
                          <span className="me-2">{faq.helpfulCount || 0}</span>
                          <i className="bi bi-hand-thumbs-down text-danger me-1"></i>
                          <span>{faq.notHelpfulCount || 0}</span>
                        </div>
                      </td>
                      <td>
                        <small className="text-muted">
                          {new Date(faq.createdAt).toLocaleDateString()}
                        </small>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-outline-primary"
                            onClick={() => window.open(`/helpdesk/faq/${faq._id}`, '_blank')}
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          <button 
                            className="btn btn-outline-secondary"
                            onClick={() => openEditModal(faq)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          {canDeleteFAQs() && (
                            <button 
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteFAQ(faq._id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="card-footer">
            <nav>
              <ul className="pagination justify-content-center mb-0">
                <li className={`page-item ${pagination.current === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => handleFilterChange('page', pagination.current - 1)}
                    disabled={pagination.current === 1}
                  >
                    Previous
                  </button>
                </li>
                {[...Array(pagination.pages)].map((_, index) => (
                  <li key={index + 1} className={`page-item ${pagination.current === index + 1 ? 'active' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => handleFilterChange('page', index + 1)}
                    >
                      {index + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${pagination.current === pagination.pages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => handleFilterChange('page', pagination.current + 1)}
                    disabled={pagination.current === pagination.pages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Create FAQ Modal */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New FAQ</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={handleCreateFAQ}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-8">
                      <div className="mb-3">
                        <label className="form-label">Question *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="question"
                          value={formData.question}
                          onChange={handleInputChange}
                          required
                          maxLength={500}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Answer *</label>
                        <textarea
                          className="form-control"
                          name="answer"
                          rows={6}
                          value={formData.answer}
                          onChange={handleInputChange}
                          required
                          maxLength={2000}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Tags (comma-separated)</label>
                        <input
                          type="text"
                          className="form-control"
                          name="tags"
                          value={formData.tags.join(', ')}
                          onChange={handleInputChange}
                          placeholder="leave, attendance, policy"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Keywords (comma-separated)</label>
                        <input
                          type="text"
                          className="form-control"
                          name="keywords"
                          value={formData.keywords.join(', ')}
                          onChange={handleInputChange}
                          placeholder="sick leave, medical certificate"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Category *</label>
                        <select
                          className="form-select"
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select Category</option>
                          {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Subcategory</label>
                        <input
                          type="text"
                          className="form-control"
                          name="subcategory"
                          value={formData.subcategory}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Priority</label>
                        <input
                          type="number"
                          className="form-control"
                          name="priority"
                          value={formData.priority}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                        />
                        <small className="form-text text-muted">Higher numbers appear first</small>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <select
                          className="form-select"
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Published">Published</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            name="isPublic"
                            checked={formData.isPublic}
                            onChange={handleInputChange}
                          />
                          <label className="form-check-label">
                            Public FAQ
                          </label>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Visible to Roles</label>
                        {allRoles.map(role => (
                          <div key={role} className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              name="visibleToRoles"
                              value={role}
                              checked={formData.visibleToRoles.includes(role)}
                              onChange={handleInputChange}
                            />
                            <label className="form-check-label">
                              {role}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create FAQ
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit FAQ Modal */}
      {showEditModal && selectedFAQ && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit FAQ</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <form onSubmit={handleEditFAQ}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-8">
                      <div className="mb-3">
                        <label className="form-label">Question *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="question"
                          value={formData.question}
                          onChange={handleInputChange}
                          required
                          maxLength={500}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Answer *</label>
                        <textarea
                          className="form-control"
                          name="answer"
                          rows={6}
                          value={formData.answer}
                          onChange={handleInputChange}
                          required
                          maxLength={2000}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Tags (comma-separated)</label>
                        <input
                          type="text"
                          className="form-control"
                          name="tags"
                          value={formData.tags.join(', ')}
                          onChange={handleInputChange}
                          placeholder="leave, attendance, policy"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Keywords (comma-separated)</label>
                        <input
                          type="text"
                          className="form-control"
                          name="keywords"
                          value={formData.keywords.join(', ')}
                          onChange={handleInputChange}
                          placeholder="sick leave, medical certificate"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Category *</label>
                        <select
                          className="form-select"
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select Category</option>
                          {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Subcategory</label>
                        <input
                          type="text"
                          className="form-control"
                          name="subcategory"
                          value={formData.subcategory}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Priority</label>
                        <input
                          type="number"
                          className="form-control"
                          name="priority"
                          value={formData.priority}
                          onChange={handleInputChange}
                          min="0"
                          max="100"
                        />
                        <small className="form-text text-muted">Higher numbers appear first</small>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <select
                          className="form-select"
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                        >
                          <option value="Draft">Draft</option>
                          <option value="Published">Published</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            name="isPublic"
                            checked={formData.isPublic}
                            onChange={handleInputChange}
                          />
                          <label className="form-check-label">
                            Public FAQ
                          </label>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Visible to Roles</label>
                        {allRoles.map(role => (
                          <div key={role} className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              name="visibleToRoles"
                              value={role}
                              checked={formData.visibleToRoles.includes(role)}
                              onChange={handleInputChange}
                            />
                            <label className="form-check-label">
                              {role}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update FAQ
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

export default FAQManagement;
