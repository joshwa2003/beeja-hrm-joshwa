const Holiday = require('../models/Holiday');

// @desc    Get all holidays with filtering
// @route   GET /api/holidays
// @access  Private
const getHolidays = async (req, res) => {
  try {
    const { year, month, type, page = 1, limit = 50 } = req.query;
    
    // Build query
    let query = { isActive: true };
    
    if (year) {
      query.year = parseInt(year);
    }
    
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    if (type && type !== 'all') {
      query.holidayType = type;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const [holidays, totalCount] = await Promise.all([
      Holiday.find(query)
        .sort({ date: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName'),
      Holiday.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      holidays,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNext: skip + holidays.length < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch holidays',
      error: error.message
    });
  }
};

// @desc    Get upcoming holidays
// @route   GET /api/holidays/upcoming
// @access  Private
const getUpcomingHolidays = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const holidays = await Holiday.getUpcomingHolidays(parseInt(limit));
    
    res.json({
      success: true,
      holidays,
      count: holidays.length
    });
  } catch (error) {
    console.error('Get upcoming holidays error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming holidays',
      error: error.message
    });
  }
};

// @desc    Get holiday by ID
// @route   GET /api/holidays/:id
// @access  Private
const getHolidayById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const holiday = await Holiday.findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');
    
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    res.json({
      success: true,
      holiday
    });
  } catch (error) {
    console.error('Get holiday by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch holiday',
      error: error.message
    });
  }
};

// @desc    Create new holiday
// @route   POST /api/holidays
// @access  Private (Admin, HR roles only)
const createHoliday = async (req, res) => {
  try {
    const { holidayName, date, holidayType, description } = req.body;
    
    // Validate required fields
    if (!holidayName || !date || !holidayType) {
      return res.status(400).json({
        success: false,
        message: 'Holiday name, date, and type are required'
      });
    }
    
    // Check if holiday already exists on the same date
    const existingHoliday = await Holiday.findOne({
      date: new Date(date),
      isActive: true
    });
    
    if (existingHoliday) {
      return res.status(400).json({
        success: false,
        message: 'A holiday already exists on this date'
      });
    }
    
    // Create new holiday
    const holiday = new Holiday({
      holidayName: holidayName.trim(),
      date: new Date(date),
      holidayType,
      description: description?.trim(),
      createdBy: req.user._id
    });
    
    await holiday.save();
    
    // Populate creator info for response
    await holiday.populate('createdBy', 'firstName lastName email');
    
    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      holiday
    });
  } catch (error) {
    console.error('Create holiday error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A holiday with this name already exists on the same date'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create holiday',
      error: error.message
    });
  }
};

// @desc    Update holiday
// @route   PUT /api/holidays/:id
// @access  Private (Admin, HR roles only)
const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { holidayName, date, holidayType, description } = req.body;
    
    const holiday = await Holiday.findById(id);
    
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    // Check if updating date conflicts with existing holiday
    if (date && new Date(date).getTime() !== holiday.date.getTime()) {
      const existingHoliday = await Holiday.findOne({
        _id: { $ne: id },
        date: new Date(date),
        isActive: true
      });
      
      if (existingHoliday) {
        return res.status(400).json({
          success: false,
          message: 'Another holiday already exists on this date'
        });
      }
    }
    
    // Update fields
    if (holidayName) holiday.holidayName = holidayName.trim();
    if (date) holiday.date = new Date(date);
    if (holidayType) holiday.holidayType = holidayType;
    if (description !== undefined) holiday.description = description?.trim();
    
    holiday.updatedBy = req.user._id;
    
    await holiday.save();
    
    // Populate user info for response
    await holiday.populate([
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'updatedBy', select: 'firstName lastName email' }
    ]);
    
    res.json({
      success: true,
      message: 'Holiday updated successfully',
      holiday
    });
  } catch (error) {
    console.error('Update holiday error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A holiday with this name already exists on the same date'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update holiday',
      error: error.message
    });
  }
};

// @desc    Delete holiday (soft delete)
// @route   DELETE /api/holidays/:id
// @access  Private (Admin, HR roles only)
const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    
    const holiday = await Holiday.findById(id);
    
    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }
    
    // Soft delete by setting isActive to false
    holiday.isActive = false;
    holiday.updatedBy = req.user._id;
    
    await holiday.save();
    
    res.json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    console.error('Delete holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete holiday',
      error: error.message
    });
  }
};

// @desc    Bulk create holidays
// @route   POST /api/holidays/bulk
// @access  Private (Admin, HR roles only)
const bulkCreateHolidays = async (req, res) => {
  try {
    const { holidays } = req.body;
    
    if (!Array.isArray(holidays) || holidays.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Holidays array is required and cannot be empty'
      });
    }
    
    const createdHolidays = [];
    const errors = [];
    
    for (let i = 0; i < holidays.length; i++) {
      try {
        const { holidayName, date, holidayType, description } = holidays[i];
        
        // Validate required fields
        if (!holidayName || !date || !holidayType) {
          errors.push({
            index: i,
            error: 'Holiday name, date, and type are required'
          });
          continue;
        }
        
        // Check if holiday already exists
        const existingHoliday = await Holiday.findOne({
          date: new Date(date),
          isActive: true
        });
        
        if (existingHoliday) {
          errors.push({
            index: i,
            error: `Holiday already exists on ${date}`
          });
          continue;
        }
        
        // Create holiday
        const holiday = new Holiday({
          holidayName: holidayName.trim(),
          date: new Date(date),
          holidayType,
          description: description?.trim(),
          createdBy: req.user._id
        });
        
        await holiday.save();
        createdHolidays.push(holiday);
        
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: `Successfully created ${createdHolidays.length} holidays`,
      createdCount: createdHolidays.length,
      errorCount: errors.length,
      createdHolidays,
      errors
    });
  } catch (error) {
    console.error('Bulk create holidays error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk create holidays',
      error: error.message
    });
  }
};

// @desc    Get holiday statistics
// @route   GET /api/holidays/stats
// @access  Private
const getHolidayStats = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const stats = await Holiday.aggregate([
      {
        $match: {
          year: parseInt(year),
          isActive: true
        }
      },
      {
        $group: {
          _id: '$holidayType',
          count: { $sum: 1 },
          holidays: {
            $push: {
              holidayName: '$holidayName',
              date: '$date',
              day: '$day'
            }
          }
        }
      }
    ]);
    
    const totalHolidays = await Holiday.countDocuments({
      year: parseInt(year),
      isActive: true
    });
    
    const upcomingHolidays = await Holiday.getUpcomingHolidays(3);
    
    res.json({
      success: true,
      year: parseInt(year),
      totalHolidays,
      holidaysByType: stats,
      upcomingHolidays
    });
  } catch (error) {
    console.error('Get holiday stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch holiday statistics',
      error: error.message
    });
  }
};

module.exports = {
  getHolidays,
  getUpcomingHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  bulkCreateHolidays,
  getHolidayStats
};
