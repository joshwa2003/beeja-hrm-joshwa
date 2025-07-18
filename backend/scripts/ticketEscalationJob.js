const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const TicketMessage = require('../models/TicketMessage');
require('dotenv').config();

const runEscalationJob = async () => {
  try {
    console.log('Starting ticket escalation job...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Find tickets that need escalation
    const ticketsNeedingEscalation = await Ticket.findTicketsNeedingEscalation();
    
    console.log(`Found ${ticketsNeedingEscalation.length} tickets needing escalation`);

    let escalatedCount = 0;
    
    for (const ticket of ticketsNeedingEscalation) {
      try {
        const escalationCheck = ticket.needsEscalation();
        
        if (escalationCheck) {
          console.log(`Escalating ticket ${ticket.ticketNumber} - ${escalationCheck.type} deadline breached`);
          
          // Attempt escalation
          const escalated = await ticket.escalate(
            null, // No specific user triggering this (system escalation)
            `Automatic escalation due to ${escalationCheck.type} SLA breach. Deadline was ${escalationCheck.deadline.toISOString()}`,
            true // This is an auto-escalation
          );
          
          if (escalated) {
            escalatedCount++;
            console.log(`✓ Successfully escalated ticket ${ticket.ticketNumber}`);
          } else {
            console.log(`✗ Could not escalate ticket ${ticket.ticketNumber} - no higher role available`);
          }
        }
      } catch (error) {
        console.error(`Error escalating ticket ${ticket.ticketNumber}:`, error.message);
      }
    }
    
    console.log(`Escalation job completed. Escalated ${escalatedCount} tickets.`);
    
    // Close database connection
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('Error in escalation job:', error);
    process.exit(1);
  }
};

// If this script is run directly
if (require.main === module) {
  runEscalationJob()
    .then(() => {
      console.log('Escalation job finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Escalation job failed:', error);
      process.exit(1);
    });
}

module.exports = { runEscalationJob };
