import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::notification-token.notification-token',
  ({ strapi }) => ({
    async create(ctx) {
      const data = ctx.request.body.data || ctx.request.body;
      const { token, platform } = data;
      const user = ctx.state.user;

      if (!user) return ctx.unauthorized('Usuario no identificado');
      if (!token) return ctx.badRequest('Token faltante');

      try {
        // 1. Buscamos cualquier registro que tenga este mismo TOKEN (de este celular)
        const existing = await strapi.documents('api::notification-token.notification-token').findMany({
          filters: { token: token },
        });

        // 2. Borramos los registros viejos de este dispositivo para que no haya basura
        if (existing.length > 0) {
          for (const doc of existing) {
            await strapi.documents('api::notification-token.notification-token').delete({
              documentId: doc.documentId,
            });
          }
          console.log(`🧹 Limpieza de tokens antiguos completada para: ${user.username}`);
        }

        // 3. Creamos el registro único y limpio como ACTIVO
        const newToken = await strapi.documents('api::notification-token.notification-token').create({
          data: {
            token,
            platform: platform || 'android',
            user: user.id,
            active: true,
          },
        });

        console.log(`✅ Dispositivo de ${user.username} registrado correctamente.`);
        return { data: newToken };
      } catch (error) {
        console.error('❌ Error en el registro de dispositivo:', error);
        return ctx.internalServerError('Error servidor');
      }
    },
  })
);
