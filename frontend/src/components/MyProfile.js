import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const MyProfile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const response = await api.get('/auth/profile');
      setProfileData(response.data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'personal', label: '👤 Personal Info', icon: '👤' },
    { id: 'work', label: '💼 Work Info', icon: '💼' },
    { id: 'documents', label: '📄 Documents', icon: '📄' },
    { id: 'emergency', label: '🚨 Emergency Contact', icon: '🚨' },
    { id: 'bank', label: '🏦 Bank & Salary', icon: '🏦' },
    { id: 'leave', label: '🏖️ Leave Summary', icon: '🏖️' },
    { id: 'attendance', label: '⏰ Attendance', icon: '⏰' },
    { id: 'payslips', label: '💰 Payslips', icon: '💰' },
    { id: 'performance', label: '📊 Performance', icon: '📊' },
    { id: 'trainings', label: '🎓 Trainings', icon: '🎓' },
    { id: 'notifications', label: '🔔 Notifications', icon: '🔔' },
    { id: 'security', label: '🔒 Security', icon: '🔒' }
  ];

  const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return 'Not provided';
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  };

  const formatDate = (date) => {
    if (!date) return 'Not provided';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );
    }

    if (!profileData) {
      return <div className="alert alert-warning">Unable to load profile data</div>;
    }

    switch (activeTab) {
      case 'personal':
        return (
          <div className="row">
            <div className="col-md-4 text-center mb-4">
              <div className="profile-photo-container">
                <img
                  src={profileData.profilePhoto || '/api/placeholder/150/150'}
                  alt="Profile"
                  className="rounded-circle mb-3"
                  style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                />
                <button className="btn btn-outline-primary btn-sm">Change Photo</button>
              </div>
            </div>
            <div className="col-md-8">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Full Name</label>
                  <p className="form-control-plaintext">{profileData.firstName} {profileData.lastName}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Date of Birth</label>
                  <p className="form-control-plaintext">{formatDate(profileData.dateOfBirth)}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Gender</label>
                  <p className="form-control-plaintext">{profileData.gender || 'Not specified'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Phone Number</label>
                  <p className="form-control-plaintext">{profileData.phoneNumber || 'Not provided'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Email</label>
                  <p className="form-control-plaintext">{profileData.email}</p>
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label fw-bold">Address</label>
                  <p className="form-control-plaintext">
                    {profileData.address ? 
                      `${profileData.address.street || ''}, ${profileData.address.city || ''}, ${profileData.address.state || ''} ${profileData.address.zipCode || ''}, ${profileData.address.country || ''}`.replace(/^,\s*|,\s*$/g, '') 
                      : 'Not provided'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'work':
        return (
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Employee ID</label>
              <p className="form-control-plaintext">{profileData.employeeId}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Department</label>
              <p className="form-control-plaintext">{profileData.department}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Team Name</label>
              <p className="form-control-plaintext">{profileData.teamName || 'Not assigned'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Role/Designation</label>
              <p className="form-control-plaintext">{profileData.role}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Reporting Manager</label>
              <p className="form-control-plaintext">{profileData.reportingManager?.firstName || 'Not assigned'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Joining Date</label>
              <p className="form-control-plaintext">{formatDate(profileData.joiningDate)}</p>
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="row">
            <div className="col-12">
              <div className="alert alert-info">
                <h6>📄 Personal Documents</h6>
                <p>View and download your personal documents</p>
              </div>
              <div className="list-group">
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">ID Proof (Aadhar Card)</h6>
                    <small className="text-muted">Uploaded on: Jan 15, 2024</small>
                  </div>
                  <button className="btn btn-outline-primary btn-sm">Download</button>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Offer Letter</h6>
                    <small className="text-muted">Uploaded on: Dec 20, 2023</small>
                  </div>
                  <button className="btn btn-outline-primary btn-sm">Download</button>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Experience Letters</h6>
                    <small className="text-muted">Uploaded on: Dec 22, 2023</small>
                  </div>
                  <button className="btn btn-outline-primary btn-sm">Download</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'emergency':
        return (
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Contact Name</label>
              <p className="form-control-plaintext">{profileData.emergencyContact?.name || 'Not provided'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Relationship</label>
              <p className="form-control-plaintext">{profileData.emergencyContact?.relationship || 'Not provided'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Phone Number</label>
              <p className="form-control-plaintext">{profileData.emergencyContact?.phone || 'Not provided'}</p>
            </div>
            <div className="col-12 mb-3">
              <label className="form-label fw-bold">Address</label>
              <p className="form-control-plaintext">{profileData.emergencyContact?.address || 'Not provided'}</p>
            </div>
          </div>
        );

      case 'bank':
        return (
          <div className="row">
            <div className="col-12 mb-3">
              <div className="alert alert-warning">
                <small>🔒 Sensitive information is masked for security</small>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Account Number</label>
              <p className="form-control-plaintext">{maskAccountNumber(profileData.bankDetails?.accountNumber)}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Bank Name</label>
              <p className="form-control-plaintext">{profileData.bankDetails?.bankName || 'Not provided'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">IFSC Code</label>
              <p className="form-control-plaintext">{profileData.bankDetails?.ifscCode || 'Not provided'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">PF Number</label>
              <p className="form-control-plaintext">{profileData.bankDetails?.pfNumber || 'Not provided'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">ESI Number</label>
              <p className="form-control-plaintext">{profileData.bankDetails?.esiNumber || 'Not provided'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">PAN Number</label>
              <p className="form-control-plaintext">{profileData.bankDetails?.panNumber || 'Not provided'}</p>
            </div>
          </div>
        );

      case 'leave':
        return (
          <div className="row">
            <div className="col-12 mb-4">
              <h6>📊 Current Leave Balance</h6>
              <div className="row">
                <div className="col-md-2 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-primary">{profileData.leaveBalance?.casual || 0}</h5>
                      <p className="card-text small">Casual Leave</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-2 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-success">{profileData.leaveBalance?.sick || 0}</h5>
                      <p className="card-text small">Sick Leave</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-2 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-info">{profileData.leaveBalance?.earned || 0}</h5>
                      <p className="card-text small">Earned Leave</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-2 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-warning">{profileData.leaveBalance?.maternity || 0}</h5>
                      <p className="card-text small">Maternity</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-2 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-secondary">{profileData.leaveBalance?.paternity || 0}</h5>
                      <p className="card-text small">Paternity</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12">
              <h6>📅 Upcoming Leave Dates</h6>
              <div className="alert alert-light">
                <p className="mb-0">No upcoming leaves scheduled</p>
              </div>
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="row">
            <div className="col-12 mb-4">
              <h6>📊 Monthly Attendance Overview</h6>
              <div className="row">
                <div className="col-md-3 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-success">22</h5>
                      <p className="card-text small">Present Days</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-danger">2</h5>
                      <p className="card-text small">Absent Days</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-warning">1</h5>
                      <p className="card-text small">Late Arrivals</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-info">176</h5>
                      <p className="card-text small">Total Hours</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12">
              <h6>🕐 Recent Punch Records</h6>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Punch In</th>
                      <th>Punch Out</th>
                      <th>Total Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Today</td>
                      <td>09:15 AM</td>
                      <td>-</td>
                      <td>-</td>
                    </tr>
                    <tr>
                      <td>Yesterday</td>
                      <td>09:00 AM</td>
                      <td>06:30 PM</td>
                      <td>9h 30m</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'payslips':
        return (
          <div className="row">
            <div className="col-12">
              <h6>💰 Monthly Payslips</h6>
              <div className="list-group">
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">December 2024</h6>
                    <small className="text-muted">Generated on: Jan 1, 2025</small>
                  </div>
                  <button className="btn btn-outline-primary btn-sm">Download PDF</button>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">November 2024</h6>
                    <small className="text-muted">Generated on: Dec 1, 2024</small>
                  </div>
                  <button className="btn btn-outline-primary btn-sm">Download PDF</button>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">October 2024</h6>
                    <small className="text-muted">Generated on: Nov 1, 2024</small>
                  </div>
                  <button className="btn btn-outline-primary btn-sm">Download PDF</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="row">
            <div className="col-12 mb-4">
              <h6>🎯 Current Goals & KPIs</h6>
              {profileData.currentGoals && profileData.currentGoals.length > 0 ? (
                <div className="list-group">
                  {profileData.currentGoals.map((goal, index) => (
                    <div key={index} className="list-group-item">
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">{goal.title}</h6>
                        <span className={`badge ${goal.status === 'Completed' ? 'bg-success' : goal.status === 'In Progress' ? 'bg-warning' : 'bg-secondary'}`}>
                          {goal.status}
                        </span>
                      </div>
                      <p className="mb-1">{goal.description}</p>
                      <small>Target Date: {formatDate(goal.targetDate)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alert alert-light">No current goals assigned</div>
              )}
            </div>
            <div className="col-12">
              <h6>📈 Last Appraisal</h6>
              {profileData.lastAppraisal ? (
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">Rating: {profileData.lastAppraisal.rating}</h6>
                    <p className="card-text">{profileData.lastAppraisal.feedback}</p>
                    <small className="text-muted">Date: {formatDate(profileData.lastAppraisal.date)}</small>
                  </div>
                </div>
              ) : (
                <div className="alert alert-light">No appraisal data available</div>
              )}
            </div>
          </div>
        );

      case 'trainings':
        return (
          <div className="row">
            <div className="col-12">
              <h6>🎓 Training Programs</h6>
              <div className="list-group">
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">React Advanced Concepts</h6>
                    <small className="text-muted">Assigned on: Dec 15, 2024</small>
                  </div>
                  <span className="badge bg-warning">In Progress</span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Leadership Skills</h6>
                    <small className="text-muted">Completed on: Nov 20, 2024</small>
                  </div>
                  <span className="badge bg-success">Completed</span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Data Security Awareness</h6>
                    <small className="text-muted">Assigned on: Jan 5, 2025</small>
                  </div>
                  <span className="badge bg-secondary">Not Started</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="row">
            <div className="col-12">
              <h6>🔔 Recent Notifications</h6>
              <div className="list-group">
                <div className="list-group-item">
                  <div className="d-flex w-100 justify-content-between">
                    <h6 className="mb-1">Leave Request Approved</h6>
                    <small>2 hours ago</small>
                  </div>
                  <p className="mb-1">Your leave request for Jan 15-16 has been approved by your manager.</p>
                </div>
                <div className="list-group-item">
                  <div className="d-flex w-100 justify-content-between">
                    <h6 className="mb-1">New Training Assigned</h6>
                    <small>1 day ago</small>
                  </div>
                  <p className="mb-1">You have been assigned a new training: "Data Security Awareness"</p>
                </div>
                <div className="list-group-item">
                  <div className="d-flex w-100 justify-content-between">
                    <h6 className="mb-1">Payslip Generated</h6>
                    <small>3 days ago</small>
                  </div>
                  <p className="mb-1">Your payslip for December 2024 is now available for download.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="row">
            <div className="col-12">
              <h6>🔒 Security & Settings</h6>
              <div className="list-group">
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Change Password</h6>
                    <small className="text-muted">Last changed: 30 days ago</small>
                  </div>
                  <button className="btn btn-outline-primary btn-sm">Change</button>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Two-Factor Authentication</h6>
                    <small className="text-muted">Status: Disabled</small>
                  </div>
                  <button className="btn btn-outline-success btn-sm">Enable</button>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Active Sessions</h6>
                    <small className="text-muted">2 active sessions</small>
                  </div>
                  <button className="btn btn-outline-danger btn-sm">Manage</button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a tab to view content</div>;
    }
  };

  // Listen for section changes from ProfileSidebar
  useEffect(() => {
    const handleSectionChange = (section) => {
      setActiveTab(section);
    };

    window.profileSectionChange = handleSectionChange;

    // Check URL hash for initial section
    const hash = window.location.hash.replace('#', '');
    if (hash && tabs.find(tab => tab.id === hash)) {
      setActiveTab(hash);
    }

    return () => {
      delete window.profileSectionChange;
    };
  }, []);

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">My Profile</h2>
              <p className="text-muted mb-0">Welcome back, {user?.firstName}! Manage your profile information.</p>
            </div>
            <div>
              <span className="badge bg-primary fs-6">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-3 col-md-4 mb-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Profile Sections</h6>
            </div>
            <div className="list-group list-group-flush">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`list-group-item list-group-item-action ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="me-2">{tab.icon}</span>
                  {tab.label.replace(/^\S+\s/, '')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-9 col-md-8">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h5>
            </div>
            <div className="card-body">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
