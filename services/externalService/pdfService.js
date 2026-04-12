import PDFDocument from 'pdfkit';

const generatePDF = (data) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // محتوى الـ PDF
        doc.fontSize(22).fillColor('#1d4ed8').text('APEX Estimation Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).fillColor('black').text(`Category: ${data.category_info.name}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown();

        doc.fontSize(14).text('Details:', { underline: true });
        data.details.forEach(item => {
            doc.fontSize(10).text(`- [${item.type.toUpperCase()}] ${item.name}: ${item.total_item_dzd.toLocaleString()} DZD`);
        });

        doc.moveDown(2);
        doc.fontSize(16).fillColor('#1d4ed8').text(`Grand Total: ${data.summary.grand_total.toLocaleString()} DZD`, { align: 'right' });

        doc.end();
    });
};

export { generatePDF };