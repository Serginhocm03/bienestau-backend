/**
 * reminder controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::reminder.reminder",
  ({ strapi }) => ({
    async create(ctx) {
      const response = await super.create(ctx);

      const { data: reminder } = response;

      console.log(reminder);

      return response;
    },
  })
);
