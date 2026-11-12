// @ts-nocheck
const { Expo } = require('expo-server-sdk');

module.exports = {
  async afterCreate(event) {
    const { result } = event || {};
    console.log('✨ [LIFECYCLE afterCreate] Nueva Noticia:', result?.title);
    await processContentAndNotify(result, 'news');
  },
  async afterUpdate(event) {
    const { result } = event || {};
    console.log('🔄 [LIFECYCLE afterUpdate] Noticia actualizada:', result?.title);
    await processContentAndNotify(result, 'news');
  },
  async afterDelete(event) {
    const { result } = event || {};
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
    try {
      const existing = await strapi.db.query('api::reminder.reminder').findMany({
        where: { contentId: docId, contentType: type }
      });
      for (const r of existing) {
        await strapi.db.query('api::reminder.reminder').delete({ where: { id: r.id } });
      }
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
    } catch (e) {
      console.log('ℹ️ Registro de reminder en DB omitido o fallido:', e?.message);
    }

    // 2. Obtener todos los tokens registrados en la base de datos (doble estrategia para Strapi v5)
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

    console.log(`📊 [NOTICIA] Total registros recuperados de BD: ${allTokens?.length || 0}`);

    const expoTokens = (allTokens || [])
      .map(t => (typeof t === 'string' ? t : t?.token))
      .filter(token => token && typeof token === 'string' && Expo.isExpoPushToken(token));

    console.log(`📱 [PUSH NOTICIA] Tokens Expo válidos a notificar: ${expoTokens.length}`, expoTokens);

    if (expoTokens.length > 0) {
      const messages = expoTokens.map(token => ({
        to: token,
        sound: 'default',
        title: 'BienestAU 🔔',
        body: `BienestAU te invita a leer nuestra nueva noticia: ${result.title}`,
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
