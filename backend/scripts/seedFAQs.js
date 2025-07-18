const mongoose = require('mongoose');
const FAQ = require('../models/FAQ');
const User = require('../models/User');
require('dotenv').config();

const sampleFAQs = [
  {
    question: "How do I apply for sick leave?",
    answer: "To apply for sick leave, go to the 'My Leave & Attendance' section in the sidebar, click on 'Apply Leave', select 'Sick Leave' as the type, choose your dates, and provide a reason. For medical leaves longer than 3 days, you may need to upload a medical certificate.",
    category: "Leave & Attendance",
    subcategory: "Sick Leave",
    tags: ["sick leave", "medical leave", "leave application"],
    keywords: ["sick", "medical", "doctor", "certificate", "illness"],
    priority: 10,
    status: "Published",
    isPublic: true,
    visibleToRoles: ["Admin", "Vice President", "HR BP", "HR Manager", "HR Executive", "Team Manager", "Team Leader", "Employee"]
  },
  {
    question: "What is the process for salary reimbursement?",
    answer: "For salary reimbursements, submit your request through the HR portal with proper documentation. Include original receipts, bills, and a filled reimbursement form. Processing typically takes 7-10 business days after approval from your reporting manager.",
    category: "Payroll & Salary",
    subcategory: "Reimbursement",
    tags: ["reimbursement", "salary", "expenses", "bills"],
    keywords: ["reimburse", "expense", "receipt", "bill", "claim"],
    priority: 8,
    status: "Published",
    isPublic: true,
    visibleToRoles: ["Admin", "Vice President", "HR BP", "HR Manager", "HR Executive", "Team Manager", "Team Leader", "Employee"]
  },
  {
    question: "How can I reset my HRMS password?",
    answer: "To reset your HRMS password, go to the login page and click 'Forgot Password'. Enter your registered email address, and you'll receive a password reset link. If you don't receive the email within 10 minutes, check your spam folder or contact IT support.",
    category: "IT & System Issues",
    subcategory: "Login Issues",
    tags: ["password", "reset", "login", "HRMS"],
    keywords: ["password", "forgot", "reset", "login", "access"],
    priority: 9,
    status: "Published",
    isPublic: true,
    visibleToRoles: ["Admin", "Vice President", "HR BP", "HR Manager", "HR Executive", "Team Manager", "Team Leader", "Employee"]
  },
  {
    question: "What are the company's work from home policies?",
    answer: "Employees can work from home up to 2 days per week with manager approval. Submit WFH requests at least 24 hours in advance through the HRMS portal. Ensure you have stable internet, necessary equipment, and maintain regular communication with your team during WFH days.",
    category: "HR Policies",
    subcategory: "Remote Work",
    tags: ["work from home", "WFH", "remote work", "policy"],
    keywords: ["remote", "home", "WFH", "telecommute", "flexible"],
    priority: 7,
    status: "Published",
    isPublic: true,
    visibleToRoles: ["Admin", "Vice President", "HR BP", "HR Manager", "HR Executive", "Team Manager", "Team Leader", "Employee"]
  },
  {
    question: "How do I access my payslip?",
    answer: "Your monthly payslips are available in the HRMS portal under 'Payroll' section. Log in to your account, navigate to 'My Payslips', and you can view or download payslips for the current and previous months. If you can't access older payslips, contact HR.",
    category: "Payroll & Salary",
    subcategory: "Payslip Access",
    tags: ["payslip", "salary slip", "download", "payroll"],
    keywords: ["payslip", "salary", "slip", "download", "monthly"],
    priority: 8,
    status: "Published",
    isPublic: true,
    visibleToRoles: ["Admin", "Vice President", "HR BP", "HR Manager", "HR Executive", "Team Manager", "Team Leader", "Employee"]
  },
  {
    question: "What is the notice period for resignation?",
    answer: "The standard notice period is 30 days for employees and 60 days for senior positions (Team Lead and above). Notice period can be negotiated based on project requirements and management approval. Submit your resignation letter through the HRMS portal and to your reporting manager.",
    category: "HR Policies",
    subcategory: "Resignation",
    tags: ["resignation", "notice period", "quit", "leaving"],
    keywords: ["resign", "quit", "notice", "period", "leave", "exit"],
    priority: 6,
    status: "Published",
    isPublic: true,
    visibleToRoles: ["Admin", "Vice President", "HR BP", "HR Manager", "HR Executive", "Team Manager", "Team Leader", "Employee"]
  },
  {
    question: "How can I update my personal information?",
    answer: "To update personal information like address, phone number, or emergency contacts, go to 'My Profile' section in the HRMS portal. Click 'Edit Profile' and update the required fields. Some changes may require HR approval. For bank details changes, contact HR directly with proper documentation.",
    category: "General HR",
    subcategory: "Profile Management",
    tags: ["profile", "personal information", "update", "contact details"],
    keywords: ["profile", "update", "address", "phone", "contact", "personal"],
    priority: 5,
    status: "Published",
    isPublic: true,
    visibleToRoles: ["Admin", "Vice President", "HR BP", "HR Manager", "HR Executive", "Team Manager", "Team Leader", "Employee"]
  },
  {
    question: "What training programs are available?",
    answer: "We offer various training programs including technical skills, soft skills, leadership development, and compliance training. Check the 'Training' section in HRMS to see available programs, enroll in courses, and track your progress. Some trainings are mandatory and will be assigned automatically.",
    category: "Training & Development",
    subcategory: "Available Programs",
    tags: ["training", "courses", "skill development", "learning"],
    keywords: ["training", "course", "skill", "development", "learn", "program"],
    priority: 4,
    status: "Published",
    isPublic: true,
    visibleToRoles: ["Admin", "Vice President", "HR BP", "HR Manager", "HR Executive", "Team Manager", "Team Leader", "Employee"]
  },
  {
    question: "How do I report attendance issues?",
    answer: "If you have attendance marking issues (biometric failure, missed punch, etc.), submit an attendance regularization request through HRMS within 7 days. Provide the reason and any supporting documents. Your manager will review and approve the request.",
    category: "Leave & Attendance",
    subcategory: "Attendance Issues",
    tags: ["attendance", "biometric", "punch", "regularization"],
    keywords: ["attendance", "biometric", "punch", "mark", "regularize", "missed"],
    priority: 7,
    status: "Published",
    isPublic: true,
    visibleToRoles: ["Admin", "Vice President", "HR BP", "HR Manager", "HR Executive", "Team Manager", "Team Leader", "Employee"]
  },
  {
    question: "What are the performance review cycles?",
    answer: "Performance reviews are conducted quarterly and annually. Quarterly reviews focus on goal progress and feedback, while annual reviews determine ratings, promotions, and salary increments. You'll receive notifications when review cycles begin, and self-assessments are typically due within 2 weeks.",
    category: "Performance Management",
    subcategory: "Review Process",
    tags: ["performance", "review", "appraisal", "evaluation"],
    keywords: ["performance", "review", "appraisal", "evaluation", "rating", "feedback"],
    priority: 6,
    status: "Published",
    isPublic: true,
    visibleToRoles: ["Admin", "Vice President", "HR BP", "HR Manager", "HR Executive", "Team Manager", "Team Leader", "Employee"]
  }
];

