// @ts-nocheck
export default {
  async afterCreate(event) {
    const { result } = event;
    console.log('🎬 LIFECYCLE: Recordatorio creado', result.title);
    
    if (result.publishedAt) {
      console.log('📢 Recordatorio publicado, enviando notificaciones...');
      
      try {
        // SIEMPRE traer todos los tokens con sus usuarios
        const allTokens = await strapi.entityService.findMany(
          'api::notification-token.notification-token',
          {
            filters: { active: true },
            populate: {
              user: {
                fields: ['id', 'type', 'email']
              }
            }
          }
        );

        console.log(`📊 Total de tokens activos: ${allTokens.length}`);

        let filteredTokens = [];

        if (result.to === 'all') {
          console.log('📣 Enviando a TODOS los usuarios');
          filteredTokens = allTokens;
          
        } else if (result.to === 'students') {
          console.log('🎓 Filtrando solo ESTUDIANTES...');
          filteredTokens = allTokens.filter((t) => {
            if (!t.user) {
              console.log(`⚠️ Token sin usuario: ${t.token}`);
              return false;
            }
            console.log(`  - Usuario ${t.user.email}: type=${t.user.type}`);
            return t.user.type === 'student';
          });
          
        } else if (result.to === 'managers') {
          console.log('👔 Filtrando solo ADMINISTRADORES...');
          filteredTokens = allTokens.filter((t) => {
            if (!t.user) {
              console.log(`⚠️ Token sin usuario: ${t.token}`);
              return false;
            }
            console.log(`  - Usuario ${t.user.email}: type=${t.user.type}`);
            return t.user.type === 'manager';
          });
          
        } else {
          console.log('⚠️ Campo "to" no reconocido, enviando a todos');
          filteredTokens = allTokens;
        }

        console.log(`📤 ${filteredTokens.length} destinatario(s) después del filtro`);

        if (filteredTokens.length === 0) {
          console.log('⚠️ No hay destinatarios');
          return;
        }

        const validTokenStrings = filteredTokens.map((t) => t.token);

        const { Expo } = require('expo-server-sdk');
        const expo = new Expo();

        const expoTokens = validTokenStrings.filter((token) => Expo.isExpoPushToken(token));

        if (expoTokens.length === 0) {
          console.log('⚠️ No hay tokens válidos de Expo');
          return;
        }

        console.log(`✅ ${expoTokens.length} token(s) válido(s) de Expo`);

        const messages = expoTokens.map((token) => ({
          to: token,
          sound: 'default',
          title: 'Nuevo Recordatorio',
          body: result.title,
          data: { type: 'reminder', reminderId: result.documentId },
        }));

        const chunks = expo.chunkPushNotifications(messages);
        
        for (const chunk of chunks) {
          try {
            const tickets = await expo.sendPushNotificationsAsync(chunk);
            console.log(`✅ Chunk enviado, tickets:`, tickets.length);
          } catch (error) {
            console.error('❌ Error enviando chunk:', error);
          }
        }

        console.log('🎉 Notificaciones enviadas exitosamente');
      } catch (error) {
        console.error('❌ Error enviando notificaciones:', error);
      }
    } else {
      console.log('⏸️ Recordatorio en borrador');
    }
  },

  async afterUpdate(event) {
    const { result, params } = event;

    console.log('🔄 LIFECYCLE: Recordatorio actualizado', result.title);

    if (result.publishedAt && params.data.publishedAt) {
      console.log('📢 Recordatorio publicado (update)...');
      
      try {
        const allTokens = await strapi.entityService.findMany(
          'api::notification-token.notification-token',
          {
            filters: { active: true },
            populate: {
              user: {
                fields: ['id', 'type', 'email']
              }
            }
          }
        );

        let filteredTokens = [];

        if (result.to === 'all') {
          filteredTokens = allTokens;
        } else if (result.to === 'students') {
          filteredTokens = allTokens.filter((t) => t.user && t.user.type === 'student');
        } else if (result.to === 'managers') {
          filteredTokens = allTokens.filter((t) => t.user && t.user.type === 'manager');
        } else {
          filteredTokens = allTokens;
        }

        if (filteredTokens.length > 0) {
          const validTokenStrings = filteredTokens.map((t) => t.token);
          const { Expo } = require('expo-server-sdk');
          const expo = new Expo();
          const expoTokens = validTokenStrings.filter((token) => Expo.isExpoPushToken(token));

          if (expoTokens.length > 0) {
            const messages = expoTokens.map((token) => ({
              to: token,
              sound: 'default',
              title: '⏰ Recordatorio',
              body: result.title,
              data: { type: 'reminder', reminderId: result.documentId },
            }));

            const chunks = expo.chunkPushNotifications(messages);
            for (const chunk of chunks) {
              await expo.sendPushNotificationsAsync(chunk);
            }

            console.log('🎉 Notificaciones enviadas');
          }
        }
      } catch (error) {
        console.error('❌ Error:', error);
      }
    }
  },
};