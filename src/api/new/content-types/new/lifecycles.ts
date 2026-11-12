// @ts-nocheck
const { Expo } = require('expo-server-sdk');

export default {
  async afterCreate(event) {
    const { result } = event;
    console.log('✨ [TRIGGER] Nueva Noticia creada:', result?.title);
    await processContentAndNotify(result, 'news');
  },
  async afterUpdate(event) {
    const { result } = event;
    console.log('🔄 [TRIGGER] Noticia actualizada:', result?.title);
    await processContentAndNotify(result, 'news');
  },
  async afterDelete(event) {
    const { result } = event;
    const docId = result?.documentId || result?.id?.toString();
    try {
      const reminders = await strapi.db.query('api::reminder.reminder').findMany({
        where: { contentId: docId, contentType: 'news' }
      });
      for (const r of reminders) {
        await strapi.db.query('api::reminder.reminder').delete({ where: { id: r.id } });
      }
    } catch (error) {
      console.error('❌ Error en limpieza de noticia:', error);
    }
  }
};

async function processContentAndNotify(result, type) {
  if (!result) return;
  if (result.publishedAt === null) return;

  const docId = result.documentId || result.id?.toString();
  const expo = new Expo();

  try {
    // 1. Limpiar avisos viejos para este contenido y crear uno nuevo en la app
    const existing = await strapi.db.query('api::reminder.reminder').findMany({
      where: { contentId: docId, contentType: type }
    });
    for (const r of existing) {
      await strapi.db.query('api::reminder.reminder').delete({ where: { id: r.id } });
    }

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

    // 2. Obtener todos los tokens registrados en la base de datos
    const allTokens = await strapi.db.query('api::notification-token.notification-token').findMany({});
    console.log(`📊 [NOTICIA] Total tokens registrados en BD: ${allTokens.length}`);

    const expoTokens = allTokens
      .map(t => t.token)
      .filter(token => token && Expo.isExpoPushToken(token));

    console.log(`📱 [PUSH NOTICIA] Tokens válidos Expo a notificar: ${expoTokens.length}`);

    if (expoTokens.length > 0) {
      const messages = expoTokens.map(token => ({
        to: token,
        sound: 'default',
        title: 'BienestAU 🔔',
        body: `BienestAU te invita a leer nuestra nueva noticia: ${result.title}`,
        priority: 'high',
        badge: 1,
        channelId: 'default',
        data: { type: 'reminder', contentId: docId, contentType: type },
      }));

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          console.log('✅ Notificación de noticia enviada. Respuesta de Expo Tickets:', JSON.stringify(tickets, null, 2));

          for (const ticket of tickets) {
            if (ticket.status === 'error') {
              console.error(`❌ Error en entrega de ticket (${ticket.details?.error}):`, ticket.message);
            }
          }
        } catch (pushErr) {
          console.error('❌ Error enviando chunk de push de noticia:', pushErr);
        }
      }
      console.log(`✅ [PUSH] Proceso de envío completado para ${expoTokens.length} dispositivos.`);
    } else {
      console.log('⚠️ No se enviaron notificaciones push: No hay tokens Expo válidos guardados en BD aún.');
    }
  } catch (error) {
    console.error('❌ [ERROR] Fallo enviando noticia:', error);
  }
}
