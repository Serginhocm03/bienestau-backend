// @ts-nocheck
const { Expo } = require('expo-server-sdk');

export default {
  async afterCreate(event) {
    const { result } = event;
    console.log('✨ [EVENT] Creado, disparando notificación...');
    await processAndNotify(result, 'event');
  },
  async afterUpdate(event) {
    const { result } = event;
    console.log('🔄 [EVENT] Actualizado, disparando notificación...');
    await processAndNotify(result, 'event');
  },
  async afterDelete(event) {
    const { result } = event;
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
    const old = await strapi.db.query('api::reminder.reminder').findMany({
      where: { contentId: docId, contentType: type }
    });
    for (const r of old) { await strapi.db.query('api::reminder.reminder').delete({ where: { id: r.id } }); }

    const titlePrefix = 'BienestAU te invita';
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

    // 2. Envío Push Real
    const allTokens = await strapi.db.query('api::notification-token.notification-token').findMany({});
    console.log(`📊 [EVENTO] Total tokens en BD: ${allTokens.length}`);

    const expoTokens = allTokens
      .map(t => t.token)
      .filter(token => token && Expo.isExpoPushToken(token));

    console.log(`📱 [PUSH EVENTO] Enviando a ${expoTokens.length} dispositivos.`);

    if (expoTokens.length > 0) {
      const messages = expoTokens.map(token => ({
        to: token,
        sound: 'default',
        title: 'BienestAU 🔔',
        body: `BienestAU te invita al siguiente evento: ${result.title}`,
        priority: 'high',
        badge: 1,
        channelId: 'default',
        data: { type: 'reminder', contentId: docId, contentType: type },
      }));

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          console.log('✅ Notificación de evento enviada. Respuesta de Expo Tickets:', JSON.stringify(tickets, null, 2));

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
