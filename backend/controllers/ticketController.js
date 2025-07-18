const Ticket = require('../models/Ticket');
const TicketMessage = require('../models/TicketMessage');
const FAQ = require('../models/FAQ');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper function to get categories that each HR role can handle
const getHRRoleCategories = (role) => {
  const routingRules = {
    'Leave Issue': ['HR Executive'],
    'Attendance Issue': ['HR Executive'],
    'Regularization Problem': ['HR Executive'],
    'Holiday Calendar Query': ['HR Executive'],
    'WFH / Remote Work Requests': ['HR Executive'],
    'Leave Policy Clarification': ['HR Executive', 'HR Manager'],
    'Payroll / Salary Issue': ['HR Manager'],
    'Payslip Not Available': ['HR Manager'],
    'Reimbursement Issue': ['HR Manager'],
    'Tax / TDS / Form-16': ['HR Manager'],
    'Performance Review Concern': ['HR BP'],
    'KPI / Goals Setup Issue': ['HR Manager'],
    'Probation / Confirmation': ['HR Executive'],
    'Training / LMS Access Issue': ['HR Executive'],
    'Certification Issue': ['HR Manager'],
    'Offer Letter / Joining Issue': ['HR BP'],
    'Referral / Interview Feedback': ['HR Executive'],
    'Resignation Process Query': ['HR Manager'],
    'Final Settlement Delay': ['HR BP'],
    'Experience Letter Request': ['HR Executive'],
    'Document Upload Failed': ['HR Executive'],
    'General HR Query': ['HR Executive'],
    'Harassment / Grievance': ['HR BP'],
    'Feedback / Suggestion to HR': ['HR Manager', 'HR BP'],
    'Others': ['HR Executive']
  };

  const categories = [];
  for (const [category, eligibleRoles] of Object.entries(routingRules)) {
    if (eligibleRoles.includes(role)) {
      categories.push(category);
    }
  }
  
  return categories;
};

