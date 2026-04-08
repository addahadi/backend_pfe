const getExchangeSettings = async () => {
    // مستقبلاً يمكن جلب هذه القيم من جدول settings في Supabase
    return {
        black_market_coefficient: 1.7, // المعامل الخاص بالسوق السوداء 
        usd_to_dzd_base_rate: 225.31,   // سعر الصرف الأساسي المذكور في ملفك 
        budget_types: {
            optimistic: "min_price_usd",
            normal: "unit_price_usd",
            pessimistic: "max_price_usd"
        } // ربط نوع الميزانية بالعمود المناسب في قاعدة البيانات 
    };
};

module.exports = { getExchangeSettings };