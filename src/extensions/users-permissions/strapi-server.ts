export default (plugin) => {
  plugin.controllers.user.updateMe = async (ctx) => {
    if (!ctx.state.user || !ctx.state.user.id) {
      return ctx.unauthorized("Debes estar autenticado");
    }

    const userId = ctx.state.user.id;
    const { name, avatar } = ctx.request.body;

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedUser = await strapi.db.query("plugin::users-permissions.user").update({
      where: { id: userId },
      data: updateData,
      populate: ["avatar"],
    });

    ctx.body = updatedUser;
  };

  plugin.routes["content-api"].routes.push({
    method: "PUT",
    path: "/users/me",
    handler: "user.updateMe",
    config: {
      prefix: "",
    },
  });

  return plugin;
};
