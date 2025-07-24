import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { holidayAPI } from '../../utils/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Container,
  Chip,
  Avatar,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ButtonGroup,
  Tooltip,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
  TextareaAutosize,
} from '@mui/material';
import {
  CalendarToday,
  Event,
  Add,
  Edit,
  Delete,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  Today,
  Close,
  CloudUpload,
  GetApp,
  Info,
  CheckCircle,
  Warning,
  Error,
  Flag,
} from '@mui/icons-material';

const HolidayCalendar = () => {
  const { hasAnyRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);

  const [formData, setFormData] = useState({
    holidayName: '',
    date: '',
    holidayType: 'Public',
    description: ''
  });

  const canManageHolidays = hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']);

  const holidayTypes = [
    { value: 'Public', label: 'Public Holiday', color: '#dc3545' },
    { value: 'Optional/Floating', label: 'Optional/Floating', color: '#fd7e14' },
    { value: 'Company-Specific', label: 'Company-Specific', color: '#0d6efd' }
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchHolidays();
  }, [currentDate]);

  // Government holidays for common countries (can be expanded)
  const getGovernmentHolidays = (year) => {
    const holidays = [
      // India holidays
      { name: "New Year's Day", date: `${year}-01-01`, type: 'Public' },
      { name: "Republic Day", date: `${year}-01-26`, type: 'Public' },
      { name: "Independence Day", date: `${year}-08-15`, type: 'Public' },
      { name: "Gandhi Jayanti", date: `${year}-10-02`, type: 'Public' },
      { name: "Christmas Day", date: `${year}-12-25`, type: 'Public' },
    ];
    
    return holidays.map(holiday => ({
      _id: `gov-${holiday.name.replace(/\s+/g, '-').toLowerCase()}-${year}`,
      holidayName: holiday.name,
      date: holiday.date,
      holidayType: holiday.type,
      description: 'Government Holiday',
      isGovernmentHoliday: true
    }));
  };

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const params = {
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        limit: 100
      };

      const response = await holidayAPI.getHolidays(params);
      const userHolidays = response.data.holidays || [];
      
      // Get government holidays for the current year
      const governmentHolidays = getGovernmentHolidays(currentDate.getFullYear());
      
      // Combine user holidays and government holidays
      const allHolidays = [...userHolidays, ...governmentHolidays];
      
      setHolidays(allHolidays);
    } catch (err) {
      setError('Failed to fetch holidays');
      console.error('Fetch holidays error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingHoliday) {
        await holidayAPI.updateHoliday(editingHoliday._id, formData);
        setSuccess('Holiday updated successfully!');
      } else {
        await holidayAPI.createHoliday(formData);
        setSuccess('Holiday created successfully!');
      }

      setShowAddModal(false);
      setEditingHoliday(null);
      resetForm();
      fetchHolidays();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save holiday');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (holiday) => {
    setEditingHoliday(holiday);
    // Fix date formatting for editing
    const dateStr = holiday.date.includes('T') ? holiday.date.split('T')[0] : holiday.date;
    setFormData({
      holidayName: holiday.holidayName,
      date: dateStr,
      holidayType: holiday.holidayType,
      description: holiday.description || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (holidayId) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    try {
      setLoading(true);
      await holidayAPI.deleteHoliday(holidayId);
      setSuccess('Holiday deleted successfully!');
      fetchHolidays();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete holiday');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      holidayName: '',
      date: '',
      holidayType: 'Public',
      description: ''
    });
  };

  // Excel upload functionality
  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid Excel file (.xlsx, .xls) or CSV file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      setLoading(true);
      setError('');
      setUploadProgress(0);

      const response = await holidayAPI.uploadHolidaysExcel(formData);
      
      setUploadResults(response.data);
      
      // Show success message including already exists count
      let successMessage = `Successfully uploaded ${response.data.createdCount} holidays from Excel file.`;
      if (response.data.alreadyExistsCount > 0) {
        successMessage += ` ${response.data.alreadyExistsCount} holidays already existed and were skipped.`;
      }
      setSuccess(successMessage);
      
      // Refresh holidays list
      fetchHolidays();
      
      // Reset file input
      event.target.value = '';
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload Excel file');
      setUploadResults(null);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Download sample Excel file
  const handleDownloadSample = async () => {
    try {
      setLoading(true);
      const response = await holidayAPI.downloadSampleExcel();
      
      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'holiday_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download sample Excel file');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (date = null) => {
    setEditingHoliday(null);
    resetForm();
    if (date) {
      // Fix date formatting to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      setFormData(prev => ({
        ...prev,
        date: dateString
      }));
    }
    setShowAddModal(true);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  const navigateToMonth = (month, year) => {
    const newDate = new Date(year, month, 1);
    setCurrentDate(newDate);
  };

  const getTypeConfig = (type) => {
    return holidayTypes.find(t => t.value === type) || holidayTypes[0];
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateObj = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      // Create date in local timezone to avoid timezone issues
      const localDate = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth(), currentDateObj.getDate());
      
      const dayHolidays = holidays.filter(holiday => {
        // Parse holiday date properly
        let holidayDate;
        if (holiday.date.includes('T')) {
          holidayDate = new Date(holiday.date);
        } else {
          holidayDate = new Date(holiday.date + 'T00:00:00');
        }
        
        // Create local date objects for comparison
        const holidayLocalDate = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate());
        return holidayLocalDate.getTime() === localDate.getTime();
      });
      
      const today = new Date();
      const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isToday = localDate.toDateString() === todayLocal.toDateString();
      const isCurrentMonth = currentDateObj.getMonth() === month;
      
      days.push({
        date: localDate,
        isCurrentMonth,
        isToday,
        holidays: dayHolidays
      });
      
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    return days;
  };

  const handleDateClick = (day) => {
    // Use the exact date from the calendar day
    setSelectedDate(day.date);
    if (day.holidays.length > 0) {
      setShowModal(true);
    } else if (canManageHolidays) {
      openAddModal(day.date);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calendarDays = generateCalendarDays();

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
              <Event sx={{ mr: 2, fontSize: '2.5rem' }} />
              Holiday Calendar
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Manage and view company holidays
            </Typography>
          </Box>
          {canManageHolidays && (
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                size="large"
                onClick={() => openAddModal()}
                startIcon={<Add />}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  },
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                Add Holiday
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={() => setShowExcelUploadModal(true)}
                startIcon={<Upload />}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.3)',
                  },
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                Upload Excel
              </Button>
            </Stack>
          )}
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

      {/* Calendar Navigation */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton
                onClick={() => navigateMonth(-1)}
                sx={{
                  bgcolor: 'grey.100',
                  '&:hover': { bgcolor: 'grey.200' },
                }}
              >
                <ChevronLeft />
              </IconButton>
              
              <Stack direction="row" spacing={1}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={currentDate.getMonth()}
                    onChange={(e) => navigateToMonth(parseInt(e.target.value), currentDate.getFullYear())}
                  >
                    {months.map((month, index) => (
                      <MenuItem key={index} value={index}>
                        {month}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={currentDate.getFullYear()}
                    onChange={(e) => navigateToMonth(currentDate.getMonth(), parseInt(e.target.value))}
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      return (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Stack>
              
              <IconButton
                onClick={() => navigateMonth(1)}
                sx={{
                  bgcolor: 'grey.100',
                  '&:hover': { bgcolor: 'grey.200' },
                }}
              >
                <ChevronRight />
              </IconButton>
            </Stack>
            
            <Button
              variant="contained"
              onClick={navigateToToday}
              startIcon={<Today />}
              sx={{
                backgroundColor: '#20C997',
                '&:hover': {
                  backgroundColor: '#17A085',
                },
              }}
            >
              Today
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <CardContent sx={{ p: 2, position: 'relative' }}>
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <CircularProgress />
            </Box>
          )}
          
          {/* Week Days Header */}
          <Grid container spacing={0} sx={{ mb: 1 }}>
            {weekDays.map(day => (
              <Grid item xs key={day}>
                <Box
                  sx={{
                    textAlign: 'center',
                    fontWeight: 700,
                    color: 'text.secondary',
                    py: 1,
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                  }}
                >
                  {day}
                </Box>
              </Grid>
            ))}
          </Grid>
          
          {/* Calendar Days */}
          <Grid container spacing={0.5}>
            {calendarDays.map((day, index) => (
              <Grid item xs key={index}>
                <Paper
                  elevation={day.holidays.length > 0 ? 2 : 0}
                  sx={{
                    minHeight: 80,
                    p: 1,
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: day.isToday 
                      ? 'primary.main' 
                      : !day.isCurrentMonth 
                        ? 'grey.50' 
                        : day.holidays.length > 0 
                          ? 'background.paper' 
                          : 'background.paper',
                    color: day.isToday ? 'primary.contrastText' : !day.isCurrentMonth ? 'text.disabled' : 'text.primary',
                    borderLeft: day.holidays.length > 0 ? 3 : 0,
                    borderLeftColor: 'primary.main',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      elevation: 3,
                      transform: 'translateY(-1px)',
                    },
                  }}
                  onClick={() => handleDateClick(day)}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      mb: 0.5,
                      fontSize: '0.875rem',
                    }}
                  >
                    {day.date.getDate()}
                  </Typography>
                  
                  {day.holidays.length > 0 && (
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {day.holidays.slice(0, 2).map((holiday, idx) => {
                        const typeConfig = getTypeConfig(holiday.holidayType);
                        return (
                          <Chip
                            key={idx}
                            label={holiday.holidayName.length > 10 
                              ? holiday.holidayName.substring(0, 10) + '...' 
                              : holiday.holidayName}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              bgcolor: typeConfig.color,
                              color: 'white',
                              '& .MuiChip-label': {
                                px: 0.5,
                              },
                            }}
                            title={holiday.holidayName}
                          />
                        );
                      })}
                      {day.holidays.length > 2 && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.6rem',
                            color: 'text.secondary',
                            textAlign: 'center',
                            fontStyle: 'italic',
                            mt: 0.25,
                          }}
                        >
                          +{day.holidays.length - 2} more
                        </Typography>
                      )}
                    </Box>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Holiday Details Modal */}
      {showModal && selectedDate && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '1000',
          padding: '1rem'
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '2rem 2rem 1rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: '0',
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#2d3748'
              }}>{formatDate(selectedDate)}</h3>
              <button style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#718096',
                padding: '0.5rem',
                borderRadius: '50%'
              }} onClick={() => setShowModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            
            <div style={{ padding: '2rem' }}>
              {holidays
                .filter(holiday => {
                  // Parse holiday date properly
                  let holidayDate;
                  if (holiday.date.includes('T')) {
                    holidayDate = new Date(holiday.date);
                  } else {
                    holidayDate = new Date(holiday.date + 'T00:00:00');
                  }
                  
                  // Create local date objects for comparison
                  const holidayLocalDate = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate());
                  const selectedLocalDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                  return holidayLocalDate.getTime() === selectedLocalDate.getTime();
                })
                .map((holiday, index) => {
                  const typeConfig = getTypeConfig(holiday.holidayType);
                  return (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '1rem',
                      borderRadius: '12px',
                      background: '#f7fafc',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ flex: '1' }}>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          color: '#2d3748',
                          marginBottom: '0.5rem'
                        }}>{holiday.holidayName}</div>
                        <div style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          marginBottom: '0.5rem',
                          color: typeConfig.color
                        }}>
                          {holiday.holidayType}
                        </div>
                        {holiday.description && (
                          <div style={{
                            fontSize: '0.9rem',
                            color: '#718096'
                          }}>{holiday.description}</div>
                        )}
                      </div>
                      
                      {canManageHolidays && !holiday.isGovernmentHoliday && (
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem'
                        }}>
                          <button
                            style={{
                              width: '36px',
                              height: '36px',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#e6fffa',
                              color: '#319795'
                            }}
                            onClick={() => {
                              setShowModal(false);
                              handleEdit(holiday);
                            }}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            style={{
                              width: '36px',
                              height: '36px',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#fed7d7',
                              color: '#e53e3e'
                            }}
                            onClick={() => {
                              setShowModal(false);
                              handleDelete(holiday._id);
                            }}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      )}
                      {holiday.isGovernmentHoliday && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <span style={{
                            background: '#48bb78',
                            color: 'white',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <i className="bi bi-flag"></i> Government
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Holiday Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '1000',
          padding: '1rem'
        }} onClick={() => setShowAddModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '2rem 2rem 1rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: '0',
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#2d3748'
              }}>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</h3>
              <button style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#718096',
                padding: '0.5rem',
                borderRadius: '50%'
              }} onClick={() => setShowAddModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#2d3748'
                  }}>Holiday Name *</label>
                  <input
                    type="text"
                    name="holidayName"
                    value={formData.holidayName}
                    onChange={handleInputChange}
                    required
                    maxLength="100"
                    placeholder="Enter holiday name"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#2d3748'
                  }}>Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#2d3748'
                  }}>Holiday Type *</label>
                  <select
                    name="holidayType"
                    value={formData.holidayType}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    {holidayTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                    color: '#2d3748'
                  }}>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    maxLength="500"
                    placeholder="Optional description or notes"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                      resize: 'vertical'
                    }}
                  />
                  <small style={{
                    color: '#718096',
                    fontSize: '0.8rem'
                  }}>{formData.description.length}/500 characters</small>
                </div>
              </div>
              
              <div style={{
                padding: '1rem 2rem 2rem',
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '2px solid #e2e8f0',
                    background: 'white',
                    color: '#4a5568',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle"></i>
                      {editingHoliday ? 'Update Holiday' : 'Add Holiday'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Upload Modal */}
      {showExcelUploadModal && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '1000',
          padding: '1rem'
        }} onClick={() => setShowExcelUploadModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '2rem 2rem 1rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: '0',
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#2d3748'
              }}>Upload Holidays from Excel</h3>
              <button style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#718096',
                padding: '0.5rem',
                borderRadius: '50%'
              }} onClick={() => setShowExcelUploadModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            
            <div style={{ padding: '2rem' }}>
              {/* Download Sample Section */}
              <div style={{
                background: '#f7fafc',
                padding: '1.5rem',
                borderRadius: '12px',
                marginBottom: '2rem',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{
                  margin: '0 0 1rem 0',
                  color: '#2d3748',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}>
                  <i className="bi bi-info-circle" style={{ marginRight: '0.5rem', color: '#3182ce' }}></i>
                  Step 1: Download Sample Template
                </h4>
                <p style={{
                  margin: '0 0 1rem 0',
                  color: '#718096',
                  fontSize: '0.9rem'
                }}>
                  Download our Excel template to see the required format and sample data.
                </p>
                <button
                  style={{
                    background: 'linear-gradient(135deg, #3182ce 0%, #2c5aa0 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onClick={handleDownloadSample}
                  disabled={loading}
                >
                  <i className="bi bi-download"></i>
                  Download Sample Excel
                </button>
              </div>

              {/* Upload Section */}
              <div style={{
                background: '#f7fafc',
                padding: '1.5rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{
                  margin: '0 0 1rem 0',
                  color: '#2d3748',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}>
                  <i className="bi bi-upload" style={{ marginRight: '0.5rem', color: '#48bb78' }}></i>
                  Step 2: Upload Your Excel File
                </h4>
                <p style={{
                  margin: '0 0 1rem 0',
                  color: '#718096',
                  fontSize: '0.9rem'
                }}>
                  Select your Excel file (.xlsx, .xls) or CSV file with holiday data.
                </p>
                
                <div style={{
                  border: '2px dashed #cbd5e0',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'white',
                  transition: 'all 0.3s ease'
                }}>
                  <i className="bi bi-file-earmark-excel" style={{
                    fontSize: '3rem',
                    color: '#48bb78',
                    marginBottom: '1rem'
                  }}></i>
                  <p style={{
                    margin: '0 0 1rem 0',
                    color: '#4a5568',
                    fontWeight: '600'
                  }}>
                    Choose Excel file to upload
                  </p>
                  <p style={{
                    margin: '0 0 1rem 0',
                    color: '#718096',
                    fontSize: '0.8rem'
                  }}>
                    Supported formats: .xlsx, .xls, .csv (Max 10MB)
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    style={{
                      display: 'none'
                    }}
                    id="excel-upload"
                  />
                  <label
                    htmlFor="excel-upload"
                    style={{
                      background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      border: 'none'
                    }}
                  >
                    <i className="bi bi-folder2-open"></i>
                    Select File
                  </label>
                </div>
              </div>

              {/* Upload Results */}
              {uploadResults && (
                <div style={{
                  background: uploadResults.errorCount > 0 ? '#fed7d7' : '#c6f6d5',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  marginBottom: '1rem',
                  border: `1px solid ${uploadResults.errorCount > 0 ? '#feb2b2' : '#9ae6b4'}`
                }}>
                  <h4 style={{
                    margin: '0 0 1rem 0',
                    color: uploadResults.errorCount > 0 ? '#c53030' : '#2f855a',
                    fontSize: '1.1rem',
                    fontWeight: '600'
                  }}>
                    <i className={`bi ${uploadResults.errorCount > 0 ? 'bi-exclamation-triangle' : 'bi-check-circle'}`} 
                       style={{ marginRight: '0.5rem' }}></i>
                    Upload Results
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d3748' }}>
                        {uploadResults.totalRows}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#718096' }}>Total Rows</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2f855a' }}>
                        {uploadResults.createdCount}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#718096' }}>Created</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f6ad55' }}>
                        {uploadResults.alreadyExistsCount || 0}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#718096' }}>Already Exist</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#c53030' }}>
                        {uploadResults.errorCount}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#718096' }}>Errors</div>
                    </div>
                  </div>
                  
                  {uploadResults.alreadyExists && uploadResults.alreadyExists.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h5 style={{ margin: '0 0 0.5rem 0', color: '#f6ad55' }}>Already Exists:</h5>
                      <div style={{
                        maxHeight: '150px',
                        overflowY: 'auto',
                        background: 'white',
                        padding: '1rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem'
                      }}>
                        {uploadResults.alreadyExists.map((item, index) => (
                          <div key={index} style={{ marginBottom: '0.5rem' }}>
                            <strong>Row {item.row}:</strong> {item.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {uploadResults.errors && uploadResults.errors.length > 0 && (
                    <div>
                      <h5 style={{ margin: '0 0 0.5rem 0', color: '#c53030' }}>Errors:</h5>
                      <div style={{
                        maxHeight: '150px',
                        overflowY: 'auto',
                        background: 'white',
                        padding: '1rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem'
                      }}>
                        {uploadResults.errors.map((error, index) => (
                          <div key={index} style={{ marginBottom: '0.5rem' }}>
                            <strong>Row {error.row}:</strong> {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Instructions */}
              <div style={{
                background: '#edf2f7',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#4a5568'
              }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#2d3748' }}>
                  <i className="bi bi-lightbulb" style={{ marginRight: '0.5rem' }}></i>
                  Tips:
                </h5>
                <ul style={{ margin: '0', paddingLeft: '1.5rem' }}>
                  <li>Use the sample template for correct format</li>
                  <li>Date format should be YYYY-MM-DD (e.g., 2024-12-25)</li>
                  <li>Required fields: Holiday Name, Date</li>
                  <li>Optional fields: Holiday Type, Description</li>
                  <li>Duplicate holidays will be skipped (not treated as errors)</li>
                  <li>Maximum file size: 10MB</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </Container>
  );
};

export default HolidayCalendar;
