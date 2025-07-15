const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const Leave = require('../models/Leave');
const { uploadDir } = require('../middleware/upload');

// Function to delete expired documents
const cleanupExpiredDocuments = async () => {
  try {
    console.log('Starting cleanup of expired leave documents...');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Find leaves with expired documents
    const leavesWithExpiredDocs = await Leave.find({
      'attachments.uploadDate': { $lt: thirtyDaysAgo },
      'attachments.0': { $exists: true } // Has at least one attachment
    });
    
    let deletedFilesCount = 0;
    let updatedLeavesCount = 0;
    
    for (const leave of leavesWithExpiredDocs) {
      const expiredAttachments = [];
      const validAttachments = [];
      
      // Separate expired and valid attachments
      leave.attachments.forEach(attachment => {
        if (attachment.uploadDate < thirtyDaysAgo) {
          expiredAttachments.push(attachment);
        } else {
          validAttachments.push(attachment);
        }
      });
      
      // Delete expired files from filesystem
      for (const attachment of expiredAttachments) {
        const filePath = path.join(uploadDir, attachment.fileName);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            deletedFilesCount++;
            console.log(`Deleted expired file: ${attachment.fileName}`);
          }
        } catch (error) {
          console.error(`Error deleting file ${attachment.fileName}:`, error);
        }
      }
      
      // Update leave document to remove expired attachments
      if (expiredAttachments.length > 0) {
        leave.attachments = validAttachments;
        await leave.save();
        updatedLeavesCount++;
      }
    }
    
    console.log(`Cleanup completed. Deleted ${deletedFilesCount} expired files from ${updatedLeavesCount} leave requests.`);
    
    return {
      deletedFilesCount,
      updatedLeavesCount
    };
    
  } catch (error) {
    console.error('Error during document cleanup:', error);
    throw error;
  }
};

// Function to clean up orphaned files (files that exist in filesystem but not in database)
const cleanupOrphanedFiles = async () => {
  try {
    console.log('Starting cleanup of orphaned files...');
    
    if (!fs.existsSync(uploadDir)) {
      console.log('Upload directory does not exist, skipping orphaned file cleanup.');
      return { deletedOrphanedFiles: 0 };
    }
    
    const filesInDirectory = fs.readdirSync(uploadDir);
    
    // Get all attachment filenames from database
    const allLeaves = await Leave.find({
      'attachments.0': { $exists: true }
    }, 'attachments.fileName');
    
    const dbFileNames = new Set();
    allLeaves.forEach(leave => {
      leave.attachments.forEach(attachment => {
        dbFileNames.add(attachment.fileName);
      });
    });
    
    let deletedOrphanedFiles = 0;
    
    // Delete files that exist in filesystem but not in database
    for (const fileName of filesInDirectory) {
      if (!dbFileNames.has(fileName)) {
        const filePath = path.join(uploadDir, fileName);
        try {
          fs.unlinkSync(filePath);
          deletedOrphanedFiles++;
          console.log(`Deleted orphaned file: ${fileName}`);
        } catch (error) {
          console.error(`Error deleting orphaned file ${fileName}:`, error);
        }
      }
    }
    
    console.log(`Orphaned file cleanup completed. Deleted ${deletedOrphanedFiles} orphaned files.`);
    
    return { deletedOrphanedFiles };
    
  } catch (error) {
    console.error('Error during orphaned file cleanup:', error);
    throw error;
  }
};

// Function to get cleanup statistics
const getCleanupStats = async () => {
  try {
    const totalLeaves = await Leave.countDocuments({});
    const leavesWithAttachments = await Leave.countDocuments({
      'attachments.0': { $exists: true }
    });
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const leavesWithExpiredDocs = await Leave.countDocuments({
      'attachments.uploadDate': { $lt: thirtyDaysAgo },
      'attachments.0': { $exists: true }
    });
    
    // Count files in upload directory
    let filesInDirectory = 0;
    if (fs.existsSync(uploadDir)) {
      filesInDirectory = fs.readdirSync(uploadDir).length;
    }
    
    return {
      totalLeaves,
      leavesWithAttachments,
      leavesWithExpiredDocs,
      filesInDirectory,
      uploadDirectory: uploadDir
    };
    
  } catch (error) {
    console.error('Error getting cleanup stats:', error);
    throw error;
  }
};

// Schedule cleanup to run daily at 2 AM
const scheduleCleanup = () => {
  // Run every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled document cleanup...');
    try {
      await cleanupExpiredDocuments();
      await cleanupOrphanedFiles();
    } catch (error) {
      console.error('Scheduled cleanup failed:', error);
    }
  }, {
    timezone: "UTC"
  });
  
  console.log('Document cleanup scheduler initialized - will run daily at 2:00 AM UTC');
};

module.exports = {
  cleanupExpiredDocuments,
  cleanupOrphanedFiles,
  getCleanupStats,
  scheduleCleanup
};
