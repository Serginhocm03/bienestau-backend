export default {
  /**
   * Cron job to delete expired events.
   * Runs every day at 00:00 (Midnight).
   */
  deleteExpiredEvents: {
    task: async ({ strapi }) => {
      console.log('⏰ Running Cron Job: Deleting expired events...');
      const today = new Date().toISOString().split('T')[0];

      try {
        const expiredEvents = await strapi.db.query('api::event.event').findMany({
          where: {
            date: {
              $lt: today,
            },
          },
        });

        if (expiredEvents.length === 0) {
          console.log('✅ No expired events found.');
          return;
        }

        for (const event of expiredEvents) {
          await strapi.db.query('api::event.event').delete({
            where: { id: event.id },
          });
          console.log(`🗑️ Deleted expired event: ${event.title} (Date: ${event.date})`);
        }
      } catch (error) {
        console.error('❌ Error in deleteExpiredEvents cron job:', error);
      }
    },
    options: {
      rule: '0 0 * * *', // Every day at midnight
    },
  },
};