// Create a new ticket
const createTicket = async (req, res) => {
  try {
    const { subject, description, category, subcategory, priority, assignedTo } = req.body;
    
    // Validate required fields
    if (!subject || !description || !category) {
      return res.status(400).json({
        message: 'Subject, description, and category are required'
      });
    }
    
    // If assignedTo is provided, validate that the user exists and has appropriate HR role
    if (assignedTo) {
      const hrUser = await User.findById(assignedTo);
      if (!hrUser) {
        return res.status(400).json({
          message: 'Selected HR personnel not found'
        });
      }
      
      const hrRoles = ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'];
      if (!hrRoles.includes(hrUser.role)) {
        return res.status(400).json({
          message: 'Selected user is not HR personnel'
        });
      }
      
      // Allow employees to override default assignment - no category validation needed
      // This enables employees to assign tickets to any HR personnel they choose
    }
    
    // Process uploaded files
    let processedAttachments = [];
    if (req.files && req.files.length > 0) {
      processedAttachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: `ticket-attachments/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: req.user._id,
        uploadedAt: new Date()
      }));
    }
    
    // Create ticket
    const ticket = new Ticket({
      subject: subject.trim(),
      description: description.trim(),
      category,
      subcategory: subcategory?.trim(),
      priority: priority || 'Medium',
      createdBy: req.user._id,
      attachments: processedAttachments,
      assignedTo: assignedTo || undefined, // Set manually assigned HR or let auto-assignment handle it
      isManuallyAssigned: !!assignedTo // Set flag to true if manually assigned
    });
    
    // Set confidential flag for sensitive categories
    const confidentialCategories = ['Harassment / Grievance'];
    if (confidentialCategories.includes(category)) {
      ticket.isConfidential = true;
    }
    
    await ticket.save();
    
    // Create initial system message
    await TicketMessage.createSystemMessage(ticket._id, 'ticket_created', {
      assigneeName: ticket.assignedTo ? 'Assigned HR personnel' : 'HR team',
      triggeredBy: req.user._id
    });
    
    // Populate ticket data for response
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('createdBy', 'firstName lastName email role')
      .populate('assignedTo', 'firstName lastName email role');
    
    // Get suggested FAQs
    const suggestedFAQs = await FAQ.suggestForTicket(
      category, 
      subject, 
      description, 
      req.user.role, 
      3
    );
    
    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: populatedTicket,
      suggestedFAQs
    });
    
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      message: 'Error creating ticket',
      error: error.message
    });
  }
};

// Get tickets based on user role and permissions
const getTickets = async (req, res) => {
  try {
    const { 
      status, 
      category, 
      priority, 
      assignedTo, 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    // Build query based on user role
    let query = {};
    
    // Role-based access control
    switch (req.user.role) {
      case 'Employee':
        // Employees can only see their own tickets
        query.createdBy = req.user._id;
        break;
        
      case 'Team Leader':
        // Team leaders can see their own tickets and their team's tickets
        const teamMembers = await User.find({ 
          reportingManager: req.user._id 
        }).select('_id');
        const memberIds = teamMembers.map(member => member._id);
        query.$or = [
          { createdBy: req.user._id },
          { createdBy: { $in: memberIds } }
        ];
        break;
        
      case 'Team Manager':
        // Team managers can see tickets from their managed teams
        const managedTeamMembers = await User.find({
          $or: [
            { reportingManager: req.user._id },
            { team: { $in: req.user.managedTeams || [] } }
          ]
        }).select('_id');
        const managedMemberIds = managedTeamMembers.map(member => member._id);
        query.$or = [
          { createdBy: req.user._id },
          { createdBy: { $in: managedMemberIds } }
        ];
        break;
        
      case 'HR Executive':
      case 'HR Manager':
      case 'HR BP':
      case 'Vice President':
      case 'Admin':
        // HR roles can only see tickets assigned to their role based on category routing
        const hrRoleCategories = getHRRoleCategories(req.user.role);
        
        if (req.user.role === 'HR Executive') {
          // HR Executives can see tickets in their categories (non-confidential and not manually assigned) or assigned to them
          query.$or = [
            { 
              category: { $in: hrRoleCategories },
              isConfidential: false,
              isManuallyAssigned: false
            },
            { assignedTo: req.user._id }
          ];
        } else if (req.user.role === 'HR Manager') {
          // HR Managers can see tickets in their categories (not manually assigned) or assigned to them
          query.$or = [
            { 
              category: { $in: hrRoleCategories },
              isManuallyAssigned: false
            },
            { assignedTo: req.user._id }
          ];
        } else if (req.user.role === 'HR BP') {
          // HR BP can see tickets in their categories (including confidential, not manually assigned) or assigned to them
          query.$or = [
            { 
              category: { $in: hrRoleCategories },
              isManuallyAssigned: false
            },
            { assignedTo: req.user._id }
          ];
        } else {
          // Vice President and Admin can see all tickets
          // Keep existing behavior for these roles
        }
        break;
        
      default:
        query.createdBy = req.user._id;
    }
    
    // Apply filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    
    // Apply search
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { subject: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { ticketNumber: { $regex: search, $options: 'i' } }
        ]
      });
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const tickets = await Ticket.find(query)
      .populate('createdBy', 'firstName lastName email role')
      .populate('assignedTo', 'firstName lastName email role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Ticket.countDocuments(query);
    
    res.json({
      tickets,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      message: 'Error fetching tickets',
      error: error.message
    });
  }
};

// Get single ticket with conversation
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }
    
    // Find ticket
    const ticket = await Ticket.findById(id)
      .populate('createdBy', 'firstName lastName email role profilePhoto')
      .populate('assignedTo', 'firstName lastName email role profilePhoto')
      .populate('watchers', 'firstName lastName email role')
      .populate('relatedTickets', 'ticketNumber subject status');
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check access permissions
    const hasAccess = await checkTicketAccess(ticket, req.user);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get conversation
    const conversation = await TicketMessage.getConversation(
      ticket._id, 
      req.user._id, 
      true // Include internal messages for HR roles
    );
    
    // Get related FAQs
    const relatedFAQs = await FAQ.suggestForTicket(
      ticket.category,
      ticket.subject,
      ticket.description,
      req.user.role,
      3
    );
    
    res.json({
      ticket,
      conversation,
      relatedFAQs
    });
    
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      message: 'Error fetching ticket',
      error: error.message
    });
  }
};

// Add message to ticket
const addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, messageType = 'user_message', isInternal = false } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    // Find ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check access permissions
    const hasAccess = await checkTicketAccess(ticket, req.user);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Determine message type based on user role
    let finalMessageType = messageType;
    const hrRoles = ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'];
    
    if (hrRoles.includes(req.user.role) && messageType === 'user_message') {
      finalMessageType = 'hr_response';
    }
    
    // Process uploaded files for message attachments
    let processedAttachments = [];
    if (req.files && req.files.length > 0) {
      processedAttachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: `ticket-attachments/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: req.user._id,
        uploadedAt: new Date()
      }));
    }
    
    // Create message
    const ticketMessage = new TicketMessage({
      ticket: ticket._id,
      message: message.trim(),
      messageType: finalMessageType,
      author: req.user._id,
      isInternal: isInternal && hrRoles.includes(req.user.role), // Only HR can create internal messages
      attachments: processedAttachments
    });
    
    await ticketMessage.save();
    
    // Reset closure status if there's a new message after HR closed
    if (ticket.closureStatus && ticket.closureStatus.hrClosed) {
      ticket.resetClosureOnNewMessage();
      await ticket.save();
    }
    
    // Populate message for response
    const populatedMessage = await TicketMessage.findById(ticketMessage._id)
      .populate('author', 'firstName lastName role profilePhoto');
    
    res.status(201).json({
      message: 'Message added successfully',
      ticketMessage: populatedMessage
    });
    
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      message: 'Error adding message',
      error: error.message
    });
  }
};

