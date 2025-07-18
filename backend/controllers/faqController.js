const FAQ = require('../models/FAQ');
const mongoose = require('mongoose');

// Create a new FAQ
const createFAQ = async (req, res) => {
  try {
    const { 
      question, 
      answer, 
      category, 
      subcategory, 
      tags, 
      isPublic, 
      visibleToRoles, 
      keywords,
      priority 
    } = req.body;
    
    // Validate required fields
    if (!question || !answer || !category) {
      return res.status(400).json({
        message: 'Question, answer, and category are required'
      });
    }
    
    // Check permissions - only HR roles can create FAQs
    const hrRoles = ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'];
    if (!hrRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. HR role required.' });
    }
    
    // Create FAQ
    const faq = new FAQ({
      question: question.trim(),
      answer: answer.trim(),
      category,
      subcategory: subcategory?.trim(),
      tags: tags || [],
      isPublic: isPublic !== undefined ? isPublic : true,
      visibleToRoles: visibleToRoles || [
        'Admin', 'Vice President', 'HR BP', 'HR Manager', 
        'HR Executive', 'Team Manager', 'Team Leader', 'Employee'
      ],
      keywords: keywords || [],
      priority: priority || 0,
      createdBy: req.user._id,
      status: 'Published' // Auto-publish for HR roles
    });
    
    await faq.save();
    
    // Populate for response
    const populatedFAQ = await FAQ.findById(faq._id)
      .populate('createdBy', 'firstName lastName role');
    
    res.status(201).json({
      message: 'FAQ created successfully',
      faq: populatedFAQ
    });
    
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({
      message: 'Error creating FAQ',
      error: error.message
    });
  }
};

// Get FAQs with filtering and search
const getFAQs = async (req, res) => {
  try {
    const { 
      category, 
      search, 
      page = 1, 
      limit = 10, 
      sortBy = 'priority',
      includeUnpublished = false 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {
      visibleToRoles: req.user.role
    };
    
    // Only HR roles can see unpublished FAQs
    const hrRoles = ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'];
    if (!includeUnpublished || !hrRoles.includes(req.user.role)) {
      query.status = 'Published';
    }
    
    if (category) {
      query.category = category;
    }
    
    let faqs;
    
    if (search && search.trim()) {
      // Use text search
      faqs = await FAQ.searchFAQs(search, req.user.role, {
        category,
        limit: parseInt(limit),
        skip,
        sortBy
      });
    } else {
      // Regular query
      const sort = {};
      switch (sortBy) {
        case 'popularity':
          sort.viewCount = -1;
          sort.helpfulCount = -1;
          break;
        case 'recent':
          sort.createdAt = -1;
          break;
        default:
          sort.priority = -1;
          sort.displayOrder = 1;
      }
      
      faqs = await FAQ.find(query)
        .populate('createdBy', 'firstName lastName role')
        .populate('lastModifiedBy', 'firstName lastName role')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));
    }
    
    // Get total count for pagination
    const total = await FAQ.countDocuments(query);
    
    res.json({
      faqs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({
      message: 'Error fetching FAQs',
      error: error.message
    });
  }
};

// Get single FAQ by ID
const getFAQById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid FAQ ID' });
    }
    
    const faq = await FAQ.findById(id)
      .populate('createdBy', 'firstName lastName role')
      .populate('lastModifiedBy', 'firstName lastName role')
      .populate('relatedFAQs', 'question category viewCount');
    
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    
    // Check visibility
    if (!faq.visibleToRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Record view
    await faq.recordView();
    
    // Get related FAQs
    const relatedFAQs = await FAQ.getRelatedFAQs(faq._id, req.user.role, 5);
    
    res.json({
      faq,
      relatedFAQs
    });
    
  } catch (error) {
    console.error('Error fetching FAQ:', error);
    res.status(500).json({
      message: 'Error fetching FAQ',
      error: error.message
    });
  }
};

// Update FAQ
const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      question, 
      answer, 
      category, 
      subcategory, 
      tags, 
      isPublic, 
      visibleToRoles, 
      keywords,
      priority,
      status 
    } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid FAQ ID' });
    }
    
    // Check permissions - only HR roles can update FAQs
    const hrRoles = ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'];
    if (!hrRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. HR role required.' });
    }
    
    const faq = await FAQ.findById(id);
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    
    // Update fields
    if (question) faq.question = question.trim();
    if (answer) faq.answer = answer.trim();
    if (category) faq.category = category;
    if (subcategory !== undefined) faq.subcategory = subcategory?.trim();
    if (tags) faq.tags = tags;
    if (isPublic !== undefined) faq.isPublic = isPublic;
    if (visibleToRoles) faq.visibleToRoles = visibleToRoles;
    if (keywords) faq.keywords = keywords;
    if (priority !== undefined) faq.priority = priority;
    if (status) faq.status = status;
    
    faq.lastModifiedBy = req.user._id;
    
    await faq.save();
    
    // Populate for response
    const populatedFAQ = await FAQ.findById(faq._id)
      .populate('createdBy', 'firstName lastName role')
      .populate('lastModifiedBy', 'firstName lastName role');
    
    res.json({
      message: 'FAQ updated successfully',
      faq: populatedFAQ
    });
    
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({
      message: 'Error updating FAQ',
      error: error.message
    });
  }
};

