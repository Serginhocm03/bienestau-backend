// @ts-nocheck
export default {
  async afterCreate(event) {
    const { result } = event;
    console.log('🎬 [NEWS LIFECYCLE] afterCreate:', result.title);

    if (result.publishedAt) {
      try {
        await strapi.documents('api::reminder.reminder').create({
          data: {
            title: `Nueva Noticia: ${result.title}`,
            description: result.description || 'Consulta los detalles en la sección de noticias',
            to: 'all',
            publishedAt: new Date().toISOString(),
          },
        });
        console.log('✅ Reminder created for new news');
      } catch (error) {
        console.error('❌ Error creating reminder:', error);
      }
    }
  },

  async afterUpdate(event) {
    const { result, params } = event;
    if (params.data.publishedAt && result.publishedAt) {
      try {
        await strapi.documents('api::reminder.reminder').create({
          data: {
            title: `Nueva Noticia: ${result.title}`,
            description: result.description || 'Consulta los detalles en la sección de noticias',
            to: 'all',
            publishedAt: new Date().toISOString(),
          },
        });
        console.log('✅ Reminder created for published news');
      } catch (error) {
        console.error('❌ Error:', error);
      }
    }
  },
};