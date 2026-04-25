import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedQuestions() {
  // Dynamic import to ensure process.env is populated before database.js is executed
  const { default: sql } = await import('../config/database.js');

  const questions = [
    // DASHBOARD
    {
      display_location: 'DASHBOARD',
      question_en: 'How do I create a new project?',
      question_ar: 'كيف يمكنني إنشاء مشروع جديد؟',
      answer_en: 'Click the "+ New Project" button on the top right of your dashboard to start a new estimation project.',
      answer_ar: 'انقر على زر "+ مشروع جديد" في أعلى يمين لوحة التحكم لبدء مشروع تقدير جديد.'
    },
    {
      display_location: 'DASHBOARD',
      question_en: 'What is my Asset Inventory?',
      question_ar: 'ما هو جرد الأصول الخاص بي؟',
      answer_en: 'The Asset Inventory provides a high-level summary of all your registered projects and their combined estimated value.',
      answer_ar: 'يوفر جرد الأصول ملخصاً شاملاً لجميع مشاريعك المسجلة وقيمتها التقديرية الإجمالية.'
    },
    // PROJECT_OVERVIEW
    {
      display_location: 'PROJECT_OVERVIEW',
      question_en: 'How can I export my project data?',
      question_ar: 'كيف يمكنني تصدير بيانات مشروعي؟',
      answer_en: 'You can export your project estimation data by clicking the "Export" button in the project header. This will generate a downloadable report.',
      answer_ar: 'يمكنك تصدير بيانات تقدير مشروعك بالنقر على زر "تصدير" في رأس المشروع. سيؤدي ذلك إلى إنشاء تقرير قابل للتحميل.'
    },
    {
      display_location: 'PROJECT_OVERVIEW',
      question_en: 'Where can I find the history of calculation?',
      question_ar: 'أين يمكنني العثور على سجل الحسابات؟',
      answer_en: 'The calculation history is located at the bottom of the Project Overview page under the "Recent Calculation" section. You can click "View All" for the full ledger.',
      answer_ar: 'يوجد سجل الحسابات في أسفل صفحة ملخص المشروع ضمن قسم "الحسابات الأخيرة". يمكنك النقر على "عرض الكل" لرؤية السجل الكامل.'
    },
    // ESTIMATION
    {
      display_location: 'ESTIMATION',
      question_en: 'How do I perform a specific estimation?',
      question_ar: 'كيف أقوم بإجراء تقدير محدد؟',
      answer_en: 'Navigate the category tree on the left, select a module (e.g., Concrete), choose a formula, enter your measurements, and click "Run Estimation".',
      answer_ar: 'تنقل في شجرة التصنيفات على اليسار، اختر وحدة (مثلاً: الخرسانة)، اختر صيغة، أدخل قياساتك، وانقر على "تشغيل التقدير".'
    },
    {
      display_location: 'ESTIMATION',
      question_en: 'Can I save my results to the project history?',
      question_ar: 'هل يمكنني حفظ نتائجي في سجل المشروع؟',
      answer_en: 'Yes! After running an estimation and reviewing the results, click the "Save Calculation" button to commit it to the project database.',
      answer_ar: 'نعم! بعد تشغيل التقدير ومراجعة النتائج، انقر على زر "حفظ الحساب" لتسجيله في قاعدة بيانات المشروع.'
    }
  ];

  console.log('Seeding predefined questions...');

  try {
    for (const q of questions) {
      await sql`
        INSERT INTO predefined_questions (
          question_text_en, 
          question_text_ar, 
          answer_text_en, 
          answer_text_ar, 
          display_location
        ) VALUES (
          ${q.question_en}, 
          ${q.question_ar}, 
          ${q.answer_en}, 
          ${q.answer_ar}, 
          ${q.display_location}
        )
      `;
    }
    console.log('Successfully seeded 6 questions.');
  } catch (err) {
    console.error('Error seeding questions:', err);
  } finally {
    process.exit();
  }
}

seedQuestions();
