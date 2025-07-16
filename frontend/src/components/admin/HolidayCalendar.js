import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { holidayAPI } from '../../utils/api';

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Modern Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#2d3748',
              margin: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <i className="bi bi-calendar-event" style={{ color: '#667eea' }}></i>
              Holiday Calendar
            </h1>
            <p style={{
              color: '#718096',
              margin: '0.5rem 0 0 0',
              fontSize: '1.1rem'
            }}>Manage and view company holidays</p>
          </div>
          
          {canManageHolidays && (
            <button
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '50px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onClick={() => openAddModal()}
            >
              <i className="bi bi-plus-circle"></i>
              Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: '#fed7d7',
          color: '#c53030',
          border: '1px solid #feb2b2'
        }}>
          <i className="bi bi-exclamation-triangle"></i>
          {error}
          <button 
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginLeft: 'auto',
              padding: '0.25rem',
              borderRadius: '50%'
            }}
            onClick={() => setError('')}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}

      {success && (
        <div style={{
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: '#c6f6d5',
          color: '#2f855a',
          border: '1px solid #9ae6b4'
        }}>
          <i className="bi bi-check-circle"></i>
          {success}
          <button 
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginLeft: 'auto',
              padding: '0.25rem',
              borderRadius: '50%'
            }}
            onClick={() => setSuccess('')}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}

      {/* Calendar Navigation */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '1.5rem 2rem',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem'
        }}>
          <button 
            style={{
              background: '#f7fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.2rem',
              color: '#4a5568'
            }}
            onClick={() => navigateMonth(-1)}
          >
            <i className="bi bi-chevron-left"></i>
          </button>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '300px'
          }}>
            <div style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <select 
                style={{
                  padding: '0.5rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  background: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#2d3748',
                  cursor: 'pointer'
                }}
                value={currentDate.getMonth()}
                onChange={(e) => navigateToMonth(parseInt(e.target.value), currentDate.getFullYear())}
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
              
              <select 
                style={{
                  padding: '0.5rem 1rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  background: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#2d3748',
                  cursor: 'pointer'
                }}
                value={currentDate.getFullYear()}
                onChange={(e) => navigateToMonth(currentDate.getMonth(), parseInt(e.target.value))}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          
          <button 
            style={{
              background: '#f7fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.2rem',
              color: '#4a5568'
            }}
            onClick={() => navigateMonth(1)}
          >
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
        
        <button 
          style={{
            background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '25px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          onClick={navigateToToday}
        >
          <i className="bi bi-calendar-day"></i>
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '2rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        position: 'relative'
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '10'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        )}
        
        <div style={{ width: '100%' }}>
          {/* Week Days Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            marginBottom: '1rem'
          }}>
            {weekDays.map(day => (
              <div key={day} style={{
                textAlign: 'center',
                fontWeight: '700',
                color: '#4a5568',
                padding: '1rem',
                fontSize: '1.1rem',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            background: '#e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {calendarDays.map((day, index) => (
              <div
                key={index}
                style={{
                  background: day.isToday 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : !day.isCurrentMonth 
                      ? '#f8f9fa' 
                      : day.holidays.length > 0 
                        ? 'white' 
                        : 'white',
                  minHeight: '120px',
                  padding: '1rem',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  borderLeft: day.holidays.length > 0 ? '4px solid #667eea' : 'none',
                  color: day.isToday ? 'white' : !day.isCurrentMonth ? '#a0aec0' : '#2d3748'
                }}
                onClick={() => handleDateClick(day)}
              >
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  marginBottom: '0.5rem'
                }}>
                  {day.date.getDate()}
                </div>
                
                {day.holidays.length > 0 && (
                  <div style={{
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    {day.holidays.slice(0, 2).map((holiday, idx) => {
                      const typeConfig = getTypeConfig(holiday.holidayType);
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            backgroundColor: typeConfig.color,
                            color: 'white'
                          }}
                          title={holiday.holidayName}
                        >
                          {holiday.holidayName.length > 12 
                            ? holiday.holidayName.substring(0, 12) + '...' 
                            : holiday.holidayName}
                        </div>
                      );
                    })}
                    {day.holidays.length > 2 && (
                      <div style={{
                        fontSize: '0.7rem',
                        color: '#718096',
                        textAlign: 'center',
                        fontStyle: 'italic',
                        marginTop: '0.25rem'
                      }}>
                        +{day.holidays.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

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

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default HolidayCalendar;
