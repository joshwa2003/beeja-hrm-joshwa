import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveAPI } from '../../utils/api';

const LeaveRequest = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({});

  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
    halfDayPeriod: 'Morning',
    handoverNotes: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });

  useEffect(() => {
    fetchLeaveTypes();
    fetchLeaveBalance();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const response = await leaveAPI.getLeaveTypes();
      setLeaveTypes(response.data.leaveTypes);
    } catch (err) {
      console.error('Failed to fetch leave types:', err);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const response = await leaveAPI.getMyLeaveBalance();
      setLeaveBalance(response.data.leaveBalance);
    } catch (err) {
      console.error('Failed to fetch leave balance:', err);
    }
  };

  const calculateLeaveDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    if (formData.isHalfDay && daysDiff === 1) {
      return 0.5;
    }
    
    return daysDiff;
  };

  const getAvailableBalance = () => {
    const leaveTypeMap = {
      'Casual': 'casual',
      'Sick': 'sick',
      'Earned': 'earned',
      'Maternity': 'maternity',
      'Paternity': 'paternity'
    };
    
    const balanceField = leaveTypeMap[formData.leaveType];
    if (balanceField && leaveBalance[balanceField]) {
      return leaveBalance[balanceField].available;
    }
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason) {
        throw new Error('Please fill in all required fields');
      }

      const totalDays = calculateLeaveDays();
      const availableBalance = getAvailableBalance();
      
      if (availableBalance !== null && totalDays > availableBalance) {
        throw new Error(`Insufficient leave balance. Available: ${availableBalance} days, Requested: ${totalDays} days`);
      }

      const submitData = {
        ...formData,
        emergencyContact: formData.emergencyContact.name ? formData.emergencyContact : undefined
      };

      await leaveAPI.submitLeaveRequest(submitData);
      
      setSuccess('Leave request submitted successfully! You will be notified once it is reviewed.');
      
      // Reset form
      setFormData({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
        isHalfDay: false,
        halfDayPeriod: 'Morning',
        handoverNotes: '',
        emergencyContact: {
          name: '',
          phone: '',
          relationship: ''
        }
      });

      // Refresh leave balance
      fetchLeaveBalance();

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const totalDays = calculateLeaveDays();
  const availableBalance = getAvailableBalance();

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Apply for Leave</h2>
          <p className="text-muted">Submit a new leave request</p>
        </div>
      </div>

      <div className="row">
        {/* Leave Request Form */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-calendar-plus me-2"></i>
                Leave Request Form
              </h5>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}

              {success && (
                <div className="alert alert-success alert-dismissible fade show" role="alert">
                  {success}
                  <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Employee Details (Auto-filled) */}
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="text-primary mb-3">
                      <i className="bi bi-person me-2"></i>
                      Employee Details
                    </h6>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Employee ID</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.employeeId || 'N/A'}
                      disabled
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Employee Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={`${user?.firstName} ${user?.lastName}`}
                      disabled
                    />
                  </div>
                  <div className="col-md-6 mt-3">
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.department || 'N/A'}
                      disabled
                    />
                  </div>
                  <div className="col-md-6 mt-3">
                    <label className="form-label">Designation</label>
                    <input
                      type="text"
                      className="form-control"
                      value={user?.designation || 'N/A'}
                      disabled
                    />
                  </div>
                </div>

                {/* Leave Details */}
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="text-primary mb-3">
                      <i className="bi bi-calendar3 me-2"></i>
                      Leave Details
                    </h6>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Leave Type *</label>
                    <select
                      className="form-select"
                      name="leaveType"
                      value={formData.leaveType}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Leave Type</option>
                      {leaveTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Half Day Leave?</label>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        name="isHalfDay"
                        checked={formData.isHalfDay}
                        onChange={handleInputChange}
                      />
                      <label className="form-check-label">
                        Yes, this is a half day leave
                      </label>
                    </div>
                  </div>
                  
                  {formData.isHalfDay && (
                    <div className="col-md-6 mt-3">
                      <label className="form-label">Half Day Period</label>
                      <select
                        className="form-select"
                        name="halfDayPeriod"
                        value={formData.halfDayPeriod}
                        onChange={handleInputChange}
                      >
                        <option value="Morning">Morning</option>
                        <option value="Afternoon">Afternoon</option>
                      </select>
                    </div>
                  )}

                  <div className="col-md-6 mt-3">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="col-md-6 mt-3">
                    <label className="form-label">End Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  {totalDays > 0 && (
                    <div className="col-12 mt-3">
                      <div className="alert alert-info">
                        <strong>Total Leave Days: {totalDays}</strong>
                        {availableBalance !== null && (
                          <span className="ms-3">
                            Available Balance: {availableBalance} days
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="col-12 mt-3">
                    <label className="form-label">Reason for Leave *</label>
                    <textarea
                      className="form-control"
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Please provide a detailed reason for your leave request"
                      maxLength="500"
                      required
                    ></textarea>
                    <small className="text-muted">
                      {formData.reason.length}/500 characters
                    </small>
                  </div>
                </div>

                {/* Handover Information */}
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="text-primary mb-3">
                      <i className="bi bi-arrow-left-right me-2"></i>
                      Handover Information (Optional)
                    </h6>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Handover Notes</label>
                    <textarea
                      className="form-control"
                      name="handoverNotes"
                      value={formData.handoverNotes}
                      onChange={handleInputChange}
                      rows="3"
                      placeholder="Provide details about work handover, pending tasks, or important information for colleagues"
                      maxLength="1000"
                    ></textarea>
                    <small className="text-muted">
                      {formData.handoverNotes.length}/1000 characters
                    </small>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="text-primary mb-3">
                      <i className="bi bi-telephone me-2"></i>
                      Emergency Contact (Optional)
                    </h6>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Contact Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="emergencyContact.name"
                      value={formData.emergencyContact.name}
                      onChange={handleInputChange}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      name="emergencyContact.phone"
                      value={formData.emergencyContact.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Relationship</label>
                    <input
                      type="text"
                      className="form-control"
                      name="emergencyContact.relationship"
                      value={formData.emergencyContact.relationship}
                      onChange={handleInputChange}
                      placeholder="e.g., Spouse, Parent, Friend"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="d-flex justify-content-end">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send me-2"></i>
                        Submit Leave Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Leave Balance Sidebar */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-pie-chart me-2"></i>
                Leave Balance
              </h5>
            </div>
            <div className="card-body">
              {Object.entries(leaveBalance).map(([type, balance]) => (
                <div key={type} className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-semibold text-capitalize">{type} Leave</span>
                    <span className="badge bg-primary">{balance.available}/{balance.total}</span>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{ width: `${(balance.available / balance.total) * 100}%` }}
                    ></div>
                  </div>
                  <small className="text-muted">
                    Used: {balance.used} days
                  </small>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Tips */}
          <div className="card mt-4">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-lightbulb me-2"></i>
                Quick Tips
              </h5>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Submit requests at least 2 days in advance
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Provide detailed handover notes for longer leaves
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Check your leave balance before applying
                </li>
                <li className="mb-0">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Contact HR for any policy questions
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequest;
