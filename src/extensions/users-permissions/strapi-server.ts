export default (plugin) => {
  //   plugin.controllers.user.updateMe = async (ctx) => {
  //     strapi.log.info("updateMe");

  //     if (!ctx.state.user || !ctx.state.user.id)
  //       return (ctx.response.status = 401);

  //     console.log(ctx.request.body);

  //     await strapi
  //       .query("plugin::users-permissions.user")
  //       .update({
  //         where: { id: ctx.state.user.id },
  //         data: ctx.request.body,
  //       })
  //       .then(async () => {
  //         // ctx.send({ data: ctx.state.user });
  //         ctx.response.status = 200;
  //       });
  //   };

  //   plugin.routes["content-api"].routes.push({
  //     method: "PUT",
  //     path: "/users/me",
  //     handler: "user.updateMe",
  //   });

  // -------------------------------------------

  //   plugin.controllers.user.updateMe = (ctx) => {
  //     ctx.params.id = ctx.state.user.id;
  //     return plugin.controllers.user.update(ctx);
  //   };

  //   plugin.routes["content-api"].routes.push({
  //     method: "PUT",
  //     path: "/users/me",
  //     handler: "user.updateMe",
  //     config: {
  //       policies: [],
  //       prefix: "",
  //     },
  //   });

  // -------------------------------------------

  //   const getController = (name) => {
  //     return strapi.plugins["users-permissions"].controller(name);
  //   };

  //   // Create the new controller
  //   plugin.controllers.user.me = async (ctx) => {
  //     const user = ctx.state.user;

  //     // User has to be logged in to update themselves
  //     if (!user) {
  //       return ctx.unauthorized();
  //     }
  //     console.log("calling about meeeeeeeeeee------");
  //     return;
  //   };

  //   // Add the custom route
  //   plugin.routes["content-api"].routes.unshift({
  //     method: "GET",
  //     path: "/users/me",
  //     handler: "user.me",
  //     config: {
  //       prefix: "",
  //     },
  //   });

  plugin.controllers.user.updateMe = async (ctx) => {
    strapi.log.info(
      JSON.stringify(strapi.config.get("plugin::users-permissions"), null, 2)
    );
  };

  plugin.routes["content-api"].routes.push({
    method: "PUT",
    path: "/users/me",
    handler: "user.updateMe",
  });

  return plugin;
};
