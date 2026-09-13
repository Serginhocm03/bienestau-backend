// @ts-nocheck
const { Expo } = require('expo-server-sdk');

export default {
  async afterCreate(event) {
    const { result } = event;
    if (result.publishedAt) {
      await processContentAndNotify(result, 'event');
    }
  },
  async afterUpdate(event) {
    const { result } = event;
    if (result.publishedAt) {
      await processContentAndNotify(result, 'event');
    }
  },
  async afterDelete(event) {
    const { result } = event;
    const docId = result.documentId || result.id.toString();
    try {
      const reminders = await strapi.db.query('api::reminder.reminder').findMany({
        where: { contentId: docId, contentType: 'event' }
      });
      for (const r of reminders) {
        await strapi.db.query('api::reminder.reminder').delete({ where: { id: r.id } });
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
    // 1. Evitar duplicados
    const existing = await strapi.db.query('api::reminder.reminder').findMany({
      where: { contentId: docId, contentType: type }
    });
    for (const r of existing) {
      await strapi.db.query('api::reminder.reminder').delete({ where: { id: r.id } });
    }

    // 2. Crear el aviso
    const titlePrefix = type === 'event' ? 'Nuevo Evento' : 'Nueva Noticia';
    await strapi.db.query('api::reminder.reminder').create({
      data: {
        title: `${titlePrefix}: ${result.title}`,
        description: result.description || 'Consulta los detalles en la app',
        to: 'all',
        fecha_evento: result.fecha_evento || null,
        contentId: docId,
        contentType: type,
        publishedAt: new Date().toISOString(),
      },
    });

    // 3. Obtener tokens con consulta directa (más fiable)
    const tokens = await strapi.db.query('api::notification-token.notification-token').findMany();
    const expoTokens = tokens.map(t => t.token).filter(token => Expo.isExpoPushToken(token));

    console.log(`📊 Intentando notificar a ${expoTokens.length} dispositivos.`);

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
      console.log(`✅ Notificación enviada correctamente.`);
    }
  } catch (error) {
    console.error('❌ Error fatal en proceso de notificación:', error);
  }
}
