// استيراد مكتبة تشفير كلمات المرور
import bcrypt from "bcrypt";

// استيراد مكتبة إنشاء JWT tokens
import jwt from "jsonwebtoken";



// استيراد الاتصال بقاعدة البيانات
import sql from "../config/database.js";


// دالة التسجيل (Register Service)
export const register = async ({ name, email, password }) => {

  // -----------------------------
  // 1️⃣ التحقق إذا كان البريد الإلكتروني موجود مسبقاً
  // -----------------------------
  const users = await sql`
    SELECT id FROM users WHERE email = ${email}
  `;

  // إذا وجدنا مستخدم بنفس البريد الإلكتروني نرجع خطأ
  if (users.length > 0) {
    const error = new Error("Email already exists");
    error.statusCode = 400;
    throw error;
  }


  // -----------------------------
  // 2️⃣ تشفير كلمة المرور قبل حفظها في قاعدة البيانات
  // -----------------------------
  const hashedPassword = await bcrypt.hash(password, 10);
  // الرقم 10 هو مستوى التشفير (salt rounds)


  
  // -----------------------------
  // 4️⃣ حفظ المستخدم في قاعدة البيانات
  // -----------------------------
  await sql`
    INSERT INTO users (name,email,password)
    VALUES (${name}, ${email}, ${hashedPassword})
    RETURNING id 
  `;
   // استخراج id الذي أنشأته قاعدة البيانات
  const userId = newUser[0].id;


  // -----------------------------
  // 5️⃣ إنشاء Access Token
  // يستخدم للوصول إلى API
  // -----------------------------
  const accessToken = jwt.sign(
    { userId }, // البيانات داخل التوكن
    process.env.JWT_SECRET, // المفتاح السري
    { expiresIn: "15m" } // مدة الصلاحية
  );

// -----------------------------
// 6️⃣ إنشاء Refresh Token
// -----------------------------
const refreshToken = jwt.sign(
  { userId },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: "7d" }
);

// -----------------------------
// 6.1️⃣ حفظ Refresh Token في قاعدة البيانات
// -----------------------------
const refreshTokenId = uuidv4();

await sql`
INSERT INTO refresh_tokens (id, user_id, token, expires_at)
VALUES (
  ${refreshTokenId},
  ${userId},
  ${refreshToken},
  NOW() + interval '7 days'
)
`;


// -----------------------------
// 7️⃣ إرجاع بيانات المستخدم + التوكن
// -----------------------------
return {
  user: {
    id: userId,
    name,
    email
  },
  accessToken,
  refreshToken
}};