// Delete FAQ
const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid FAQ ID' });
    }
    
    // Check permissions - only HR Manager and above can delete FAQs
    const authorizedRoles = ['HR Manager', 'HR BP', 'Vice President', 'Admin'];
    if (!authorizedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. HR Manager role or higher required.' });
    }
    
    const faq = await FAQ.findById(id);
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    
    await FAQ.findByIdAndDelete(id);
    
    res.json({
      message: 'FAQ deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({
      message: 'Error deleting FAQ',
      error: error.message
    });
  }
};

// Submit feedback for FAQ
const submitFAQFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { isHelpful, comment } = req.body;
    
    if (isHelpful === undefined) {
      return res.status(400).json({ message: 'Feedback (isHelpful) is required' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid FAQ ID' });
    }
    
    const faq = await FAQ.findById(id);
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    
    // Check visibility
    if (!faq.visibleToRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Record feedback
    await faq.recordFeedback(req.user._id, isHelpful, comment);
    
    res.json({
      message: 'Feedback submitted successfully',
      helpfulnessRatio: faq.helpfulnessRatio
    });
    
  } catch (error) {
    console.error('Error submitting FAQ feedback:', error);
    res.status(500).json({
      message: 'Error submitting feedback',
      error: error.message
    });
  }
};

// Get popular FAQs
const getPopularFAQs = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const popularFAQs = await FAQ.getPopularFAQs(req.user.role, parseInt(limit));
    
    res.json({
      faqs: popularFAQs
    });
    
  } catch (error) {
    console.error('Error fetching popular FAQs:', error);
    res.status(500).json({
      message: 'Error fetching popular FAQs',
      error: error.message
    });
  }
};

// Get FAQs by category
const getFAQsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;
    
    const faqs = await FAQ.getFAQsByCategory(category, req.user.role, parseInt(limit));
    
    res.json({
      category,
      faqs
    });
    
  } catch (error) {
    console.error('Error fetching FAQs by category:', error);
    res.status(500).json({
      message: 'Error fetching FAQs by category',
      error: error.message
    });
  }
};

// Get FAQ categories with counts
const getFAQCategories = async (req, res) => {
  try {
    const categories = await FAQ.aggregate([
      {
        $match: {
          status: 'Published',
          visibleToRoles: req.user.role
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgViews: { $avg: '$viewCount' },
          avgHelpfulness: { $avg: '$helpfulnessRatio' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    res.json({
      categories
    });
    
  } catch (error) {
    console.error('Error fetching FAQ categories:', error);
    res.status(500).json({
      message: 'Error fetching FAQ categories',
      error: error.message
    });
  }
};

// Search FAQs with advanced options
const searchFAQs = async (req, res) => {
  try {
    const { 
      q: query, 
      category, 
      tags, 
      limit = 10, 
      page = 1,
      sortBy = 'relevance' 
    } = req.query;
    
    if (!query || !query.trim()) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const skip = (page - 1) * limit;
    
    const results = await FAQ.searchFAQs(query, req.user.role, {
      category,
      limit: parseInt(limit),
      skip,
      sortBy
    });
    
    // Get total count for the search
    const totalQuery = {
      status: 'Published',
      visibleToRoles: req.user.role,
      $text: { $search: query }
    };
    
    if (category) totalQuery.category = category;
    
    const total = await FAQ.countDocuments(totalQuery);
    
    res.json({
      query,
      results,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error searching FAQs:', error);
    res.status(500).json({
      message: 'Error searching FAQs',
      error: error.message
    });
  }
};

// Get FAQ statistics
const getFAQStats = async (req, res) => {
  try {
    // Check permissions - only HR roles can view stats
    const hrRoles = ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'];
    if (!hrRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. HR role required.' });
    }
    
    const stats = await FAQ.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: { $sum: { $cond: [{ $eq: ['$status', 'Published'] }, 1, 0] } },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'Draft'] }, 1, 0] } },
          archived: { $sum: { $cond: [{ $eq: ['$status', 'Archived'] }, 1, 0] } },
          totalViews: { $sum: '$viewCount' },
          avgViews: { $avg: '$viewCount' },
          totalHelpful: { $sum: '$helpfulCount' },
          totalNotHelpful: { $sum: '$notHelpfulCount' }
        }
      }
    ]);
    
    // Get category breakdown
    const categoryStats = await FAQ.aggregate([
      {
        $match: { status: 'Published' }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          avgHelpfulness: { 
            $avg: { 
              $cond: [
                { $gt: [{ $add: ['$helpfulCount', '$notHelpfulCount'] }, 0] },
                { $multiply: [{ $divide: ['$helpfulCount', { $add: ['$helpfulCount', '$notHelpfulCount'] }] }, 100] },
                0
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get most viewed FAQs
    const mostViewed = await FAQ.find({ status: 'Published' })
      .sort({ viewCount: -1 })
      .limit(5)
      .select('question category viewCount helpfulCount notHelpfulCount')
      .populate('createdBy', 'firstName lastName');
    
    res.json({
      overview: stats[0] || {
        total: 0, published: 0, draft: 0, archived: 0,
        totalViews: 0, avgViews: 0, totalHelpful: 0, totalNotHelpful: 0
      },
      categoryBreakdown: categoryStats,
      mostViewed
    });
    
  } catch (error) {
    console.error('Error fetching FAQ stats:', error);
    res.status(500).json({
      message: 'Error fetching FAQ statistics',
      error: error.message
    });
  }
};

module.exports = {
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
};