// Update ticket status
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    const validStatuses = ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed', 'Escalated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Find ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check permissions - only HR roles and ticket creator can update status
    const canUpdate = await checkTicketUpdateAccess(ticket, req.user);
    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const previousStatus = ticket.status;
    
    // Update status and related fields
    ticket.status = status;
    
    if (status === 'Resolved' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }
    
    if (status === 'Closed' && !ticket.closedAt) {
      ticket.closedAt = new Date();
      
      // Mark as permanently closed by HR when status is manually set to "Closed"
      // This prevents employee from reopening the ticket
      ticket.resolutionStatus.permanentlyClosedByHR = true;
      ticket.resolutionStatus.permanentlyClosedAt = new Date();
      ticket.resolutionStatus.permanentlyClosedBy = req.user._id;
    }
    
    await ticket.save();
    
    // Create system message
    await TicketMessage.createSystemMessage(ticket._id, 'status_changed', {
      previousValue: previousStatus,
      newValue: status,
      triggeredBy: req.user._id
    });
    
    // If there's a reason, add it as an internal note
    if (reason && reason.trim()) {
      await TicketMessage.create({
        ticket: ticket._id,
        message: `Status update reason: ${reason.trim()}`,
        messageType: 'internal_note',
        author: req.user._id,
        isInternal: true
      });
    }
    
    res.json({
      message: 'Ticket status updated successfully',
      ticket: await Ticket.findById(ticket._id)
        .populate('createdBy', 'firstName lastName email role')
        .populate('assignedTo', 'firstName lastName email role')
    });
    
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({
      message: 'Error updating ticket status',
      error: error.message
    });
  }
};

