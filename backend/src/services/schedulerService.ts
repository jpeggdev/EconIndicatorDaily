import * as cron from 'node-cron';
import EmailService from './emailService';

export class SchedulerService {
  private emailService: EmailService;
  private weeklyEmailTask?: cron.ScheduledTask;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    // Only start email scheduling if email is configured
    if (this.isEmailConfigured()) {
      this.startWeeklyEmailSchedule();
      console.log('Scheduler service started with email scheduling');
    } else {
      console.log('Scheduler service started (email scheduling disabled - not configured)');
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    if (this.weeklyEmailTask) {
      this.weeklyEmailTask.stop();
      console.log('Weekly email task stopped');
    }
    console.log('Scheduler service stopped');
  }

  /**
   * Start weekly email schedule
   * Runs every Monday at 8:00 AM
   */
  private startWeeklyEmailSchedule() {
    // Cron expression: '0 8 * * 1' = At 8:00 AM on Monday
    // For testing, you can use '*/30 * * * * *' to run every 30 seconds
    const schedule = process.env.WEEKLY_EMAIL_SCHEDULE || '0 8 * * 1';
    
    this.weeklyEmailTask = cron.schedule(schedule, async () => {
      console.log('Starting weekly email delivery...');
      try {
        const result = await this.emailService.sendWeeklyEmailsToAllProUsers();
        console.log('Weekly email delivery completed:', result);
        
        // Log results for monitoring
        if (result.failed > 0) {
          console.error('Some weekly emails failed to send:', result.errors);
        }
      } catch (error) {
        console.error('Weekly email delivery failed:', error);
      }
    }, {
      timezone: process.env.TZ || 'America/New_York' // Default to EST
    });

    console.log(`Weekly email scheduled: ${schedule} (${process.env.TZ || 'America/New_York'})`);
  }

  /**
   * Manually trigger weekly email (for testing)
   */
  async triggerWeeklyEmails() {
    console.log('Manually triggering weekly emails...');
    try {
      const result = await this.emailService.sendWeeklyEmailsToAllProUsers();
      console.log('Manual weekly email delivery completed:', result);
      return result;
    } catch (error) {
      console.error('Manual weekly email delivery failed:', error);
      throw error;
    }
  }

  /**
   * Test email configuration and send test email
   */
  async testEmailSystem(testEmail?: string) {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    const targetEmail = testEmail || adminEmails[0];
    
    if (!targetEmail) {
      throw new Error('No test email address provided and no admin emails configured');
    }

    console.log(`Testing email system with ${targetEmail}...`);
    
    // Test configuration
    const configTest = await this.emailService.testEmailConfiguration();
    if (!configTest) {
      throw new Error('Email configuration test failed');
    }

    // Send test email
    const testResult = await this.emailService.sendTestEmail(targetEmail);
    if (!testResult) {
      throw new Error('Test email sending failed');
    }

    console.log('Email system test completed successfully');
    return { configTest, testResult };
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      service: 'Scheduler',
      weeklyEmailTask: {
        running: !!this.weeklyEmailTask,
        schedule: process.env.WEEKLY_EMAIL_SCHEDULE || '0 8 * * 1',
        timezone: process.env.TZ || 'America/New_York'
      },
      nextRun: this.getNextRunTime()
    };
  }

  /**
   * Check if email is properly configured
   */
  private isEmailConfigured(): boolean {
    return !!(
      process.env.EMAIL_SERVER_HOST &&
      process.env.EMAIL_SERVER_PORT &&
      process.env.EMAIL_SERVER_USER &&
      process.env.EMAIL_SERVER_PASSWORD
    );
  }

  /**
   * Calculate next run time for weekly emails
   */
  private getNextRunTime(): string {
    try {
      // Simple calculation for next Monday 8 AM
      const now = new Date();
      const nextMonday = new Date(now);
      
      // Calculate days until next Monday
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(8, 0, 0, 0);
      
      // If it's Monday and before 8 AM, use today
      if (now.getDay() === 1 && now.getHours() < 8) {
        nextMonday.setDate(now.getDate());
      }
      
      return nextMonday.toISOString();
    } catch (error) {
      return 'Unable to calculate';
    }
  }
}

export default SchedulerService;