export default {
  routes: [
    {
      method: 'POST',
      path: '/notification-tokens',
      handler: 'api::notification-token.notification-token.create',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/notification-tokens',
      handler: 'api::notification-token.notification-token.find',
      config: {
        auth: false,
      },
    },
  ],
};
