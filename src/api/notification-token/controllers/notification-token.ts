import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::notification-token.notification-token',
  ({ strapi }) => ({
    async create(ctx) {
      const data = ctx.request.body.data || ctx.request.body;
      const { token } = data;
      const user = ctx.state.user;

      if (!user || !token) return ctx.badRequest('Faltan datos');

      try {
        // Buscamos si ya existe ese token
        const existing = await strapi.db.query('api::notification-token.notification-token').findOne({
          where: { token: token }
        });

        if (existing) {
          console.log('🔄 Actualizando token existente para el usuario:', user.id);
          const updated = await strapi.db.query('api::notification-token.notification-token').update({
            where: { id: existing.id },
            data: {
              user: user.id,
              active: true,
              last_used: new Date()
            }
          });
          return { data: updated };
        }

        console.log('✨ Creando nuevo registro de token para el usuario:', user.id);
        const newToken = await strapi.db.query('api::notification-token.notification-token').create({
          data: {
            token,
            user: user.id,
            active: true,
            platform: data.platform || 'android',
            last_used: new Date()
          },
        });

        return { data: newToken };
      } catch (error) {
        console.error('❌ Error en el controlador de tokens:', error);
        return ctx.internalServerError('Error al registrar dispositivo');
      }
    },
  })
);
