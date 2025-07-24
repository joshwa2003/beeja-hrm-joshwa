import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveAPI, authAPI } from '../../utils/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  LinearProgress,
  Chip,
  Paper,
  Divider,
  Container,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  CalendarToday,
  Person,
  Send,
  AttachFile,
  Delete,
  CheckCircle,
  Phone,
  Lightbulb,
  PieChart,
  Assignment,
} from '@mui/icons-material';

const LeaveRequest = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({});
  const [profile, setProfile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

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
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setProfile(response.data.user);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

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

  // File handling functions
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setError('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.');
      return;
    }
    
    // Validate file sizes (5MB limit)
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('File size too large. Maximum size allowed is 5MB per file.');
      return;
    }
    
    // Limit total files to 5
    if (selectedFiles.length + files.length > 5) {
      setError('Maximum 5 files allowed per leave request.');
      return;
    }
    
    setSelectedFiles(prev => [...prev, ...files]);
    setError('');
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const shouldShowDocumentUpload = () => {
    return ['Sick', 'Maternity', 'Paternity', 'Emergency'].includes(formData.leaveType);
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

      const response = await leaveAPI.submitLeaveRequest(submitData);
      const leaveRequestId = response.data.leaveRequest._id;
      
      // Upload documents if any are selected
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        try {
          const formDataForUpload = new FormData();
          selectedFiles.forEach(file => {
            formDataForUpload.append('documents', file);
          });
          
          await leaveAPI.uploadLeaveDocuments(leaveRequestId, formDataForUpload);
          setSuccess('Leave request submitted successfully with supporting documents! You will be notified once it is reviewed.');
        } catch (uploadError) {
          console.error('Document upload error:', uploadError);
          setSuccess('Leave request submitted successfully, but there was an issue uploading documents. You can try uploading them later.');
        } finally {
          setIsUploading(false);
        }
      } else {
        setSuccess('Leave request submitted successfully! You will be notified once it is reviewed.');
      }
      
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
      
      // Reset file selection
      setSelectedFiles([]);

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
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Page Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center' }}>
              <CalendarToday sx={{ mr: 2, fontSize: '2.5rem' }} />
              Apply for Leave
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Submit a new leave request
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess('')}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Leave Request Form */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                <Assignment sx={{ mr: 2 }} />
                Leave Request Form
              </Typography>

              <form onSubmit={handleSubmit}>
                {/* Employee Details (Auto-filled) */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                    <Person sx={{ mr: 1 }} />
                    Employee Details
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Employee ID"
                        value={profile?.employeeId || user?.employeeId || ''}
                        disabled
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Employee Name"
                        value={`${profile?.firstName || user?.firstName || ''} ${profile?.lastName || user?.lastName || ''}`.trim()}
                        disabled
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Department"
                        value={profile?.department?.name || user?.department?.name || user?.department || ''}
                        disabled
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Designation"
                        value={profile?.designation || user?.designation || ''}
                        disabled
                        variant="outlined"
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* Leave Details */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                    <CalendarToday sx={{ mr: 1 }} />
                    Leave Details
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Leave Type</InputLabel>
                        <Select
                          name="leaveType"
                          value={formData.leaveType}
                          onChange={handleInputChange}
                          label="Leave Type"
                        >
                          {leaveTypes.map(type => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            name="isHalfDay"
                            checked={formData.isHalfDay}
                            onChange={handleInputChange}
                          />
                        }
                        label="Half Day Leave"
                      />
                    </Grid>
                    
                    {formData.isHalfDay && (
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Half Day Period</InputLabel>
                          <Select
                            name="halfDayPeriod"
                            value={formData.halfDayPeriod}
                            onChange={handleInputChange}
                            label="Half Day Period"
                          >
                            <MenuItem value="Morning">Morning</MenuItem>
                            <MenuItem value="Afternoon">Afternoon</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    )}

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Start Date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: new Date().toISOString().split('T')[0] }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="date"
                        label="End Date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: formData.startDate || new Date().toISOString().split('T')[0] }}
                        required
                      />
                    </Grid>

                    {totalDays > 0 && (
                      <Grid item xs={12}>
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            Total Leave Days: {totalDays}
                            {availableBalance !== null && (
                              <Typography component="span" sx={{ ml: 3 }}>
                                Available Balance: {availableBalance} days
                              </Typography>
                            )}
                          </Typography>
                        </Alert>
                      </Grid>
                    )}

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Reason for Leave"
                        name="reason"
                        value={formData.reason}
                        onChange={handleInputChange}
                        placeholder="Please provide a detailed reason for your leave request"
                        inputProps={{ maxLength: 500 }}
                        helperText={`${formData.reason.length}/500 characters`}
                        required
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* Handover Information */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                    <Assignment sx={{ mr: 1 }} />
                    Handover Information (Optional)
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Handover Notes"
                    name="handoverNotes"
                    value={formData.handoverNotes}
                    onChange={handleInputChange}
                    placeholder="Provide details about work handover, pending tasks, or important information for colleagues"
                    inputProps={{ maxLength: 1000 }}
                    helperText={`${formData.handoverNotes.length}/1000 characters`}
                  />
                </Box>

                {/* Document Upload Section */}
                {shouldShowDocumentUpload() && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                      <AttachFile sx={{ mr: 1 }} />
                      Upload Supporting Documents (Optional)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      For {formData.leaveType} leave, you may upload supporting documents such as medical certificates, 
                      official letters, etc. Accepted formats: PDF, JPG, PNG (Max 5MB per file, up to 5 files)
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<AttachFile />}
                        disabled={loading || isUploading}
                        sx={{ mb: 1 }}
                      >
                        Select Files
                        <input
                          type="file"
                          hidden
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileSelect}
                        />
                      </Button>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Select PDF, JPG, or PNG files (Max 5MB each, up to 5 files total)
                      </Typography>
                    </Box>
                    
                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                      <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                          Selected Files ({selectedFiles.length}/5):
                        </Typography>
                        {selectedFiles.map((file, index) => (
                          <Paper key={index} sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box sx={{ mr: 2 }}>
                                {file.type === 'application/pdf' ? (
                                  <AttachFile color="error" />
                                ) : (
                                  <AttachFile color="primary" />
                                )}
                              </Box>
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {file.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatFileSize(file.size)}
                                </Typography>
                              </Box>
                            </Box>
                            <IconButton
                              onClick={() => removeFile(index)}
                              disabled={loading || isUploading}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </Paper>
                        ))}
                        
                        {/* Upload Progress */}
                        {isUploading && (
                          <Box sx={{ mt: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <CircularProgress size={20} sx={{ mr: 2 }} />
                              <Typography>Uploading documents...</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={uploadProgress}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        )}
                      </Paper>
                    )}
                  </Box>
                )}

                <Divider sx={{ my: 4 }} />

                {/* Emergency Contact */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                    <Phone sx={{ mr: 1 }} />
                    Emergency Contact (Optional)
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Contact Name"
                        name="emergencyContact.name"
                        value={formData.emergencyContact.name}
                        onChange={handleInputChange}
                        placeholder="Full name"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        name="emergencyContact.phone"
                        value={formData.emergencyContact.phone}
                        onChange={handleInputChange}
                        placeholder="Phone number"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Relationship"
                        name="emergencyContact.relationship"
                        value={formData.emergencyContact.relationship}
                        onChange={handleInputChange}
                        placeholder="e.g., Spouse, Parent, Friend"
                      />
                    </Grid>
                  </Grid>
                </Box>

                {/* Submit Button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading || isUploading}
                    startIcon={loading || isUploading ? <CircularProgress size={20} /> : <Send />}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      px: 4,
                      py: 1.5,
                    }}
                  >
                    {loading || isUploading ? 
                      (isUploading ? 'Uploading Documents...' : 'Submitting...') : 
                      'Submit Leave Request'
                    }
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Leave Balance Sidebar */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                <PieChart sx={{ mr: 1 }} />
                Leave Balance
              </Typography>
              {Object.entries(leaveBalance).map(([type, balance]) => (
                <Box key={type} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {type} Leave
                    </Typography>
                    <Chip 
                      label={`${balance.available}/${balance.total}`} 
                      color="primary" 
                      size="small"
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(balance.available / balance.total) * 100}
                    sx={{ height: 8, borderRadius: 4, mb: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Used: {balance.used} days
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                <Lightbulb sx={{ mr: 1 }} />
                Quick Tips
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Submit requests at least 2 days in advance"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Provide detailed handover notes for longer leaves"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Check your leave balance before applying"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Upload supporting documents for medical/emergency leaves"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Contact HR for any policy questions"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default LeaveRequest;