// Assign ticket to HR personnel
const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, reason } = req.body;
    
    // Find ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check permissions - only HR roles can assign tickets
    const hrRoles = ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'];
    if (!hrRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Validate assignee
    const assignee = await User.findById(assignedTo);
    if (!assignee || !hrRoles.includes(assignee.role)) {
      return res.status(400).json({ message: 'Invalid assignee' });
    }
    
    const previousAssignee = ticket.assignedTo;
    ticket.assignedTo = assignedTo;
    
    await ticket.save();
    
    // Create system message
    const action = previousAssignee ? 'reassigned' : 'assigned';
    const messageData = {
      assigneeName: `${assignee.firstName} ${assignee.lastName}`,
      triggeredBy: req.user._id
    };
    
    if (previousAssignee) {
      const prevAssignee = await User.findById(previousAssignee);
      messageData.previousAssignee = `${prevAssignee.firstName} ${prevAssignee.lastName}`;
      messageData.newAssignee = messageData.assigneeName;
    }
    
    await TicketMessage.createSystemMessage(ticket._id, action, messageData);
    
    // Add reason as internal note if provided
    if (reason && reason.trim()) {
      await TicketMessage.create({
        ticket: ticket._id,
        message: `Assignment reason: ${reason.trim()}`,
        messageType: 'internal_note',
        author: req.user._id,
        isInternal: true
      });
    }
    
    res.json({
      message: 'Ticket assigned successfully',
      ticket: await Ticket.findById(ticket._id)
        .populate('createdBy', 'firstName lastName email role')
        .populate('assignedTo', 'firstName lastName email role')
    });
    
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({
      message: 'Error assigning ticket',
      error: error.message
    });
  }
};

// Escalate ticket
const escalateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Find ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check permissions
    const canEscalate = await checkTicketUpdateAccess(ticket, req.user);
    if (!canEscalate) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Attempt escalation
    const escalated = await ticket.escalate(req.user._id, reason, false);
    
    if (!escalated) {
      return res.status(400).json({ 
        message: 'Cannot escalate ticket further or no higher role available' 
      });
    }
    
    res.json({
      message: 'Ticket escalated successfully',
      ticket: await Ticket.findById(ticket._id)
        .populate('createdBy', 'firstName lastName email role')
        .populate('assignedTo', 'firstName lastName email role')
    });
    
  } catch (error) {
    console.error('Error escalating ticket:', error);
    res.status(500).json({
      message: 'Error escalating ticket',
      error: error.message
    });
  }
};

// Submit feedback for resolved ticket
const submitFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    // Find ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check if user is the ticket creator
    if (ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only ticket creator can submit feedback' });
    }
    
    // Check if ticket is resolved
    if (ticket.status !== 'Resolved' && ticket.status !== 'Closed') {
      return res.status(400).json({ message: 'Can only provide feedback for resolved tickets' });
    }
    
    // Update feedback
    ticket.feedback = {
      rating: parseInt(rating),
      comment: comment?.trim() || '',
      submittedAt: new Date()
    };
    
    await ticket.save();
    
    // Create system message
    await TicketMessage.createSystemMessage(ticket._id, 'feedback_submitted', {
      rating: rating,
      triggeredBy: req.user._id
    });
    
    res.json({
      message: 'Feedback submitted successfully',
      feedback: ticket.feedback
    });
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      message: 'Error submitting feedback',
      error: error.message
    });
  }
};

// Resolve ticket by HR
const resolveTicketByHR = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionComment } = req.body;
    
    // Find ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check if user has HR role
    const hrRoles = ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'];
    if (!hrRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Only HR personnel can resolve tickets' });
    }
    
    // Check access permissions
    const hasAccess = await checkTicketAccess(ticket, req.user);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Resolve ticket by HR
    await ticket.resolveByHR(req.user._id, resolutionComment);
    
    // Create system message
    await TicketMessage.createSystemMessage(ticket._id, 'hr_resolved', {
      triggeredBy: req.user._id,
      resolutionComment: resolutionComment
    });
    
    res.json({
      message: 'Ticket resolved by HR. Employee can now confirm or reopen.',
      ticket: await Ticket.findById(ticket._id)
        .populate('createdBy', 'firstName lastName email role')
        .populate('assignedTo', 'firstName lastName email role')
    });
    
  } catch (error) {
    console.error('Error resolving ticket by HR:', error);
    res.status(500).json({
      message: 'Error resolving ticket',
      error: error.message
    });
  }
};

