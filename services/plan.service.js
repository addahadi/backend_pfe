import sql from "../config/database.js";

// إنشاء Plan

export const createPlan = async({name,price,duration,type}) => {
const result = await sql `
INSERT INTO plans (name,pirce,duration,type)
VALUES (${name},${price},${duration},${type})
RETURNING id,name,price,duration,type

`;

return result[0];

};
 
//Add Feature to Plan )

export const addFeature = async({planId,key,value}) => {
// check if plan exists 

const plan = await sql `
SELECT id FROM plans WHERE id = ${planId}

`;
if (plan.length === 0 ){
    const error = new Error('Plan not found');
    error.statusCode = 404;
    throw error;
} 
// insert feature 
const result = await sql `
INSERT INTO features (plan_id,feature_key, feature_value)
VALUES (${planId},${key},${value})
RETURINING id, feature_key ,feature_value

`;
return result[0];

};

//3. Get Plans with Features (🔥🔥 IMPORTANT FOR UI)
export const getPlans = async () => {
  const rows = await sql`
    SELECT 
      p.id,
      p.name,
      p.price,
      p.duration,
      p.type,
      f.feature_key,
      f.feature_value
    FROM plans p
    LEFT JOIN features f ON p.id = f.plan_id
  `;
   const plans = {};

  rows.forEach(row => {
    if (!plans[row.id]) {
      plans[row.id] = {
        id: row.id,
        name: row.name,
        price: row.price,
        duration: row.duration,
        type: row.type,
        features: {}
      };
    }

    if (row.feature_key) {
      plans[row.id].features[row.feature_key] = row.feature_value;
    }
  });

  return Object.values(plans);

};