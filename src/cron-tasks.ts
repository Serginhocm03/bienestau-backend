// @ts-nocheck
const { Expo } = require('expo-server-sdk');

export default {
  /**
   * Cron job to delete expired events.
   * Runs every day at 00:00 (Midnight).
   */
  deleteExpiredEvents: {
    task: async ({ strapi }) => {
      console.log('⏰ [CRON] Ejecutando limpieza de eventos expirados...');
      const today = new Date().toISOString().split('T')[0];

      try {
        const expiredEvents = await strapi.db.query('api::event.event').findMany({
          where: {
            fecha_evento: {
              $lt: today,
            },
          },
        });

        if (expiredEvents.length === 0) {
          console.log('✅ No se encontraron eventos expirados.');
          return;
        }

        for (const event of expiredEvents) {
          await strapi.db.query('api::event.event').delete({
            where: { id: event.id },
          });
          console.log(`🗑️ Evento eliminado: ${event.title} (Fecha: ${event.fecha_evento})`);
        }
      } catch (error) {
        console.error('❌ Error en limpieza de eventos:', error);
      }
    },
    options: {
      rule: '0 0 * * *',
    },
  },

  /**
   * Cron job to send reminders for events happening tomorrow.
   * Runs every day at 08:00 AM.
   */
  sendEventReminders: {
    task: async ({ strapi }) => {
      console.log('⏰ [CRON] Buscando eventos para mañana para enviar recordatorios...');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      try {
        const eventsTomorrow = await strapi.db.query('api::event.event').findMany({
          where: {
            fecha_evento: tomorrowStr,
          },
        });

        if (eventsTomorrow.length === 0) {
          console.log('✅ No hay eventos para mañana.');
          return;
        }

        const expo = new Expo();
        const tokensInDb = await strapi.db.query('api::notification-token.notification-token').findMany({
          where: { active: true }
        });
        const expoTokens = tokensInDb.map(t => t.token).filter(token => Expo.isExpoPushToken(token));

        if (expoTokens.length === 0) return;

        for (const event of eventsTomorrow) {
          console.log(`🔔 Enviando recordatorio para: ${event.title}`);

          const messages = expoTokens.map(token => ({
            to: token,
            sound: 'default',
            title: '¡Recordatorio de BienestAU! 🔔',
            body: `¡No te olvides! Mañana tenemos el evento: ${event.title}`,
            priority: 'high',
            data: { type: 'reminder', contentId: event.documentId || event.id.toString(), contentType: 'event' },
          }));

          const chunks = expo.chunkPushNotifications(messages);
          for (const chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
          }
        }
        console.log(`✅ Se enviaron recordatorios para ${eventsTomorrow.length} eventos.`);
      } catch (error) {
        console.error('❌ Error en recordatorios de cron:', error);
      }
    },
    options: {
      rule: '0 8 * * *', // Todos los días a las 8:00 AM
    },
  },
};
