// @ts-nocheck
export default {
  async afterCreate(event) {
    const { result } = event;
    if (result.publishedAt) {
      try {
        await strapi.entityService.create('api::reminder.reminder', {
          data: {
            title: `Nuevo Evento: ${result.title}`,
            description: result.description || 'Consulta los detalles en la sección de eventos',
            to: 'all',
            fecha_evento: result.fecha_evento,
            publishedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('❌ Error creating reminder:', error);
      }
    }
  },
  async afterUpdate(event) {
    const { result, params } = event;
    if (params.data.publishedAt && result.publishedAt) {
      try {
        await strapi.entityService.create('api::reminder.reminder', {
          data: {
            title: `Nuevo Evento: ${result.title}`,
            description: result.description || 'Consulta los detalles en la sección de eventos',
            to: 'all',
            fecha_evento: result.fecha_evento,
            publishedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('❌ Error in update:', error);
      }
    }
  },
};