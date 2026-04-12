const supabase = require('../../supabaseClient');
const { getExchangeSettings } = require('../exchangeService');
console.log("Type of function:", typeof getExchangeSettings);


const calculateCategory = async (data) => {
    try {
        const { budget_type, category_name, materials = [], services = [] } = data;

        const settings = await getExchangeSettings();
        console.log("Settings Received:", settings);
        if (!settings || !settings.official_rate) {
            throw new Error("Taux de change non disponible");
        }

        const rate = settings.official_rate;
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
const createAndSaveEstimation = async (data) => {
    try {
        // 1. تشغيل عملية الحساب (دالتك الأصلية)
        const calculation = await calculateCategory(data);

        // 2. الحفظ في الجدول الرئيسي (public.estimation)
        const { data: savedEst, error: estErr } = await supabase
            .from('estimation')
            .insert([{
                project_id: data.project_id,
                budget_type: data.budget_type,
                total_budget: calculation.summary.grand_total
            }])
            .select().single();

        if (estErr) throw estErr;

        // 3. الحفظ في جدول التفاصيل (public.estimation_detail_material)
        // قمنا بمطابقة الأسماء مع صور سوبابيز التي أرسلتِها
        const materialsToSave = calculation.details
            .filter(item => item.type === 'material')
            .map(mat => ({
                estimation_id: savedEst.estimation_id, // الربط مع الأب
                material_id: mat.id,
                quantity: mat.quantity,
                applied_waste_factor: mat.waste_factor || 0,
                exchange_rate_snapshot: calculation.category_info.exchange_rate,
                sub_total: mat.total_item_dzd
            }));

        if (materialsToSave.length > 0) {
            await supabase.from('estimation_detail_material').insert(materialsToSave);
        }

        return savedEst;
    } catch (err) {
        console.error("❌ فشل توزيع البيانات على الجداول:", err.message);
        throw err;
    }
};

module.exports = {
    calculateCategory,
    createAndSaveEstimation
};