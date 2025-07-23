const express = require('express');
const { body, param, query } = require('express-validator');
const { auth, roleAccess } = require('../middleware/auth');
const { uploadChatAttachments } = require('../middleware/upload');
const {
  getUserChats,
  getOrCreateChat,
  getChatMessages,
  sendMessage,
  getAvailableUsers,
  sendConnectionRequest,
  getConnectionRequests,
  respondToConnectionRequest,
  downloadAttachment,
  viewAttachment
} = require('../controllers/chatController');

const router = express.Router();

// Validation middleware
const validateObjectId = (field) => [
  param(field).isMongoId().withMessage(`Invalid ${field}`)
];

const validateMessage = [
  body('content')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message content cannot exceed 2000 characters')
    .custom((value, { req }) => {
      // Allow empty content if files are present
      const hasFiles = req.files && req.files.files && req.files.files.length > 0;
      if ((!value || value.trim().length === 0) && !hasFiles) {
        throw new Error('Message content or files are required');
      }
      return true;
    })
];

const validateConnectionRequest = [
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Request message cannot exceed 500 characters')
];

const validateConnectionResponse = [
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be either "approve" or "reject"'),
  body('responseMessage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Response message cannot exceed 500 characters')
];

// Configure multer for chat file uploads
const chatUpload = uploadChatAttachments.fields([
  { name: 'files', maxCount: 5 }
]);

// @route   GET /api/chat/chats
// @desc    Get all chats for the authenticated user
// @access  Private
router.get('/chats', auth, getUserChats);

// @route   GET /api/chat/users
// @desc    Get available users to chat with
// @access  Private
router.get('/users', auth, [
  query('search').optional().trim().isLength({ max: 100 }),
  query('role').optional().isIn([
    'Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive',
    'Team Manager', 'Team Leader', 'Employee'
  ])
], getAvailableUsers);

// @route   GET /api/chat/connection-requests
// @desc    Get connection requests received by the user
// @access  Private (Admin/VP roles)
router.get('/connection-requests', auth, roleAccess(['Admin', 'Vice President']), [
  query('status').optional().isIn(['pending', 'approved', 'rejected'])
], getConnectionRequests);

// @route   POST /api/chat/connection-request/:recipientId
// @desc    Send connection request to another user
// @access  Private (Employee role to Admin/VP)
router.post('/connection-request/:recipientId', auth, validateObjectId('recipientId'), validateConnectionRequest, sendConnectionRequest);

// @route   PUT /api/chat/connection-request/:requestId
// @desc    Respond to a connection request
// @access  Private (Admin/VP roles)
router.put('/connection-request/:requestId', auth, roleAccess(['Admin', 'Vice President']), validateObjectId('requestId'), validateConnectionResponse, respondToConnectionRequest);

// @route   GET /api/chat/attachment/:messageId/:fileName
// @desc    Download chat attachment
// @access  Private
router.get('/attachment/:messageId/:fileName', auth, validateObjectId('messageId'), downloadAttachment);

// @route   GET /api/chat/view-attachment/:messageId/:fileName
// @desc    View chat attachment (for images and documents)
// @access  Private
router.get('/view-attachment/:messageId/:fileName', auth, validateObjectId('messageId'), viewAttachment);

// @route   GET /api/chat/:otherUserId
// @desc    Get or create chat with another user
// @access  Private
router.get('/:otherUserId', auth, validateObjectId('otherUserId'), getOrCreateChat);

// @route   GET /api/chat/:chatId/messages
// @desc    Get messages for a specific chat
// @access  Private
router.get('/:chatId/messages', auth, validateObjectId('chatId'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], getChatMessages);

// @route   POST /api/chat/:chatId/messages
// @desc    Send a message in a chat
// @access  Private
router.post('/:chatId/messages', auth, validateObjectId('chatId'), chatUpload, validateMessage, sendMessage);

module.exports = router;
