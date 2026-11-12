import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::notification-token.notification-token',
  ({ strapi }) => ({
    async create(ctx) {
      const data = ctx.request.body.data || ctx.request.body;
      const { token } = data;
      const user = ctx.state.user;

      if (!token) {
        return ctx.badRequest('Falta el token de notificación');
      }

      try {
        // En Strapi v5 intentamos primero Document Service y luego DB Query como respaldo
        let existing = null;
        try {
          const docs = await strapi.documents('api::notification-token.notification-token').findMany({
            filters: { token: { $eq: token } }
          });
          if (docs && docs.length > 0) existing = docs[0];
        } catch (_) {
          existing = await strapi.db.query('api::notification-token.notification-token').findOne({
            where: { token: token }
          });
        }

        if (existing) {
          console.log(`🔄 [PUSH TOKEN] Actualizando token existente (${existing.documentId || existing.id}): ${token}`);
          if (existing.documentId) {
            await strapi.documents('api::notification-token.notification-token').update({
              documentId: existing.documentId,
              data: {
                ...(user ? { user: user.id } : {}),
                active: true,
                last_used: new Date()
              }
            });
          } else {
            await strapi.db.query('api::notification-token.notification-token').update({
              where: { id: existing.id },
              data: {
                ...(user ? { user: user.id } : {}),
                active: true,
                last_used: new Date()
              }
            });
          }
          return { data: { success: true } };
        }

        console.log(`✨ [PUSH TOKEN] Creando nuevo token en la BD: ${token}`);
        let newToken;
        try {
          newToken = await strapi.documents('api::notification-token.notification-token').create({
            data: {
              token,
              ...(user ? { user: user.id } : {}),
              active: true,
              platform: data.platform || 'android',
              last_used: new Date()
            },
          });
        } catch (_) {
          newToken = await strapi.db.query('api::notification-token.notification-token').create({
            data: {
              token,
              ...(user ? { user: user.id } : {}),
              active: true,
              platform: data.platform || 'android',
              last_used: new Date()
            },
          });
        }

        return { data: newToken };
      } catch (error) {
        console.error('❌ Error en el controlador de tokens:', error);
        return ctx.internalServerError('Error al registrar dispositivo');
      }
    },
  })
);
