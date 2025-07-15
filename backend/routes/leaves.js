const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const leaveController = require('../controllers/leaveController');

router.get('/types', auth, leaveController.getLeaveTypes);
router.get('/stats', auth, leaveController.getLeaveStats);
router.post('/submit', auth, leaveController.submitLeaveRequest);
router.get('/my-requests', auth, leaveController.getMyLeaveRequests);
router.get('/my-balance', auth, leaveController.getMyLeaveBalance);
router.patch('/cancel/:id', auth, leaveController.cancelLeaveRequest);
router.get('/team-requests', auth, leaveController.getTeamLeaveRequests);
router.patch('/team-approve/:id', auth, leaveController.approveRejectLeaveByTL);
router.get('/hr-requests', auth, leaveController.getHRLeaveRequests);
router.patch('/hr-approve/:id', auth, leaveController.finalApproveRejectLeave);

// Document upload routes
router.post('/:leaveId/documents', auth, upload.array('documents', 5), handleUploadError, leaveController.uploadLeaveDocuments);
router.get('/:leaveId/documents/:fileName', auth, leaveController.downloadLeaveDocument);
router.delete('/:leaveId/documents/:fileName', auth, leaveController.deleteLeaveDocument);

router.get('/:id', auth, leaveController.getLeaveRequestById);

module.exports = router;
