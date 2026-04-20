import PDFDocument from 'pdfkit';

/**
 * Builds a PDF buffer from estimation report data (same shape as callers in estimation.controller).
 */
const generatePDF = (data) =>
    new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(12);
        doc.moveDown(0.5);
        doc.font('Helvetica').text(`Projet: ${data.projectName || 'N/A'}`);
        doc.text(`Date du calcul: ${data.date || new Date().toLocaleDateString()}`);

        if (data.dimensions && Object.keys(data.dimensions).length > 0) {
            const dims = Object.entries(data.dimensions).map(([k, v]) => `${k}: ${v}m`).join(', ');
            doc.text(`Dimensions du projet : ${dims}`);
        }
        doc.moveDown(1.5);

        if (data.intermediateResults && data.intermediateResults.length > 0) {
            doc.font('Helvetica-Bold').text('Résultats de Calcul (Surfaces, Volumes, etc.)');
            doc.moveDown(0.5);
            data.intermediateResults.forEach((res) => {
                doc.font('Helvetica').text(`- ${res.label}: ${res.value} ${res.unit || ''}`);
            });
            doc.moveDown(1.5);
        }

        doc.font('Helvetica-Bold').text('Détails des Dépenses (Matériaux)', { underline: true });
        doc.moveDown(1);

        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 250;
        const col3 = 320;
        const col4 = 370;
        const col5 = 460;

        doc.rect(50, tableTop - 5, 500, 20).fill('#f1f5f9');

        doc.fontSize(10).font('Helvetica-Bold').fillColor('black');
        doc.text('Désignation', col1, tableTop);
        doc.text('Quantité', col2, tableTop);
        doc.text('Unité', col3, tableTop);
        doc.text('Prix Unit', col4, tableTop);
        doc.text('Total Partiel', col5, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#cccccc').stroke();

        let y = tableTop + 25;
        doc.font('Helvetica').fillColor('black');
        if (data.material_lines && data.material_lines.length > 0) {
            data.material_lines.forEach((item) => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
                const initY = y;

                const qty = item.quantity_with_waste || item.quantity || 1;
                const unit_price =
                    qty && item.sub_total != null
                        ? Math.round((item.sub_total / qty) * 100) / 100
                        : 0;

                doc.text(item.material_name || '-', col1, y, { width: 190 });
                const rowHeight = doc.y - initY;
                doc.text(qty.toString() || '-', col2, initY);
                doc.text(item.unit_symbol || '-', col3, initY);
                doc.text(`${(unit_price || 0).toFixed(2)} DZD`, col4, initY);
                doc.text(`${(item.sub_total || 0).toFixed(2)} DZD`, col5, initY);

                y += Math.max(rowHeight, 15) + 10;
                doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('#eeeeee').stroke();
            });
        }

        doc.moveDown(2);
        const totalY = Math.max(doc.y + 20, y + 20);
        doc.fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#ef4444')
            .text(`Grand Total: ${(data.total_cost || 0).toFixed(2)} DZD`, 50, totalY, { align: 'right' });

        doc.end();
    });

export { generatePDF };
