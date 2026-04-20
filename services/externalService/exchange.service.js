import axios from 'axios';
import sql from '../../config/database.js';

const getExchangeSettings = async () => {
    try {
        const apiUrl = 'https://api.exchangerate-api.com/v4/latest/USD';
        console.log('🌍 Tentative de connexion à l\'API Exchange Rate...');
        const response = await axios.get(apiUrl, { timeout: 3000 });
        console.log('📡 Réponse API:', response.data);
        const newRate = response.data.rates.DZD;

        if (newRate) {
            console.log('✅ Taux de change ACTUALISÉ récupéré : 1 USD = ' + newRate + ' DZD (Source: Internet)');

            const settingsRows = await sql`
                SELECT market_factor
                FROM financial_settings
                LIMIT 1
            `;
            const marketFactor = settingsRows[0]?.market_factor ?? 1.7;
            const finalRate = parseFloat((newRate * marketFactor).toFixed(4));

            console.log('✅ API rate: ' + newRate + ' * ' + marketFactor + ' = ' + finalRate + ' DZD');

            const today = new Date().toISOString().split('T')[0];

            await sql`
                INSERT INTO exchange_rate_log (
                    official_rate,
                    final_applied_rate,
                    api_status,
                    last_sync_at
                )
                VALUES (${newRate}, ${finalRate}, true, ${today})
            `;
            return { official_rate: newRate, final_applied_rate: finalRate, source: 'external_api' };
        }
    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            console.log('⚠️ API trop lente, utilisation du taux par défaut (134.0)');
        } else {
            console.error('❌ Erreur API Exchange :', error.message);
        }

        const rows = await sql`
            SELECT official_rate, final_applied_rate, last_sync_at
            FROM exchange_rate_log
            ORDER BY last_sync_at DESC
            LIMIT 1
        `;
        const data = rows[0];

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
