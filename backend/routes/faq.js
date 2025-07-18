const express = require('express');
const router = express.Router();
const { auth, roleAccess } = require('../middleware/auth');
const { uploadTicketAttachments } = require('../middleware/upload');
const {
  createFAQ,
  getFAQs,
  getFAQById,
  updateFAQ,
  deleteFAQ,
  submitFAQFeedback,
  getPopularFAQs,
  getFAQsByCategory,
  getFAQCategories,
  searchFAQs,
  getFAQStats
} = require('../controllers/faqController');

// All routes require authentication
router.use(auth);

// Search FAQs
router.get('/search', searchFAQs);

// Get popular FAQs
router.get('/popular', getPopularFAQs);

// Get FAQ categories with counts
router.get('/categories', getFAQCategories);

// Get FAQ statistics - HR roles only
router.get('/stats', roleAccess([
  'HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'
]), getFAQStats);

// Get FAQs by category
router.get('/category/:category', getFAQsByCategory);

// Create a new FAQ - HR roles only
router.post('/', roleAccess([
  'HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'
]), uploadTicketAttachments.array('attachments', 3), createFAQ);

// Get all FAQs with filtering and pagination
router.get('/', getFAQs);

// Get single FAQ by ID
router.get('/:id', getFAQById);

// Update FAQ - HR roles only
router.put('/:id', roleAccess([
  'HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'
]), uploadTicketAttachments.array('attachments', 3), updateFAQ);

// Delete FAQ - HR Manager and above only
router.delete('/:id', roleAccess([
  'HR Manager', 'HR BP', 'Vice President', 'Admin'
]), deleteFAQ);

// Submit feedback for FAQ - All authenticated users
router.post('/:id/feedback', submitFAQFeedback);

module.exports = router;
