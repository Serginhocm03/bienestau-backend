import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::notification-token.notification-token',
  ({ strapi }) => ({
    async create(ctx) {
      const { token, platform } = ctx.request.body.data;
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Usuario no autenticado');
      }

      if (!token || !platform) {
        return ctx.badRequest('Token y plataforma son requeridos');
      }

      console.log(`📱 Registro de token para usuario ${user.id}`);

      try {
        // Buscar token existente
        const existingToken = await strapi.entityService.findMany(
          'api::notification-token.notification-token',
          {
            filters: {
              token,
            },
            populate: ['user'],
          }
        );

        if (existingToken && existingToken.length > 0) {
          console.log('♻️ Token existente, actualizando...');
          
          const updated = await strapi.entityService.update(
            'api::notification-token.notification-token',
            existingToken[0].id,
            {
              data: {
                user: user.id,
                platform,
                active: true,
              },
            }
          );

          return { data: updated };
        }

        // Desactivar tokens anteriores del mismo usuario y plataforma
        const userTokens = await strapi.entityService.findMany(
          'api::notification-token.notification-token',
          {
            filters: {
              user: user.id,
              platform,
              active: true,
            },
          }
        );

        for (const oldToken of userTokens) {
          await strapi.entityService.update(
            'api::notification-token.notification-token',
            oldToken.id,
            {
              data: { active: false },
            }
          );
        }

        console.log('✅ Creando nuevo token');

        // Crear nuevo token
        const newToken = await strapi.entityService.create(
          'api::notification-token.notification-token',
          {
            data: {
              token,
              platform,
              user: user.id,
              active: true,
            },
          }
        );

        return { data: newToken };
      } catch (error) {
        console.error('❌ Error en notification-token controller:', error);
        return ctx.internalServerError('Error al procesar el token');
      }
    },
  })
);