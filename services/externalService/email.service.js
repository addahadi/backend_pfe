import nodemailer from 'nodemailer';

const sendEmail = async (to, data, pdfBuffer) => {
    const emailUser =
        process.env.EMAIL_USER ||
        process.env.SMTP_USER ||
        process.env.MAIL_USER;

    const emailPass =
        process.env.EMAIL_PASS ||
        process.env.EMAIL_PASSWORD ||
        process.env.SMTP_PASS ||
        process.env.MAIL_PASS;

    if (!emailUser || !emailPass) {
        throw new Error('Email credentials are missing. Set EMAIL_USER + EMAIL_PASSWORD (or EMAIL_PASS).');
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

    const transporter = nodemailer.createTransport(
        smtpHost
            ? {
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                auth: { user: emailUser, pass: emailPass },
            }
            : {
                service: process.env.EMAIL_SERVICE || 'gmail',
                auth: { user: emailUser, pass: emailPass },
            }
    );

    const itemsRows = (data.material_lines || []).map(item => `
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.material_name}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: left;">${(item.sub_total || 0).toFixed(2)} DZD</td>
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
            <h3 style="color: #1d4ed8;">المجموع الكلي: ${(data.total_cost || 0).toFixed(2)} DZD</h3>
        </div>
    `;

    const mailOptions = {
        from: process.env.EMAIL_FROM || `"APEX Smart Construction" <${emailUser}>`,
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
