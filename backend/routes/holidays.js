const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { uploadExcel, handleUploadError } = require('../middleware/upload');
const holidayController = require('../controllers/holidayController');

// Middleware to check if user has admin/HR roles for write operations
const checkAdminOrHR = (req, res, next) => {
  const allowedRoles = ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'];
  
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or HR role required.'
    });
  }
  
  next();
};

// Public routes (for all authenticated users)
router.get('/', auth, holidayController.getHolidays);
router.get('/upcoming', auth, holidayController.getUpcomingHolidays);
router.get('/stats', auth, holidayController.getHolidayStats);

// Excel upload/download routes (MUST be before /:id route)
router.post('/upload-excel', auth, checkAdminOrHR, uploadExcel.single('excelFile'), handleUploadError, holidayController.uploadHolidaysFromExcel);
router.get('/sample-excel', auth, checkAdminOrHR, holidayController.downloadSampleExcel);

// This route MUST be after specific routes like /sample-excel
router.get('/:id', auth, holidayController.getHolidayById);

// Admin/HR only routes
router.post('/', auth, checkAdminOrHR, holidayController.createHoliday);
router.put('/:id', auth, checkAdminOrHR, holidayController.updateHoliday);
router.delete('/:id', auth, checkAdminOrHR, holidayController.deleteHoliday);

module.exports = router;
