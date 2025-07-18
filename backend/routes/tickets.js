const express = require('express');
const router = express.Router();
const { auth, roleAccess } = require('../middleware/auth');
const { uploadTicketAttachments } = require('../middleware/upload');
const {
  createTicket,
  getTickets,
  getTicketById,
  addMessage,
  updateTicketStatus,
  assignTicket,
  escalateTicket,
  submitFeedback,
  resolveTicketByHR,
  confirmTicketByEmployee,
  reopenTicketByEmployee,
  getTicketStats,
  getEligibleHRPersonnel
} = require('../controllers/ticketController');

// All routes require authentication
router.use(auth);

// Create a new ticket - All authenticated users can create tickets
router.post('/', uploadTicketAttachments.array('attachments', 5), createTicket);

// Get tickets with filtering and pagination
router.get('/', getTickets);

// Get ticket statistics
router.get('/stats', getTicketStats);

// Get eligible HR personnel for a category
router.get('/hr-personnel/:category', getEligibleHRPersonnel);

// Get all HR personnel for ticket assignment
router.get('/hr-personnel', getEligibleHRPersonnel);

// Get single ticket by ID with conversation
router.get('/:id', getTicketById);

// Add message to ticket conversation
router.post('/:id/messages', uploadTicketAttachments.array('attachments', 3), addMessage);

// Update ticket status
router.patch('/:id/status', updateTicketStatus);

// Assign ticket to HR personnel - Only HR roles can assign
router.patch('/:id/assign', roleAccess([
  'HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'
]), assignTicket);

// Escalate ticket - HR roles and ticket creator can escalate
router.patch('/:id/escalate', escalateTicket);

// Submit feedback for resolved ticket - Only ticket creator can submit feedback
router.post('/:id/feedback', submitFeedback);

// Resolve ticket by HR - Only HR roles can resolve tickets
router.patch('/:id/resolve', roleAccess([
  'HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'
]), resolveTicketByHR);

// Confirm resolution by Employee - Only ticket creator can confirm
router.patch('/:id/confirm', confirmTicketByEmployee);

// Reopen ticket by Employee - Only ticket creator can reopen
router.patch('/:id/reopen', reopenTicketByEmployee);

module.exports = router;
