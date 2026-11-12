// @ts-nocheck
const { Expo } = require('expo-server-sdk');

module.exports = {
  async afterCreate(event) {
    const { result } = event || {};
    console.log('✨ [LIFECYCLE afterCreate] Nuevo Evento:', result?.title);
    await processAndNotify(result, 'event');
  },
  async afterUpdate(event) {
    const { result } = event || {};
    console.log('🔄 [LIFECYCLE afterUpdate] Evento actualizado:', result?.title);
    await processAndNotify(result, 'event');
  },
  async afterDelete(event) {
    const { result } = event || {};
    const docId = result?.documentId || result?.id?.toString();
    try {
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
  if (!result) return;
  if (result.publishedAt === null) return;

  const docId = result.documentId || result.id?.toString();
  const expo = new Expo();

  try {
    // 1. Gestionar Aviso en DB (Limpiar y Crear)
    try {
      const old = await strapi.db.query('api::reminder.reminder').findMany({
        where: { contentId: docId, contentType: type }
      });
      for (const r of old) { await strapi.db.query('api::reminder.reminder').delete({ where: { id: r.id } }); }
    } catch (_) {}

    const titlePrefix = 'BienestAU te invita';
    try {
      await strapi.db.query('api::reminder.reminder').create({
        data: {
          title: `${titlePrefix}: ${result.title}`,
          description: result.description || 'Consulta los detalles en la app',
          to: 'all',
          contentId: docId,
          contentType: type,
          publishedAt: result.publishedAt || new Date().toISOString(),
        },
      });
    } catch (_) {}

    // 2. Envío Push Real
    let allTokens = [];
    try {
      allTokens = await strapi.documents('api::notification-token.notification-token').findMany({});
    } catch (_) {
      try {
        allTokens = await strapi.db.query('api::notification-token.notification-token').findMany({});
      } catch (err2) {
        console.error('❌ Error consultando tokens en BD:', err2?.message);
      }
    }

    console.log(`📊 [EVENTO] Total registros recuperados de BD: ${allTokens?.length || 0}`);

    const expoTokens = (allTokens || [])
      .map(t => (typeof t === 'string' ? t : t?.token))
      .filter(token => token && typeof token === 'string' && Expo.isExpoPushToken(token));

    console.log(`📱 [PUSH EVENTO] Tokens Expo válidos a notificar: ${expoTokens.length}`, expoTokens);

    if (expoTokens.length > 0) {
      const messages = expoTokens.map(token => ({
        to: token,
        sound: 'default',
        title: 'BienestAU 🔔',
        body: `BienestAU te invita al siguiente evento: ${result.title}`,
        priority: 'high',
        badge: 1,
        channelId: 'default',
        _displayInForeground: true,
        data: { type: 'reminder', contentId: docId, contentType: type },
      }));

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          console.log('✅ Tickets respuesta de Expo:', JSON.stringify(tickets, null, 2));

          for (const ticket of tickets) {
            if (ticket.status === 'error') {
              console.error(`❌ Error en entrega de ticket (${ticket.details?.error}):`, ticket.message);
            }
          }
        } catch (error) { console.error('❌ Error envío chunk:', error); }
      }
    } else {
      console.log('⚠️ No hay tokens Expo válidos en la BD.');
    }
  } catch (error) { console.error('❌ Error crítico en processAndNotify:', error); }
}
