// HR Routing utility - Maps ticket categories to HR roles
// This should match the backend routing rules exactly

export const getHRRoleForCategory = (category) => {
  const routingRules = {
    'Leave Issue': 'HR Executive',
    'Attendance Issue': 'HR Executive',
    'Regularization Problem': 'HR Executive',
    'Holiday Calendar Query': 'HR Executive',
    'WFH / Remote Work Requests': 'HR Executive',
    'Leave Policy Clarification': 'HR Executive / HR Manager',
    'Payroll / Salary Issue': 'HR Manager',
    'Payslip Not Available': 'HR Manager',
    'Reimbursement Issue': 'HR Manager',
    'Tax / TDS / Form-16': 'HR Manager',
    'Performance Review Concern': 'HR BP',
    'KPI / Goals Setup Issue': 'HR Manager',
    'Probation / Confirmation': 'HR Executive',
    'Training / LMS Access Issue': 'HR Executive',
    'Certification Issue': 'HR Manager',
    'Offer Letter / Joining Issue': 'HR BP',
    'Referral / Interview Feedback': 'HR Executive',
    'Resignation Process Query': 'HR Manager',
    'Final Settlement Delay': 'HR BP',
    'Experience Letter Request': 'HR Executive',
    'Document Upload Failed': 'HR Executive',
    'General HR Query': 'HR Executive',
    'Harassment / Grievance': 'HR BP (Confidential)',
    'Feedback / Suggestion to HR': 'HR Manager / HR BP',
    'Others': 'HR Executive'
  };

  return routingRules[category] || 'HR Executive';
};

// Get all eligible HR roles for a category (returns array)
export const getEligibleHRRoles = (category) => {
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

  return routingRules[category] || ['HR Executive'];
};

// Check if current user's role can handle this category
export const canUserHandleCategory = (userRole, category) => {
  const eligibleRoles = getEligibleHRRoles(category);
  return eligibleRoles.includes(userRole);
};

// Get routing information with description
export const getRoutingInfo = (category) => {
  const hrRole = getHRRoleForCategory(category);
  const isConfidential = category === 'Harassment / Grievance';
  
  return {
    assignedRole: hrRole,
    isConfidential,
    description: isConfidential 
      ? 'This ticket will be handled confidentially by HR BP'
      : `This ticket will be assigned to ${hrRole}`
  };
};