const seedFAQs = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find an HR user to set as creator
    const hrUser = await User.findOne({ 
      role: { $in: ['HR Manager', 'HR Executive', 'Admin'] },
      isActive: true 
    });

    if (!hrUser) {
      console.log('No HR user found. Please create an HR user first.');
      process.exit(1);
    }

    console.log(`Using ${hrUser.firstName} ${hrUser.lastName} (${hrUser.role}) as FAQ creator`);

    // Clear existing FAQs (optional - comment out if you want to keep existing ones)
    // await FAQ.deleteMany({});
    // console.log('Cleared existing FAQs');

    // Add creator to each FAQ
    const faqsWithCreator = sampleFAQs.map(faq => ({
      ...faq,
      createdBy: hrUser._id
    }));

    // Insert FAQs
    const insertedFAQs = await FAQ.insertMany(faqsWithCreator);
    console.log(`Successfully inserted ${insertedFAQs.length} FAQs`);

    // Display summary
    const categoryCount = await FAQ.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\nFAQ Summary by Category:');
    categoryCount.forEach(cat => {
      console.log(`- ${cat._id}: ${cat.count} FAQs`);
    });

    console.log('\nFAQ seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding FAQs:', error);
    process.exit(1);
  }
};

// Run the seeding function
seedFAQs();
