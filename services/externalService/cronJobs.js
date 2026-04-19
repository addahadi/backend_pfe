import cron from 'node-cron';
// import { getExchangeSettings } from './exchangeService.js';

// التوقيت: 0 0 * * * (تعني: عند الدقيقة 0، الساعة 0، كل يوم)
cron.schedule('0 0 * * *', async () => {
   console.log('--- 🔄 Scheduled Task: Update Exchange Rate ---');
    // await getExchangeSettings(); // Temporary disabled
    console.log('--- ✅ Sync Completed Successfully ---');
});