import React from 'react';

const LeaveStatusBadge = ({ status, size = 'normal' }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Pending':
        return {
          className: 'bg-warning text-dark',
          icon: 'bi-clock',
          text: 'Pending'
        };
      case 'Approved by TL':
        return {
          className: 'bg-info text-white',
          icon: 'bi-check-circle',
          text: 'TL Approved'
        };
      case 'Rejected by TL':
        return {
          className: 'bg-danger text-white',
          icon: 'bi-x-circle',
          text: 'TL Rejected'
        };
      case 'Approved':
        return {
          className: 'bg-success text-white',
          icon: 'bi-check-circle-fill',
          text: 'Approved'
        };
      case 'Rejected':
        return {
          className: 'bg-danger text-white',
          icon: 'bi-x-circle-fill',
          text: 'Rejected'
        };
      case 'Cancelled':
        return {
          className: 'bg-secondary text-white',
          icon: 'bi-dash-circle',
          text: 'Cancelled'
        };
      default:
        return {
          className: 'bg-light text-dark',
          icon: 'bi-question-circle',
          text: status || 'Unknown'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClass = size === 'small' ? 'badge-sm' : '';

  return (
    <span className={`badge ${config.className} ${sizeClass} d-inline-flex align-items-center`}>
      <i className={`${config.icon} me-1`}></i>
      {config.text}
    </span>
  );
};

export default LeaveStatusBadge;
