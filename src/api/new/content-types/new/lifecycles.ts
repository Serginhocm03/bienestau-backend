// @ts-nocheck
export default {
  async afterCreate(event) {
    const { result } = event;
    console.log('🎬 LIFECYCLE: Noticia creada', result.title);

    if (!result.publishedAt) {
      console.log('⏸️ Noticia en borrador');
      return;
    }

    console.log('📢 Noticia publicada, enviando notificaciones...');

    try {
      const tokens = await strapi.entityService.findMany(
        'api::notification-token.notification-token',
        {
          filters: { active: true },
          fields: ['token'],
        }
      );

      const { Expo } = require('expo-server-sdk');
      const expo = new Expo();

      const expoTokens = tokens
        .map((t) => t.token)
        .filter((token) => Expo.isExpoPushToken(token));

      if (expoTokens.length === 0) {
        console.log('⚠️ No hay tokens válidos');
        return;
      }

      const messages = expoTokens.map((token) => ({
        to: token,
        sound: 'default',
        title: 'Nueva Noticia',
        body: result.title,
        data: { type: 'news', newsId: result.documentId },
      }));

      const chunks = expo.chunkPushNotifications(messages);

      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          console.error('❌ Error enviando chunk:', error);
        }
      }

      console.log('🎉 Notificaciones enviadas');
    } catch (error) {
      console.error('❌ Error:', error);
    }
  },

  async afterUpdate(event) {
    const { result, params } = event;

    console.log('🔄 LIFECYCLE: Noticia actualizada', result.title);

    // 🔥 CLAVE: solo cuando SE ACABA DE PUBLICAR
    if (!params.data.publishedAt) return;
    if (!result.publishedAt) return;

    console.log('📢 Noticia publicada (update), enviando notificaciones...');

    try {
      const tokens = await strapi.entityService.findMany(
        'api::notification-token.notification-token',
        {
          filters: { active: true },
          fields: ['token'],
        }
      );

      const { Expo } = require('expo-server-sdk');
      const expo = new Expo();

      const expoTokens = tokens
        .map((t) => t.token)
        .filter((token) => Expo.isExpoPushToken(token));

      if (expoTokens.length === 0) return;

      const messages = expoTokens.map((token) => ({
        to: token,
        sound: 'default',
        title: 'Nueva Noticia',
        body: result.title,
        data: { type: 'news', newsId: result.documentId },
      }));

      const chunks = expo.chunkPushNotifications(messages);

      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }

      console.log('🎉 Notificaciones enviadas');
    } catch (error) {
      console.error('❌ Error:', error);
    }
  },
};