// @ts-nocheck

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

  try {
    // 1. Crear o actualizar el aviso en la BD para la lista interna de la app
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
      console.log('ℹ️ Registro de reminder en DB omitido:', e?.message);
    }

    // 2. Obtener todos los tokens registrados en PostgreSQL
    const tokens = await getAllActiveTokens();

    // 3. Despachar notificación Push directamente a Expo Push REST API
    const notificationTitle = 'BienestAU 🔔';
    const notificationBody = `BienestAU te invita a leer nuestra nueva noticia: ${result.title}`;
    const extraData = { type: 'reminder', contentId: docId, contentType: type };

    await sendExpoPushNotifications(tokens, notificationTitle, notificationBody, extraData);

  } catch (error) {
    console.error('❌ [ERROR] Fallo en proceso de notificación de noticia:', error);
  }
}

async function getAllActiveTokens() {
  let tokens = [];

  try {
    const docs = await strapi.documents('api::notification-token.notification-token').findMany({
      limit: 1000,
    });
    if (docs && Array.isArray(docs)) {
      tokens = docs.map(d => (typeof d === 'string' ? d : d?.token)).filter(Boolean);
    }
  } catch (e) {
    console.log('ℹ️ Document service query notice:', e?.message);
  }

  if (tokens.length === 0) {
    try {
      const records = await strapi.db.query('api::notification-token.notification-token').findMany({});
      if (records && Array.isArray(records)) {
        tokens = records.map(r => (typeof r === 'string' ? r : r?.token)).filter(Boolean);
      }
    } catch (e) {
      console.log('ℹ️ DB query notice:', e?.message);
    }
  }

  console.log(`📊 [TOKENS EN BD]: Total recuperados (${tokens.length})`, tokens);
  return tokens;
}

async function sendExpoPushNotifications(tokens, title, body, data) {
  if (!tokens || tokens.length === 0) {
    console.log('⚠️ [PUSH] No hay tokens registrados en la BD para notificar.');
    return;
  }

  const uniqueTokens = Array.from(
    new Set(tokens.map(t => (typeof t === 'string' ? t.trim() : '')))
  ).filter(t => t.length > 0);

  console.log(`📱 [PUSH DISPATCH] Enviando a ${uniqueTokens.length} dispositivos activos:`, uniqueTokens);

  const messages = uniqueTokens.map(token => ({
    to: token,
    sound: 'default',
    title: title,
    body: body,
    priority: 'high',
    ttl: 86400,
    badge: 1,
    channelId: 'default',
    color: '#004A8B',
    _displayInForeground: true,
    data: data,
  }));

  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const responseJson = await res.json();
      console.log('✅ [EXPO PUSH API RESPONSE]:', JSON.stringify(responseJson, null, 2));
    } catch (error) {
      console.error('❌ [EXPO PUSH API ERROR]:', error?.message || error);
    }
  }
}
