const Holiday = require('../models/Holiday');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

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

// @desc    Upload holidays from Excel file
// @route   POST /api/holidays/upload-excel
// @access  Private (Admin, HR roles only)
const uploadHolidaysFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded'
      });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or has no valid data'
      });
    }

    const createdHolidays = [];
    const errors = [];
    const alreadyExists = [];

    for (let i = 0; i < jsonData.length; i++) {
      try {
        const row = jsonData[i];
        
        // Map Excel columns to our schema (simplified - removed applicability fields)
        const holidayName = row['Holiday Name'] || row['holidayName'] || row['name'];
        const date = row['Date'] || row['date'];
        const holidayType = row['Holiday Type'] || row['holidayType'] || row['type'] || 'Public';
        const description = row['Description'] || row['description'] || '';

        // Validate required fields
        if (!holidayName || !date) {
          errors.push({
            row: i + 1,
            error: 'Holiday name and date are required'
          });
          continue;
        }

        // Parse date
        let parsedDate;
        if (typeof date === 'number') {
          // Excel date serial number
          parsedDate = new Date((date - 25569) * 86400 * 1000);
        } else {
          parsedDate = new Date(date);
        }

        if (isNaN(parsedDate.getTime())) {
          errors.push({
            row: i + 1,
            error: 'Invalid date format'
          });
          continue;
        }

        // Check if holiday already exists
        const existingHoliday = await Holiday.findOne({
          holidayName: holidayName.trim(),
          date: parsedDate,
          isActive: true
        });

        if (existingHoliday) {
          alreadyExists.push({
            row: i + 1,
            holidayName: holidayName.trim(),
            date: parsedDate.toDateString(),
            message: `Holiday "${holidayName}" already exists on ${parsedDate.toDateString()}`
          });
          continue;
        }

        // Create holiday (simplified - removed applicability fields)
        const holiday = new Holiday({
          holidayName: holidayName.trim(),
          date: parsedDate,
          holidayType: holidayType || 'Public',
          description: description?.trim() || '',
          uploadedFrom: 'excel',
          createdBy: req.user._id
        });

        await holiday.save();
        createdHolidays.push(holiday);

      } catch (error) {
        errors.push({
          row: i + 1,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.status(201).json({
      success: true,
      message: `Successfully processed ${jsonData.length} rows. Created ${createdHolidays.length} holidays.`,
      totalRows: jsonData.length,
      createdCount: createdHolidays.length,
      errorCount: errors.length,
      alreadyExistsCount: alreadyExists.length,
      createdHolidays,
      errors,
      alreadyExists
    });

  } catch (error) {
    console.error('Upload holidays from Excel error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process Excel file',
      error: error.message
    });
  }
};

// @desc    Download sample Excel file for holidays
// @route   GET /api/holidays/sample-excel
// @access  Private (Admin, HR roles only)
const downloadSampleExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Holiday Template');

    // Define columns (simplified - removed applicability fields)
    worksheet.columns = [
      { header: 'Holiday Name', key: 'holidayName', width: 25 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Holiday Type', key: 'holidayType', width: 20 },
      { header: 'Description', key: 'description', width: 40 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add sample data (simplified - removed applicability fields)
    const sampleData = [
      {
        holidayName: 'Independence Day',
        date: '2024-08-15',
        holidayType: 'Public',
        description: 'National Holiday - Independence Day of India'
      },
      {
        holidayName: 'Diwali',
        date: '2024-11-01',
        holidayType: 'Public',
        description: 'Festival of Lights'
      },
      {
        holidayName: 'Christmas',
        date: '2024-12-25',
        holidayType: 'Public',
        description: 'Christmas Day'
      },
      {
        holidayName: 'New Year',
        date: '2025-01-01',
        holidayType: 'Public',
        description: 'New Year Day'
      }
    ];

    // Add sample rows
    sampleData.forEach(data => {
      worksheet.addRow(data);
    });

    // Add instructions worksheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.columns = [
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Description', key: 'description', width: 60 },
      { header: 'Example', key: 'example', width: 30 }
    ];

    // Style instructions header
    instructionsSheet.getRow(1).font = { bold: true };
    instructionsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Updated instructions (removed applicability fields)
    const instructions = [
      {
        field: 'Holiday Name',
        description: 'Name of the holiday (Required)',
        example: 'Independence Day'
      },
      {
        field: 'Date',
        description: 'Date of the holiday in YYYY-MM-DD format (Required)',
        example: '2024-08-15'
      },
      {
        field: 'Holiday Type',
        description: 'Type: Public, Optional/Floating, Company-Specific',
        example: 'Public'
      },
      {
        field: 'Description',
        description: 'Brief description of the holiday (Optional)',
        example: 'National Holiday'
      }
    ];

    instructions.forEach(instruction => {
      instructionsSheet.addRow(instruction);
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=holiday_template.xlsx');

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Download sample Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sample Excel file',
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
  getHolidayStats,
  uploadHolidaysFromExcel,
  downloadSampleExcel
};
