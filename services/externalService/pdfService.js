import PDFDocument from 'pdfkit';

const generatePDF = (data) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#1d4ed8').text('APEX Smart Construction', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(16).font('Helvetica').fillColor('#475569').text('Rapport d\'Estimation', { align: 'center' });
        doc.moveDown(2);

        // Project Info
        doc.fontSize(12).fillColor('black');
        doc.font('Helvetica-Bold').text('Informations du Projet');
        doc.moveDown(0.5);
        doc.font('Helvetica').text(`Projet: ${data.projectName || 'N/A'}`);
        doc.text(`Date du calcul: ${data.date || new Date().toLocaleDateString()}`);

        if (data.dimensions && Object.keys(data.dimensions).length > 0) {
            const dims = Object.entries(data.dimensions).map(([k, v]) => `${k}: ${v}m`).join(', ');
            doc.text(`Dimensions du projet : ${dims}`);
        }
        doc.moveDown(1.5);

        // Intermediate Results
        if (data.intermediateResults && data.intermediateResults.length > 0) {
            doc.font('Helvetica-Bold').text('Résultats de Calcul (Surfaces, Volumes, etc.)');
            doc.moveDown(0.5);
            data.intermediateResults.forEach(res => {
                doc.font('Helvetica').text(`- ${res.label}: ${res.value} ${res.unit || ''}`);
            });
            doc.moveDown(1.5);
        }

        // Materials Table Header
        doc.font('Helvetica-Bold').text('Détails des Dépenses (Matériaux)', { underline: true });
        doc.moveDown(1);

        const tableTop = doc.y;
        const col1 = 50;   // Désignation
        const col2 = 250;  // Quantité
        const col3 = 320;  // Unité
        const col4 = 370;  // Prix Unit
        const col5 = 460;  // Total Partiel

        // Background for Header
        doc.rect(50, tableTop - 5, 500, 20).fill('#f1f5f9');

        doc.fontSize(10).font('Helvetica-Bold').fillColor('black');
        doc.text('Désignation', col1, tableTop);
        doc.text('Quantité', col2, tableTop);
        doc.text('Unité', col3, tableTop);
        doc.text('Prix Unit', col4, tableTop);
        doc.text('Total Partiel', col5, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#cccccc').stroke();

        // Table Rows
        let y = tableTop + 25;
        doc.font('Helvetica').fillColor('black');
        if (data.material_lines && data.material_lines.length > 0) {
            data.material_lines.forEach(item => {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
                const initY = y;

                const qty = item.quantity_with_waste || item.quantity || 1;
                const unit_price = Math.round((item.sub_total / qty) * 100) / 100;

                doc.text(item.material_name || '-', col1, y, { width: 190 });
                const rowHeight = doc.y - initY; // Height taken by multiline label
                doc.text(qty.toString() || '-', col2, initY);
                doc.text(item.unit_symbol || '-', col3, initY);
                doc.text(`${(unit_price || 0).toFixed(2)} DZD`, col4, initY);
                doc.text(`${(item.sub_total || 0).toFixed(2)} DZD`, col5, initY);

                console.log(`[PDF] Matériau : ${item.material_name} | Prix Unitaire Final : ${unit_price} DZD | Total : ${item.sub_total} DZD`);

                y += Math.max(rowHeight, 15) + 10;
                doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('#eeeeee').stroke();
            });
        }

        // Grand Total
        doc.moveDown(2);
        const totalY = Math.max(doc.y + 20, y + 20);
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#ef4444')
            .text(`Grand Total: ${(data.total_cost || 0).toFixed(2)} DZD`, 50, totalY, { align: 'right' });

        doc.end();
    });
};

export { generatePDF };