import axios from 'axios';
import supabase from '../../supabaseClient.js';
import { AppError } from '../../utils/AppError.js';

const getExchangeSettings = async () => {
    try {
        const apiUrl = 'https://api.exchangerate-api.com/v4/latest/USD';
        console.log('🌍 Tentative de connexion à l\'API Exchange Rate...');
        const response = await axios.get(apiUrl, { timeout: 3000 });
        console.log('📡 Réponse API:', response.data);
        const newRate = response.data.rates.DZD;

        if (newRate) {
            console.log('✅ Taux de change ACTUALISÉ récupéré : 1 USD = ' + newRate + ' DZD (Source: Internet)');

            const { data: settings } = await supabase.from('financial_settings').select('market_factor').single();
            const marketFactor = settings?.market_factor || 1.7;
            const finalRate = parseFloat((newRate * marketFactor).toFixed(4));

            console.log('✅ API rate: ' + newRate + ' * ' + marketFactor + ' = ' + finalRate + ' DZD');

            const today = new Date().toISOString().split('T')[0];

            await supabase.from('exchange_rate_log').insert([
                {
                    official_rate: newRate,
                    final_applied_rate: finalRate,
                    api_status: true,
                    last_sync_at: today
                },
            ]);
            return { official_rate: newRate, final_applied_rate: finalRate, source: 'external_api' };
        }
    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            console.log('⚠️ API trop lente, utilisation du taux par défaut (134.0)');
        } else {
            console.error('❌ Erreur API Exchange :', error.message);
        }

        // محاولة جلب آخر قيمة من قاعدة البيانات (Cache/DB)
        const { data } = await supabase
            .from('exchange_rate_log')
            .select('official_rate, final_applied_rate, last_sync_at')
            .order('last_sync_at', { ascending: false })
            .limit(1)
            .single();

        if (data) {
            console.log('✅ Taux récupéré depuis le cache local : 1 USD = ' + data.official_rate + ' DZD (Dernier sync: ' + data.last_sync_at + ')');
            return { official_rate: data.official_rate, final_applied_rate: data.final_applied_rate, source: 'database' };
        }
    }

    // Fallback
    console.log("⚠️ Application du taux par défaut (134.0 DZD).");
    return { official_rate: 134.0, final_applied_rate: parseFloat((134.0 * 1.7).toFixed(4)), source: 'fallback' };
};

export { getExchangeSettings };