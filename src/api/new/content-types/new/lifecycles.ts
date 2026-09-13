// @ts-nocheck
const { Expo } = require('expo-server-sdk');

export default {
  async afterCreate(event) {
    const { result } = event;
    if (result.publishedAt) {
      await processContentAndNotify(result, 'news');
    }
  },
  async afterUpdate(event) {
    const { result } = event;
    if (result.publishedAt) {
      await processContentAndNotify(result, 'news');
    }
  },
  async afterDelete(event) {
    const { result } = event;
    const docId = result.documentId || result.id.toString();
    try {
      const reminders = await strapi.documents('api::reminder.reminder').findMany({
        filters: { contentId: docId, contentType: 'news' }
      });
      for (const r of reminders) {
        await strapi.documents('api::reminder.reminder').delete({ documentId: r.documentId });
      }
    } catch (error) {
      console.error('❌ Error borrando avisos:', error);
    }
  }
};

async function processContentAndNotify(result, type) {
  const docId = result.documentId || result.id.toString();
  const expo = new Expo();

  try {
    const existing = await strapi.documents('api::reminder.reminder').findMany({
      filters: { contentId: docId, contentType: type }
    });
    for (const r of existing) {
      await strapi.documents('api::reminder.reminder').delete({ documentId: r.documentId });
    }

    const titlePrefix = type === 'event' ? 'Nuevo Evento' : 'Nueva Noticia';
    await strapi.documents('api::reminder.reminder').create({
      data: {
        title: `${titlePrefix}: ${result.title}`,
        description: result.description || 'Consulta los detalles en la app',
        to: 'all',
        contentId: docId,
        contentType: type,
      },
    });

    const tokens = await strapi.documents('api::notification-token.notification-token').findMany();
    const expoTokens = tokens.map(t => t.token).filter(token => Expo.isExpoPushToken(token));

    if (expoTokens.length > 0) {
      const message = type === 'event'
        ? `BienestAU te invita al siguiente evento: ${result.title}`
        : `BienestAU: Hay una nueva noticia: ${result.title}`;

      const messages = expoTokens.map(token => ({
        to: token,
        sound: 'default',
        title: 'BienestAU 🔔',
        body: message,
        priority: 'high',
        badge: 1,
        data: { type: 'reminder', contentId: docId, contentType: type },
      }));

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
      console.log(`✅ Notificación de noticia enviada.`);
    }
  } catch (error) {
    console.error('❌ Error enviando noticia:', error);
  }
}
