export default ({ env }) => ({
  upload: {
    config: {
      provider: "cloudinary",
      providerOptions: {
        cloud_name: env("CLOUDINARY_NAME"),
        api_key: env("CLOUDINARY_KEY"),
        api_secret: env("CLOUDINARY_SECRET"),
      },
      actionOptions: {
        upload: {},
        delete: {},
      },
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
