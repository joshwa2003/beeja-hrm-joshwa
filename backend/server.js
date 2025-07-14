const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const leaveRoutes = require('./routes/leaves');
const teamRoutes = require('./routes/teams');

const app = express();

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected successfully');
  
  // Initialize system data in correct order after database connection is established
  try {
    console.log('Starting system initialization...');
    
    // Step 1: Ensure system admin user exists
    const createAdminUser = require('./scripts/createAdmin');
    await createAdminUser();
    
    // Step 2: Create departments (requires admin user for createdBy field)
    const createDepartments = require('./scripts/createDepartments');
    await createDepartments();
    
    // Step 3: Create dummy users (requires departments to exist)
    const createDummyUsers = require('./scripts/createDummyUsers');
    await createDummyUsers();
    
    console.log('System initialization completed successfully');
  } catch (error) {
    console.error('Error during initialization:', error);
  }
})
.catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/teams', teamRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'HRM Backend Server is running!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Client URL: ${process.env.CLIENT_URL}`);
});
