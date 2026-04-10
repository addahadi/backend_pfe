const axios = require('axios');
const supabase = require('../supabaseClient');

const getExchangeSettings = async () => {
    try {
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
        
        // تأكدي من هذا السطر: لازم يكون DZD كابيتال (حروف كبيرة)
        const newRate = response.data.rates.DZD; 

        if (newRate) {
           console.log(`✅ Success: Exchange rate fetched from API: ${newRate} `);
            // حفظ في السوبابيس
            await supabase.from('ExchangeRateLog').insert([
                { official_rate: newRate, last_sync_at: new Date(), source: 'API_v4' }
            ]);
            
            // لازم نرجعوا أوبجكت فيه official_rate
            return { official_rate: newRate, source: 'external_api' };
        }
    } catch (error) {
        console.error("API Error:", error.message);
        // محاولة جلب من الداتابيز
        const { data } = await supabase
            .from('ExchangeRateLog')
            .select('official_rate')
            .order('last_sync_at', { ascending: false })
            .limit(1)
            .single();

        if (data) return { official_rate: data.official_rate, source: 'database' };
    }

    // الحل الأخير - تأكدي أن القيمة هنا ليست 0
    return { official_rate: 134.5, source: 'fallback' }; 
};

module.exports = { getExchangeSettings };