// Confirm resolution by Employee (closes ticket)
const confirmTicketByEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check if user is the ticket creator
    const createdById = ticket.createdBy._id ? ticket.createdBy._id.toString() : ticket.createdBy.toString();
    if (createdById !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only ticket creator can confirm resolution' });
    }
    
    try {
      // Confirm resolution by employee
      await ticket.confirmByEmployee(req.user._id);
      
      // Create system message
      await TicketMessage.createSystemMessage(ticket._id, 'employee_confirmed', {
        triggeredBy: req.user._id
      });
      
      res.json({
        message: 'Ticket confirmed and closed successfully',
        ticket: await Ticket.findById(ticket._id)
          .populate('createdBy', 'firstName lastName email role')
          .populate('assignedTo', 'firstName lastName email role')
      });
      
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    
  } catch (error) {
    console.error('Error confirming ticket by employee:', error);
    res.status(500).json({
      message: 'Error confirming ticket',
      error: error.message
    });
  }
};

// Reopen ticket by Employee
const reopenTicketByEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Find ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Check if user is the ticket creator
    const createdById = ticket.createdBy._id ? ticket.createdBy._id.toString() : ticket.createdBy.toString();
    if (createdById !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only ticket creator can reopen the ticket' });
    }
    
    try {
      // Reopen ticket by employee
      await ticket.reopenByEmployee(req.user._id, reason);
      
      // Create system message
      await TicketMessage.createSystemMessage(ticket._id, 'employee_reopened', {
        triggeredBy: req.user._id,
        reason: reason
      });
      
      res.json({
        message: 'Ticket reopened successfully',
        ticket: await Ticket.findById(ticket._id)
          .populate('createdBy', 'firstName lastName email role')
          .populate('assignedTo', 'firstName lastName email role')
      });
      
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    
  } catch (error) {
    console.error('Error reopening ticket by employee:', error);
    res.status(500).json({
      message: 'Error reopening ticket',
      error: error.message
    });
  }
};

// Get ticket statistics
const getTicketStats = async (req, res) => {
  try {
    // Build query based on user role
    let matchQuery = {};
    
    switch (req.user.role) {
      case 'Employee':
        matchQuery.createdBy = req.user._id;
        break;
      case 'Team Leader':
        const teamMembers = await User.find({ 
          reportingManager: req.user._id 
        }).select('_id');
        const memberIds = teamMembers.map(member => member._id);
        matchQuery.$or = [
          { createdBy: req.user._id },
          { createdBy: { $in: memberIds } }
        ];
        break;
      case 'HR Executive':
      case 'HR Manager':
      case 'HR BP':
        const hrRoleCategories = getHRRoleCategories(req.user.role);
        
        if (req.user.role === 'HR Executive') {
          matchQuery.$or = [
            { 
              category: { $in: hrRoleCategories },
              isConfidential: false,
              isManuallyAssigned: false
            },
            { assignedTo: req.user._id }
          ];
        } else if (req.user.role === 'HR Manager') {
          matchQuery.$or = [
            { 
              category: { $in: hrRoleCategories },
              isManuallyAssigned: false
            },
            { assignedTo: req.user._id }
          ];
        } else if (req.user.role === 'HR BP') {
          matchQuery.$or = [
            { 
              category: { $in: hrRoleCategories },
              isManuallyAssigned: false
            },
            { assignedTo: req.user._id }
          ];
        }
        break;
      // Vice President and Admin can see all tickets
    }
    
    const stats = await Ticket.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
          escalated: { $sum: { $cond: [{ $eq: ['$status', 'Escalated'] }, 1, 0] } },
          avgResponseTime: { $avg: '$responseTimeInHours' },
          avgResolutionTime: { $avg: '$resolutionTimeInHours' }
        }
      }
    ]);
    
    // Get category breakdown
    const categoryStats = await Ticket.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get priority breakdown
    const priorityStats = await Ticket.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      overview: stats[0] || {
        total: 0, open: 0, inProgress: 0, pending: 0, 
        resolved: 0, closed: 0, escalated: 0,
        avgResponseTime: 0, avgResolutionTime: 0
      },
      categoryBreakdown: categoryStats,
      priorityBreakdown: priorityStats
    });
    
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    res.status(500).json({
      message: 'Error fetching ticket statistics',
      error: error.message
    });
  }
};

