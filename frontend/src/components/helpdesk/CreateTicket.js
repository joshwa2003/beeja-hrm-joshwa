import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { getRoutingInfo } from '../../utils/hrRouting';

const CreateTicket = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    subcategory: '',
    priority: 'Medium',
    assignedTo: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [suggestedFAQs, setSuggestedFAQs] = useState([]);
  const [hrPersonnel, setHrPersonnel] = useState([]);
  const [loadingHR, setLoadingHR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const categories = [
    'Leave Issue',
    'Attendance Issue',
    'Regularization Problem',
    'Holiday Calendar Query',
    'WFH / Remote Work Requests',
    'Payroll / Salary Issue',
    'Payslip Not Available',
    'Reimbursement Issue',
    'Tax / TDS / Form-16',
    'Leave Policy Clarification',
    'Performance Review Concern',
    'KPI / Goals Setup Issue',
    'Probation / Confirmation',
    'Training / LMS Access Issue',
    'Certification Issue',
    'Offer Letter / Joining Issue',
    'Referral / Interview Feedback',
    'Resignation Process Query',
    'Final Settlement Delay',
    'Experience Letter Request',
    'HRMS Login Issue',
    'System Bug / App Crash',
    'Document Upload Failed',
    'Office Access / ID Card Lost',
    'General HR Query',
    'Harassment / Grievance',
    'Asset Request / Laptop',
    'Feedback / Suggestion to HR',
    'Others'
  ];

  const subcategories = {
    'Leave Issue': ['Leave balance mismatch', 'Cannot apply leave', 'Leave approval delay'],
    'Attendance Issue': ['Biometric failure', 'Absent marking error', 'Check-in/out issues'],
    'Payroll / Salary Issue': ['Wrong amount', 'Missing pay', 'Salary delay'],
    'Training / LMS Access Issue': ['Cannot access LMS', 'Training module not working', 'Certificate not generated'],
    'HRMS Login Issue': ['Cannot log in', '2FA problems', 'Password reset'],
    'System Bug / App Crash': ['App slow', 'Buttons not working', 'Data not saving']
  };

  useEffect(() => {
    // Search for FAQs when subject or description changes
    const searchTimeout = setTimeout(() => {
      if (formData.subject.length > 3 || formData.description.length > 10) {
        searchFAQs();
      }
    }, 1000);

    return () => clearTimeout(searchTimeout);
  }, [formData.subject, formData.description, formData.category]);

  useEffect(() => {
    // Fetch HR personnel when component mounts
    fetchHRPersonnel();
  }, []);

  useEffect(() => {
    // Reset assignedTo when category changes
    if (formData.category) {
      setFormData(prev => ({ ...prev, assignedTo: '' }));
    }
  }, [formData.category]);

  const searchFAQs = async () => {
    try {
      const searchQuery = `${formData.subject} ${formData.description}`.trim();
      if (searchQuery.length < 3) return;

      const response = await api.get('/faq/search', {
        params: {
          q: searchQuery,
          category: formData.category || undefined,
          limit: 3
        }
      });
      setSuggestedFAQs(response.data.results || []);
    } catch (error) {
      console.error('Error searching FAQs:', error);
    }
  };

  const fetchHRPersonnel = async (category = null) => {
    try {
      setLoadingHR(true);
      // Fetch HR personnel based on category if provided, otherwise fetch all
      const endpoint = category ? `/tickets/hr-personnel/${encodeURIComponent(category)}` : '/tickets/hr-personnel';
      const response = await api.get(endpoint);
      
      // The response already includes workload information
      const hrPersonnel = response.data.hrPersonnel || [];
      
      setHrPersonnel(hrPersonnel);
      
      // If a specific HR is selected but not eligible for the new category, reset selection
      if (category && formData.assignedTo) {
        const selectedHR = hrPersonnel.find(hr => hr._id === formData.assignedTo);
        if (!selectedHR) {
          setFormData(prev => ({
            ...prev,
            assignedTo: ''
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching HR personnel:', error);
      setHrPersonnel([]);
    } finally {
      setLoadingHR(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Reset subcategory and assignedTo when category changes
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        subcategory: '',
        assignedTo: ''
      }));
      
      // Always fetch all HR personnel to allow employee override of assignment
      fetchHRPersonnel(); // Fetch all HR personnel regardless of category
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file size (5MB max per file)
    const maxSize = 5 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      return true;
    });

    // Limit to 5 files total
    if (attachments.length + validFiles.length > 5) {
      setError('Maximum 5 files allowed.');
      return;
    }

    setAttachments(prev => [...prev, ...validFiles]);
    setError('');
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!formData.subject.trim() || !formData.description.trim() || !formData.category) {
        setError('Please fill in all required fields.');
        return;
      }

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('subject', formData.subject.trim());
      submitData.append('description', formData.description.trim());
      submitData.append('category', formData.category);
      submitData.append('priority', formData.priority);
      
      if (formData.subcategory) {
        submitData.append('subcategory', formData.subcategory);
      }

      if (formData.assignedTo) {
        submitData.append('assignedTo', formData.assignedTo);
      }

      // Add attachments
      attachments.forEach((file, index) => {
        submitData.append('attachments', file);
      });

      const response = await api.post('/tickets', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Ticket created successfully! You will be notified when it is assigned to an HR representative.');
      
      // Reset form
      setFormData({
        subject: '',
        description: '',
        category: '',
        subcategory: '',
        priority: 'Medium',
        assignedTo: ''
      });
      setAttachments([]);
      setSuggestedFAQs([]);
      setHrPersonnel([]);

      // Redirect to ticket details after 2 seconds
      setTimeout(() => {
        window.location.href = `/helpdesk/tickets/${response.data.ticket._id}`;
      }, 2000);

    } catch (error) {
      console.error('Error creating ticket:', error);
      setError(error.response?.data?.message || 'Error creating ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          {/* Header */}
          <div className="d-flex align-items-center mb-4">
            <button 
              className="btn btn-outline-secondary me-3"
              onClick={() => window.history.back()}
            >
              <i className="bi bi-arrow-left"></i>
            </button>
            <div>
              <h2><i className="bi bi-plus-circle me-2"></i>Create Support Ticket</h2>
              <p className="text-muted mb-0">Describe your issue and we'll help you resolve it</p>
            </div>
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

          <div className="row">
            {/* Main Form */}
            <div className="col-lg-8">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-form me-2"></i>
                    Ticket Details
                  </h5>
                </div>
                <div className="card-body">
                  <form onSubmit={handleSubmit}>
                    {/* Subject */}
                    <div className="mb-3">
                      <label htmlFor="subject" className="form-label">
                        Subject <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="Brief description of your issue"
                        maxLength={200}
                        required
                      />
                      <div className="form-text">
                        {formData.subject.length}/200 characters
                      </div>
                    </div>

                    {/* Category */}
                    <div className="mb-3">
                      <label htmlFor="category" className="form-label">
                        Category <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select a category</option>
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      
                      {/* HR Routing Information */}
                      {formData.category && (
                        <div className="mt-2 p-3 bg-light rounded border">
                          <div className="d-flex align-items-center">
                            <i className="bi bi-person-badge me-2 text-primary"></i>
                            <div>
                              <strong className="text-primary">
                                {formData.assignedTo ? 'Assigned to:' : 'Default Assignment:'}
                              </strong>
                              <span className="ms-2">
                                {formData.assignedTo 
                                  ? (() => {
                                      const selectedHR = hrPersonnel.find(hr => hr._id === formData.assignedTo);
                                      return selectedHR 
                                        ? `${selectedHR.firstName} ${selectedHR.lastName} (${selectedHR.role})`
                                        : 'Selected HR Personnel';
                                    })()
                                  : getRoutingInfo(formData.category).assignedRole
                                }
                              </span>
                            </div>
                          </div>
                          {getRoutingInfo(formData.category).isConfidential && (
                            <div className="d-flex align-items-center mt-1">
                              <i className="bi bi-shield-lock me-2 text-warning"></i>
                              <small className="text-warning">
                                <strong>Confidential:</strong> This ticket will be handled with strict confidentiality
                              </small>
                            </div>
                          )}
                          <small className="text-muted d-block mt-1">
                            {formData.assignedTo 
                              ? 'This ticket will be assigned to the selected HR personnel'
                              : getRoutingInfo(formData.category).description
                            }
                          </small>
                        </div>
                      )}
                    </div>

                    {/* HR Personnel Assignment */}
                    <div className="mb-3">
                      <label htmlFor="assignedTo" className="form-label">
                        Assign to HR Personnel
                      </label>
                      {loadingHR ? (
                        <div className="d-flex align-items-center p-3 bg-light rounded border">
                          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                          <span>Loading HR personnel...</span>
                        </div>
                      ) : hrPersonnel.length > 0 ? (
                        <select
                          className="form-select"
                          id="assignedTo"
                          name="assignedTo"
                          value={formData.assignedTo}
                          onChange={handleInputChange}
                        >
                          <option value="">Auto-assign based on category</option>
                          {hrPersonnel.map(hr => (
                            <option key={hr._id} value={hr._id}>
                              {hr.firstName} {hr.lastName} ({hr.role}) - {hr.workload} open tickets
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          className="form-select"
                          id="assignedTo"
                          name="assignedTo"
                          value={formData.assignedTo}
                          onChange={handleInputChange}
                          onClick={() => hrPersonnel.length === 0 && fetchHRPersonnel()}
                        >
                          <option value="">Auto-assign based on category</option>
                        </select>
                      )}
                      <div className="form-text">
                        Select a specific HR person to handle your ticket, or leave blank for automatic assignment based on category.
                      </div>
                    </div>

                    {/* Subcategory */}
                    {formData.category && subcategories[formData.category] && (
                      <div className="mb-3">
                        <label htmlFor="subcategory" className="form-label">
                          Subcategory
                        </label>
                        <select
                          className="form-select"
                          id="subcategory"
                          name="subcategory"
                          value={formData.subcategory}
                          onChange={handleInputChange}
                        >
                          <option value="">Select a subcategory (optional)</option>
                          {subcategories[formData.category].map(subcategory => (
                            <option key={subcategory} value={subcategory}>
                              {subcategory}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Priority */}
                    <div className="mb-3">
                      <label htmlFor="priority" className="form-label">
                        Priority
                      </label>
                      <select
                        className="form-select"
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                      <div className="form-text">
                        Select "Critical" only for urgent issues that block your work
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-3">
                      <label htmlFor="description" className="form-label">
                        Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        id="description"
                        name="description"
                        rows={6}
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable"
                        maxLength={2000}
                        required
                      />
                      <div className="form-text">
                        {formData.description.length}/2000 characters
                      </div>
                    </div>

                    {/* File Attachments */}
                    <div className="mb-4">
                      <label htmlFor="attachments" className="form-label">
                        Attachments
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        id="attachments"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileChange}
                      />
                      <div className="form-text">
                        Upload screenshots, documents, or other files that help explain your issue. 
                        Max 5 files, 5MB each. Supported: PDF, JPG, PNG, DOC, DOCX
                      </div>

                      {/* Attachment List */}
                      {attachments.length > 0 && (
                        <div className="mt-3">
                          <h6>Selected Files:</h6>
                          {attachments.map((file, index) => (
                            <div key={index} className="d-flex align-items-center justify-content-between bg-light p-2 rounded mb-2">
                              <div className="d-flex align-items-center">
                                <i className="bi bi-file-earmark me-2"></i>
                                <div>
                                  <div className="fw-semibold">{file.name}</div>
                                  <small className="text-muted">{formatFileSize(file.size)}</small>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeAttachment(index)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="d-flex justify-content-between">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => window.history.back()}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Creating Ticket...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-send me-2"></i>
                            Create Ticket
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Suggested FAQs Sidebar */}
            <div className="col-lg-4">
              {suggestedFAQs.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <i className="bi bi-lightbulb me-2"></i>
                      Suggested Solutions
                    </h6>
                  </div>
                  <div className="card-body">
                    <p className="text-muted small mb-3">
                      Before creating a ticket, check if these FAQs answer your question:
                    </p>
                    {suggestedFAQs.map((faq) => (
                      <div key={faq._id} className="border rounded p-3 mb-3">
                        <h6 className="fw-semibold mb-2">{faq.question}</h6>
                        <p className="text-muted small mb-2">
                          {faq.answer.substring(0, 100)}...
                        </p>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => window.open(`/helpdesk/faq/${faq._id}`, '_blank')}
                        >
                          Read More
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Help Tips */}
              <div className="card mt-3">
                <div className="card-header">
                  <h6 className="mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Tips for Better Support
                  </h6>
                </div>
                <div className="card-body">
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      <small>Be specific about the issue</small>
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      <small>Include error messages if any</small>
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      <small>Attach screenshots when helpful</small>
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      <small>Mention steps you've already tried</small>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTicket;
