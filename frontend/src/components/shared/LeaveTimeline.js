import React from 'react';

const LeaveTimeline = ({ leaveRequest }) => {
  const getTimelineSteps = () => {
    const steps = [
      {
        key: 'submitted',
        title: 'Leave Submitted',
        description: 'Leave request submitted by employee',
        icon: 'bi-file-earmark-plus',
        completed: true,
        date: leaveRequest.appliedDate,
        user: leaveRequest.employee
      },
      {
        key: 'tl-review',
        title: 'Team Leader Review',
        description: 'Pending team leader approval',
        icon: 'bi-person-check',
        completed: ['Approved by TL', 'Rejected by TL', 'Approved', 'Rejected'].includes(leaveRequest.status),
        active: leaveRequest.status === 'Pending',
        date: leaveRequest.tlApprovedDate,
        user: leaveRequest.tlApprovedBy,
        rejected: leaveRequest.status === 'Rejected by TL'
      },
      {
        key: 'hr-review',
        title: 'HR Final Approval',
        description: 'Pending HR final approval',
        icon: 'bi-shield-check',
        completed: ['Approved', 'Rejected'].includes(leaveRequest.status),
        active: leaveRequest.status === 'Approved by TL',
        date: leaveRequest.approvedDate,
        user: leaveRequest.approvedBy,
        rejected: leaveRequest.status === 'Rejected'
      }
    ];

    // If rejected by TL, don't show HR step as active
    if (leaveRequest.status === 'Rejected by TL') {
      steps[2].active = false;
      steps[2].disabled = true;
    }

    return steps;
  };

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const steps = getTimelineSteps();

  return (
    <div className="leave-timeline">
      <div className="timeline">
        {steps.map((step, index) => (
          <div key={step.key} className="timeline-item">
            <div className="timeline-marker">
              <div className={`timeline-icon ${
                step.completed 
                  ? step.rejected 
                    ? 'bg-danger' 
                    : 'bg-success'
                  : step.active 
                    ? 'bg-primary' 
                    : step.disabled 
                      ? 'bg-secondary' 
                      : 'bg-light border'
              } text-white d-flex align-items-center justify-content-center`}>
                <i className={`${step.icon} ${step.completed || step.active ? 'text-white' : 'text-muted'}`}></i>
              </div>
              {index < steps.length - 1 && (
                <div className={`timeline-line ${
                  step.completed ? 'bg-success' : 'bg-light'
                }`}></div>
              )}
            </div>
            
            <div className="timeline-content">
              <div className="timeline-header">
                <h6 className={`mb-1 ${
                  step.completed 
                    ? step.rejected 
                      ? 'text-danger' 
                      : 'text-success'
                    : step.active 
                      ? 'text-primary' 
                      : 'text-muted'
                }`}>
                  {step.title}
                  {step.completed && (
                    <i className={`ms-2 ${
                      step.rejected ? 'bi-x-circle text-danger' : 'bi-check-circle text-success'
                    }`}></i>
                  )}
                  {step.active && (
                    <span className="spinner-border spinner-border-sm ms-2 text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </span>
                  )}
                </h6>
                <small className="text-muted">{step.description}</small>
              </div>
              
              {step.date && (
                <div className="timeline-details mt-2">
                  <small className="text-muted d-block">
                    <i className="bi-calendar3 me-1"></i>
                    {formatDate(step.date)}
                  </small>
                  {step.user && (
                    <small className="text-muted d-block">
                      <i className="bi-person me-1"></i>
                      {step.user.firstName} {step.user.lastName}
                    </small>
                  )}
                </div>
              )}

              {/* Show comments if available */}
              {step.key === 'tl-review' && leaveRequest.tlComments && (
                <div className="mt-2">
                  <small className="text-muted d-block">
                    <strong>TL Comments:</strong>
                  </small>
                  <small className="text-muted">{leaveRequest.tlComments}</small>
                </div>
              )}

              {step.key === 'hr-review' && leaveRequest.hrComments && (
                <div className="mt-2">
                  <small className="text-muted d-block">
                    <strong>HR Comments:</strong>
                  </small>
                  <small className="text-muted">{leaveRequest.hrComments}</small>
                </div>
              )}

              {leaveRequest.rejectionReason && step.rejected && (
                <div className="mt-2">
                  <small className="text-danger d-block">
                    <strong>Rejection Reason:</strong>
                  </small>
                  <small className="text-danger">{leaveRequest.rejectionReason}</small>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .timeline {
          position: relative;
          padding-left: 0;
        }

        .timeline-item {
          display: flex;
          margin-bottom: 2rem;
          position: relative;
        }

        .timeline-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-right: 1rem;
        }

        .timeline-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          z-index: 2;
        }

        .timeline-line {
          width: 2px;
          height: 40px;
          margin-top: 8px;
        }

        .timeline-content {
          flex: 1;
          padding-top: 8px;
        }

        .timeline-header h6 {
          font-weight: 600;
        }

        .timeline-details {
          padding-left: 0;
        }

        @media (max-width: 768px) {
          .timeline-icon {
            width: 32px;
            height: 32px;
            font-size: 0.875rem;
          }
          
          .timeline-line {
            height: 32px;
            margin-top: 6px;
          }
          
          .timeline-content {
            padding-top: 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default LeaveTimeline;
