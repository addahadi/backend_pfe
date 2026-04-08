const supabase = require('../supabaseClient'); 
const { getExchangeSettings } = require('./exchangeService');

const calculateCategory = async (data) => {
    try {
        const { budget_type, category_name, materials = [], services = [] } = data;
        
        const settings = await getExchangeSettings();
        if (!settings || !settings.usd_to_dzd_base_rate) {
             throw new Error("Taux de change non disponible");
        }

        const rate = settings.usd_to_dzd_base_rate;
        const marketFactor = settings.market_factor || 1.7; 

        const priceKey = budget_type === 'optimiste' ? 'min_price_usd' : 
                         budget_type === 'pessimiste' ? 'max_price_usd' : 'unit_price_usd';

        let category_total = 0; 
        let materials_total = 0; 
        let services_total = 0;  
        let items_breakdown = [];

        // 1. حساب المواد بالتفصيل
        for (const mat of materials) {
            const { data: results } = await supabase
                .from('resource_catalog')
                .select('*')
                .eq('material_id', mat.material_id);

            const matData = results && results.length > 0 ? results[0] : null;

            if (matData) {
                const priceUsd = Number(matData[priceKey]) || Number(matData.unit_price_usd) || 0;
                const wasteFactor = Number(matData.default_waste_factor) || 0;
                const qty = Number(mat.quantite) || 0;

                // سعر الوحدة الواحدة بالدينار (شامل الصرف والضياع والماركت فاكتور)
                const unitPriceFinal = priceUsd * rate * (1 + wasteFactor) * marketFactor;
                const subtotalMat = qty * unitPriceFinal;
                
                materials_total += subtotalMat;
                category_total += subtotalMat;
                
                items_breakdown.push({
                    name: matData.material_name_en,
                    type: 'material',
                    quantity: qty,
                    unit_price: Number(unitPriceFinal.toFixed(2)),
                    total_item_dzd: Number(subtotalMat.toFixed(2))
                });
            }
        }

        // 2. حساب الخدمات بالتفصيل
        for (const svc of services) {
            const { data: results, error } = await supabase
                .from('service_config')
                .select('*')
                .eq('service_id', svc.service_id.trim());

            if (error) continue;

            const svcData = results && results.length > 0 ? results[0] : null;

            if (svcData) {
                const unitCostBase = (Number(svcData.equipment_cost) || 0) + 
                                     (Number(svcData.manpower_cost) || 0) + 
                                     (Number(svcData.install_labor_price) || 0);
                
                const unitCostFinal = unitCostBase * marketFactor;
                const qty = Number(svc.quantite) || 0;
                const subtotalSvc = qty * unitCostFinal;
                
                services_total += subtotalSvc;
                category_total += subtotalSvc;
                
                items_breakdown.push({
                    name: svcData.service_name_en,
                    type: 'service',
                    quantity: qty,
                    unit_price: Number(unitCostFinal.toFixed(2)),
                    total_item_dzd: Number(subtotalSvc.toFixed(2))
                });
            }
        }

        return {
            success: true,
            category_info: {
                name: category_name,
                market_factor: marketFactor,
                exchange_rate: rate
            },
            summary: {
                total_materials_only: Number(materials_total.toFixed(2)),
                total_services_only: Number(services_total.toFixed(2)),
                grand_total: Number(category_total.toFixed(2))
            },
            details: items_breakdown // هنا تخرج كل مادة وكل خدمة مع سعرها وكميتها
        };

    } catch (err) {
        console.error("❌ Error Detail:", err.message);
        throw err;
    }
};

module.exports = { calculateCategory };