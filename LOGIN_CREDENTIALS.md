# HRM Management System - Login Credentials

## System Overview
This MERN stack HRM management system includes role-based authentication with the following user roles:

## Available User Accounts

### 1. Admin
- **Email:** admin@company.com
- **Password:** password123
- **Role:** Admin
- **Access Level:** Full system access

### 2. Vice President
- **Email:** vicepresident@company.com
- **Password:** password123
- **Role:** Vice President
- **Access Level:** High-level management access

### 3. HR Business Partner
- **Email:** hrbp@company.com
- **Password:** password123
- **Role:** HR BP
- **Access Level:** Strategic HR access

### 4. HR Manager
- **Email:** hrmanager@company.com
- **Password:** password123
- **Role:** HR Manager
- **Access Level:** HR department management

### 5. HR Executive
- **Email:** hrexecutive@company.com
- **Password:** password123
- **Role:** HR Executive
- **Access Level:** HR operations

### 6. Team Manager
- **Email:** teammanager@company.com
- **Password:** password123
- **Role:** Team Manager
- **Access Level:** Team management

### 7. Team Leader
- **Email:** teamleader@company.com
- **Password:** password123
- **Role:** Team Leader
- **Access Level:** Team leadership

### 8. Employee
- **Email:** employee@company.com
- **Password:** password123
- **Role:** Employee
- **Access Level:** Basic employee access (no management dashboard)

## How to Start the System

### Backend Server
```bash
cd hrm-management/backend
node server.js
```
Server runs on: http://localhost:5001

### Frontend Application
```bash
cd hrm-management/frontend
npm start
```
Application runs on: http://localhost:3000

## Features Implemented
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-based access control
- ✅ Professional login interface
- ✅ Dashboard with role-specific content
- ✅ MongoDB integration
- ✅ Automatic dummy user creation
- ✅ Protected routes
- ✅ Responsive design

## Testing Notes
- The admin account was successfully tested and working
- Dummy users are created automatically when the server starts
- All roles have been configured with appropriate access levels
- The system uses JWT tokens for session management

## Next Steps for Development
1. Add user management features for admins
2. Implement role-specific dashboard content
3. Add employee management functionality
4. Create reporting and analytics features
5. Add audit logging capabilities
