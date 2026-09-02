// @ts-nocheck
export default {
  async afterCreate(event) {
    const { result } = event;
    console.log('🎬 LIFECYCLE: Evento creado', result.title);

    if (!result.publishedAt) {
      console.log('⏸️ Evento en borrador');
      return;
    }

    console.log('📢 Evento publicado, enviando notificaciones...');

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

      console.log(`📤 Enviando a ${expoTokens.length} dispositivos`);

      const messages = expoTokens.map((token) => ({
        to: token,
        sound: 'default',
        title: 'Nuevo Evento',
        body: result.title,
        data: { type: 'event', eventId: result.documentId },
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
      console.error('❌ Error enviando notificaciones:', error);
    }
  },

  async afterUpdate(event) {
    const { result, params } = event;

    console.log('🔄 LIFECYCLE: Evento actualizado', result.title);

    // 🔥 Solo cuando se publica realmente
    if (!params.data.publishedAt) return;
    if (!result.publishedAt) return;

    console.log('📢 Evento publicado (update), enviando notificaciones...');

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

      console.log(`📤 Enviando a ${expoTokens.length} dispositivos`);

      const messages = expoTokens.map((token) => ({
        to: token,
        sound: 'default',
        title: 'Nuevo Evento',
        body: result.title,
        data: { type: 'event', eventId: result.documentId },
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