// Helper function to check ticket access
const checkTicketAccess = async (ticket, user) => {
  // Get the actual ID from createdBy (handle both ObjectId and populated object)
  const createdById = ticket.createdBy._id ? ticket.createdBy._id.toString() : ticket.createdBy.toString();
  const assignedToId = ticket.assignedTo ? 
    (ticket.assignedTo._id ? ticket.assignedTo._id.toString() : ticket.assignedTo.toString()) : null;
  
  console.log('Access check debug:');
  console.log('createdById:', createdById);
  console.log('user._id:', user._id.toString());
  console.log('assignedToId:', assignedToId);
  console.log('user.role:', user.role);
  console.log('ticket.isConfidential:', ticket.isConfidential);
  
  // Ticket creator always has access
  if (createdById === user._id.toString()) {
    console.log('Access granted: ticket creator');
    return true;
  }
  
  // Assigned HR personnel has access
  if (assignedToId && assignedToId === user._id.toString()) {
    console.log('Access granted: assigned HR personnel');
    return true;
  }
  
  // HR roles have access based on category routing and confidentiality
  const hrRoles = ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'];
  if (hrRoles.includes(user.role)) {
    // Vice President and Admin can see all tickets
    if (user.role === 'Vice President' || user.role === 'Admin') {
      console.log('Access granted: VP/Admin role');
      return true;
    }
    
    // Check if this HR role can handle this ticket category
    const hrRoleCategories = getHRRoleCategories(user.role);
    const canHandleCategory = hrRoleCategories.includes(ticket.category);
    
    if (user.role === 'HR Executive') {
      // HR Executives can see tickets in their categories (non-confidential) or assigned to them
      const hasAccess = (canHandleCategory && !ticket.isConfidential) || 
                       (assignedToId && assignedToId === user._id.toString());
      console.log('Access for HR Executive:', hasAccess, 'canHandleCategory:', canHandleCategory, 'isConfidential:', ticket.isConfidential);
      return hasAccess;
    } else if (user.role === 'HR Manager') {
      // HR Managers can see tickets in their categories or assigned to them
      const hasAccess = canHandleCategory || (assignedToId && assignedToId === user._id.toString());
      console.log('Access for HR Manager:', hasAccess, 'canHandleCategory:', canHandleCategory);
      return hasAccess;
    } else if (user.role === 'HR BP') {
      // HR BP can see tickets in their categories (including confidential) or assigned to them
      const hasAccess = canHandleCategory || (assignedToId && assignedToId === user._id.toString());
      console.log('Access for HR BP:', hasAccess, 'canHandleCategory:', canHandleCategory);
      return hasAccess;
    }
  }
  
  // Team leaders can see their team members' tickets
  if (user.role === 'Team Leader') {
    const ticketCreatorId = ticket.createdBy._id ? ticket.createdBy._id : ticket.createdBy;
    const ticketCreator = await User.findById(ticketCreatorId);
    const hasAccess = ticketCreator && ticketCreator.reportingManager && 
           ticketCreator.reportingManager.toString() === user._id.toString();
    console.log('Access for Team Leader:', hasAccess);
    return hasAccess;
  }
  
  console.log('Access denied: no matching criteria');
  return false;
};

// Helper function to check ticket update access
const checkTicketUpdateAccess = async (ticket, user) => {
  // HR roles can update tickets
  const hrRoles = ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'];
  if (hrRoles.includes(user.role)) {
    return true;
  }
  
  // Ticket creator can update their own ticket status (limited actions)
  const createdById = ticket.createdBy._id ? ticket.createdBy._id.toString() : ticket.createdBy.toString();
  if (createdById === user._id.toString()) {
    return true;
  }
  
  return false;
};

