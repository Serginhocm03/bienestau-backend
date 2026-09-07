// @ts-nocheck
export default {
  async afterCreate(event) {
    const { result } = event;
    console.log('🎬 [REMINDER LIFECYCLE] afterCreate:', result.title);
    
    if (result.publishedAt) {
      console.log('📢 Reminder is published, notifying users...');
      
      try {
        const { Expo } = require('expo-server-sdk');
        const expo = new Expo();

        // Use strapi.db to get all active tokens
        const tokens = await strapi.db.query('api::notification-token.notification-token').findMany({
          where: { active: true },
          populate: ['user']
        });

        console.log(`📊 Found ${tokens.length} active tokens`);

        if (tokens.length === 0) return;

        let filteredTokens = tokens;
        if (result.to && result.to !== 'all') {
          filteredTokens = tokens.filter(t => t.user && t.user.type === result.to);
        }

        const expoTokens = filteredTokens
          .map(t => t.token)
          .filter(token => Expo.isExpoPushToken(token));

        console.log(`✅ ${expoTokens.length} valid Expo tokens`);

        if (expoTokens.length === 0) return;

        const messages = expoTokens.map((token) => ({
          to: token,
          sound: 'default',
          title: result.title.includes(':') ? result.title.split(':')[0] : 'BienestAU',
          body: result.title.includes(':') ? result.title.split(':').slice(1).join(':').trim() : result.title,
          data: { type: 'reminder', reminderId: result.documentId || result.id },
        }));

        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          try {
            await expo.sendPushNotificationsAsync(chunk);
          } catch (error) {
            console.error('❌ Error sending chunk:', error);
          }
        }
        console.log('🎉 Notifications sent successfully');
      } catch (error) {
        console.error('❌ Critical error in notifications:', error);
      }
    }
  },
};