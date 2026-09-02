/**
 * reminder service
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreService(
  "api::reminder.reminder",
  ({ strapi }) => ({
    async create(params) {
      const result = await super.create(params);

      strapi.log.info(result);

      return result;
    },
  })
);
