export default () => ({
  upload: {
    config: {
      provider: "local",
    },
  },
  "strapi-v5-plugin-populate-deep": {
    config: {
      defaultDepth: 5,
    },
  },
  "users-permissions": {
    config: {
      register: {
        allowedFields: ["name", "type", "token"],
      },
      jwt: {
        expiresIn: "60d",
      },
    },
  },
});
