export default (plugin) => {
  let original = plugin.controllers["collection-types"].create;

  plugin.controllers["collection-types"].create = async (ctx) => {
    const result = await original(ctx);

    const { model } = ctx.params;
    const { body } = ctx.request;

    if (model == "api::reminder.reminder") {
      // TODO: notify reminder
    }

    return result;
  };

  return plugin;
};
