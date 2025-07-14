const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
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

module.exports = router;
