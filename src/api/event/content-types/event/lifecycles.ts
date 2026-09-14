// @ts-nocheck
const { Expo } = require('expo-server-sdk');

export default {
  async afterCreate(event) {
    const { result } = event;
    if (result.publishedAt) {
      console.log('✨ [EVENT] Publicado, disparando notificación...');
      await processAndNotify(result, 'event');
    }
  },
  async afterUpdate(event) {
    const { result } = event;
    // En Strapi v5 result tiene el estado actual.
    // Si ya está publicado, notificamos (evitando duplicados internamente)
    if (result.publishedAt) {
      console.log('🔄 [EVENT] Actualizado, disparando notificación...');
      await processAndNotify(result, 'event');
    }
  },
  async afterDelete(event) {
    const { result } = event;
    const docId = result.documentId || result.id.toString();
    try {
      // Limpiar avisos huérfanos
      const reminders = await strapi.db.query('api::reminder.reminder').findMany({
        where: { contentId: docId, contentType: 'event' }
      });
      for (const r of reminders) {
        await strapi.db.query('api::reminder.reminder').delete({ where: { id: r.id } });
      }
    } catch (e) { console.error(e); }
  }
};

async function processAndNotify(result, type) {
  const docId = result.documentId || result.id.toString();
  const expo = new Expo();

  try {
    // 1. Gestionar Aviso en DB (Limpiar y Crear)
    const old = await strapi.db.query('api::reminder.reminder').findMany({
      where: { contentId: docId, contentType: type }
    });
    for (const r of old) { await strapi.db.query('api::reminder.reminder').delete({ where: { id: r.id } }); }

    const titlePrefix = type === 'event' ? 'Nuevo Evento' : 'Nueva Noticia';
    await strapi.db.query('api::reminder.reminder').create({
      data: {
        title: `${titlePrefix}: ${result.title}`,
        description: result.description || 'Consulta los detalles en la app',
        to: 'all',
        contentId: docId,
        contentType: type,
        publishedAt: new Date().toISOString(),
      },
    });

    // 2. Envío Push Real
    const tokensInDb = await strapi.db.query('api::notification-token.notification-token').findMany({
      where: { active: true }
    });

    const expoTokens = tokensInDb.map(t => t.token).filter(token => Expo.isExpoPushToken(token));
    console.log(`📱 [PUSH] Enviando a ${expoTokens.length} dispositivos.`);

    if (expoTokens.length > 0) {
      const messages = expoTokens.map(token => ({
        to: token,
        sound: 'default',
        title: 'BienestAU 🔔',
        body: type === 'event'
          ? `BienestAU te invita al siguiente evento: ${result.title}`
          : `BienestAU: Hay una nueva noticia: ${result.title}`,
        priority: 'high',
        badge: 1,
        channelId: 'default',
        data: { type: 'reminder', contentId: docId, contentType: type },
      }));

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          console.log('✅ Notificaciones entregadas:', tickets);
        } catch (error) { console.error('❌ Error envío chunk:', error); }
      }
    }
  } catch (error) { console.error('❌ Error crítico en processAndNotify:', error); }
}
