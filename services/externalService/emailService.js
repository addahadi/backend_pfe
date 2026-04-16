import nodemailer from 'nodemailer';

const sendEmail = async (to, data, pdfBuffer) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const itemsRows = (data.materials || []).map(item => `
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.label}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${(item.total || 0).toLocaleString()} DZD</td>
        </tr>
    `).join('');

    const htmlContent = `
        <div style="direction: rtl; font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2 style="color: #1d4ed8;">تقرير ميزانية: ${data.categoryName || 'General'}</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="border: 1px solid #ddd; padding: 8px;">البند</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">التكلفة</th>
                    </tr>
                </thead>
                <tbody>${itemsRows}</tbody>
            </table>
            <h3 style="color: #1d4ed8;">المجموع الكلي: ${(data.grandTotal || 0).toLocaleString()} DZD</h3>
        </div>
    `;

    const mailOptions = {
        from: `"APEX Smart Construction" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: `Budget Estimation: ${data.projectName || data.categoryName || 'Project'}`,
        html: htmlContent
    };

    if (pdfBuffer) {
        mailOptions.attachments = [
            {
                filename: 'Rapport_Estimation.pdf',
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ];
    }

    return transporter.sendMail(mailOptions);
};

export { sendEmail };