// Get eligible HR personnel for a category
const getEligibleHRPersonnel = async (req, res) => {
  try {
    const { category } = req.params;
    
    let eligibleRoles = ['HR Executive', 'HR Manager', 'HR BP']; // Default to all HR roles
    
    // If category is provided, get specific eligible roles
    if (category) {
      // Validate category
      const validCategories = [
        'Leave Issue',
        'Attendance Issue', 
        'Regularization Problem',
        'Holiday Calendar Query',
        'WFH / Remote Work Requests',
        'Payroll / Salary Issue',
        'Payslip Not Available',
        'Reimbursement Issue',
        'Tax / TDS / Form-16',
        'Leave Policy Clarification',
        'Performance Review Concern',
        'KPI / Goals Setup Issue',
        'Probation / Confirmation',
        'Training / LMS Access Issue',
        'Certification Issue',
        'Offer Letter / Joining Issue',
        'Referral / Interview Feedback',
        'Resignation Process Query',
        'Final Settlement Delay',
        'Experience Letter Request',
        'HRMS Login Issue',
        'System Bug / App Crash',
        'Document Upload Failed',
        'Office Access / ID Card Lost',
        'General HR Query',
        'Harassment / Grievance',
        'Asset Request / Laptop',
        'Feedback / Suggestion to HR',
        'Others'
      ];
      
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          message: 'Invalid category'
        });
      }
      
      // Get eligible roles for this category
      const routingRules = {
        'Leave Issue': ['HR Executive'],
        'Attendance Issue': ['HR Executive'],
        'Regularization Problem': ['HR Executive'],
        'Holiday Calendar Query': ['HR Executive'],
        'WFH / Remote Work Requests': ['HR Executive'],
        'Leave Policy Clarification': ['HR Executive', 'HR Manager'],
        'Payroll / Salary Issue': ['HR Manager'],
        'Payslip Not Available': ['HR Manager'],
        'Reimbursement Issue': ['HR Manager'],
        'Tax / TDS / Form-16': ['HR Manager'],
        'Performance Review Concern': ['HR BP'],
        'KPI / Goals Setup Issue': ['HR Manager'],
        'Probation / Confirmation': ['HR Executive'],
        'Training / LMS Access Issue': ['HR Executive'],
        'Certification Issue': ['HR Manager'],
        'Offer Letter / Joining Issue': ['HR BP'],
        'Referral / Interview Feedback': ['HR Executive'],
        'Resignation Process Query': ['HR Manager'],
        'Final Settlement Delay': ['HR BP'],
        'Experience Letter Request': ['HR Executive'],
        'HRMS Login Issue': ['HR Executive'],
        'System Bug / App Crash': ['HR Executive'],
        'Document Upload Failed': ['HR Executive'],
        'Office Access / ID Card Lost': ['HR Executive'],
        'General HR Query': ['HR Executive'],
        'Harassment / Grievance': ['HR BP'],
        'Asset Request / Laptop': ['HR Executive'],
        'Feedback / Suggestion to HR': ['HR Manager', 'HR BP'],
        'Others': ['HR Executive']
      };
      
      eligibleRoles = routingRules[category] || ['HR Executive'];
    }
    
    // Find HR personnel with eligible roles, sorted by workload
    const hrPersonnel = await User.aggregate([
      {
        $match: {
          role: { $in: eligibleRoles },
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'tickets',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$assignedTo', '$$userId'] },
                    { $in: ['$status', ['Open', 'In Progress', 'Pending']] }
                  ]
                }
              }
            }
          ],
          as: 'openTickets'
        }
      },
      {
        $addFields: {
          workload: { $size: '$openTickets' }
        }
      },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          role: 1,
          email: 1,
          workload: 1
        }
      },
      {
        $sort: { workload: 1, firstName: 1 }
      }
    ]);
    
    res.json({
      category: category || 'all',
      eligibleRoles,
      hrPersonnel
    });
    
  } catch (error) {
    console.error('Error fetching eligible HR personnel:', error);
    res.status(500).json({
      message: 'Error fetching eligible HR personnel',
      error: error.message
    });
  }
};

module.exports = {
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
};
