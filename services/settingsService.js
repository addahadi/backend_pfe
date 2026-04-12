let settings = {
    market_factor: 1.7,
    currency: "DZD",
    tax_rate: 0.19
};

const getSettings = async () => {
    return settings;
};

const updateSettings = async (newData) => {
    settings = { ...settings, ...newData };
    return settings;
};

module.exports = { getSettings, updateSettings };