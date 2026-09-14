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
        // Buscamos si ya existe ese token para cualquier usuario
        const existing = await strapi.db.query('api::notification-token.notification-token').findOne({
          where: { token: token }
        });

        if (existing) {
          // Si ya existe, lo actualizamos al usuario actual y lo activamos
          const updated = await strapi.db.query('api::notification-token.notification-token').update({
            where: { id: existing.id },
            data: { user: user.id, active: true }
          });
          return { data: updated };
        }

        // Si es nuevo, lo creamos
        const newToken = await strapi.db.query('api::notification-token.notification-token').create({
          data: {
            token,
            user: user.id,
            active: true,
            platform: 'android'
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
