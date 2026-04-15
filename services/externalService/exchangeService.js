import axios from 'axios';
import supabase from '../../supabaseClient.js';
import { AppError } from '../../utils/AppError.js';

const getExchangeSettings = async () => {
    try {
        const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
        const newRate = response.data.rates.DZD;

        if (newRate) {
            console.log(`✅ Exchange rate fetched from API: ${newRate}`);
            await supabase.from('ExchangeRateLog').insert([
                { official_rate: newRate, last_sync_at: new Date(), source: 'API_v4' },
            ]);
            return { official_rate: newRate, source: 'external_api' };
        }
    } catch (error) {
        console.error('Exchange API Error:', error.message);

        // محاولة جلب آخر قيمة من قاعدة البيانات
        const { data } = await supabase
            .from('ExchangeRateLog')
            .select('official_rate')
            .order('last_sync_at', { ascending: false })
            .limit(1)
            .single();

        if (data) return { official_rate: data.official_rate, source: 'database' };
    }

    // Fallback
    return { official_rate: 134.5, source: 'fallback' };
};

export { getExchangeSettings };