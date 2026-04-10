const cron = require('node-cron');
const { getExchangeSettings } = require('./exchangeService');
// التوقيت: 0 0 * * * (تعني: عند الدقيقة 0، الساعة 0، كل يوم)
cron.schedule('0 0 * * *', async () => {
   console.log('--- 🔄 Scheduled Task: Update Exchange Rate ---');
    await getExchangeSettings();
    console.log('--- ✅ Sync Completed Successfully ---');
});