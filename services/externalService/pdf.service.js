import PDFDocument from 'pdfkit';

const MARGIN = 50;
const COLORS = {
  header: '#0f172a',
  primary: '#1d4ed8',
  text: '#111827',
  muted: '#6b7280',
  border: '#d1d5db',
  panel: '#f8fafc',
  tableHeader: '#e2e8f0',
  rowAlt: '#f8fafc',
  danger: '#dc2626',
};

function ensureSpace(doc, needed = 24) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}

function n(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asText(value) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(asText).join(', ');
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseObject(value) {
  if (value == null) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : { value: parsed };
    } catch {
      return { raw: value };
    }
  }
  if (typeof value === 'object') return value;
  return { value };
}

function objectEntries(value) {
  const obj = parseObject(value);
  return Object.entries(obj || {});
}

function formatMoney(value) {
  return `${n(value, 0).toFixed(2)} DZD`;
}

function drawHeader(doc, data) {
  const width = doc.page.width - MARGIN * 2;
  const startY = doc.y;

  doc.save();
  doc.roundedRect(MARGIN, startY, width, 72, 10).fill(COLORS.header);
  doc.restore();

  doc.fillColor('white').font('Helvetica-Bold').fontSize(18)
    .text('Project Report', MARGIN + 16, startY + 14, { width: width - 32 });
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(10)
    .text(`Generated: ${data.date || new Date().toLocaleDateString()}`, MARGIN + 16, startY + 44);

  doc.y = startY + 84;

  doc.save();
  doc.roundedRect(MARGIN, doc.y, width, 78, 8).fill(COLORS.panel).stroke(COLORS.border);
  doc.restore();

  const leftX = MARGIN + 14;
  const rightX = MARGIN + width / 2;
  const topY = doc.y + 12;

  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10).text('Project', leftX, topY);
  doc.font('Helvetica').text(data.projectName || 'N/A', leftX + 58, topY, { width: width / 2 - 72 });

  doc.font('Helvetica-Bold').text('Status', rightX, topY);
  doc.font('Helvetica').text(data.projectStatus || '-', rightX + 42, topY, { width: width / 2 - 56 });

  doc.font('Helvetica-Bold').text('Created', leftX, topY + 22);
  doc.font('Helvetica').text(
    data.projectCreatedAt ? new Date(data.projectCreatedAt).toLocaleString() : '-',
    leftX + 58,
    topY + 22,
    { width: width / 2 - 72 }
  );

  doc.font('Helvetica-Bold').text('Estimation ID', rightX, topY + 22);
  doc.font('Helvetica').text(data.estimationId || '-', rightX + 74, topY + 22, { width: width / 2 - 88 });

  doc.font('Helvetica-Bold').text('Description', leftX, topY + 44);
  doc.font('Helvetica').text(data.projectDescription || '-', leftX + 58, topY + 44, { width: width - 80 });

  doc.y += 92;
}

function drawSectionTitle(doc, text) {
  ensureSpace(doc, 28);
  const width = doc.page.width - MARGIN * 2;
  doc.save();
  doc.roundedRect(MARGIN, doc.y, width, 22, 5).fill(COLORS.primary);
  doc.restore();
  doc.fillColor('white').font('Helvetica-Bold').fontSize(11)
    .text(text, MARGIN + 10, doc.y + 6, { width: width - 20 });
  doc.y += 28;
}

function drawInfoLine(doc, label, value) {
  ensureSpace(doc, 16);
  doc.font('Helvetica-Bold').fillColor(COLORS.text).fontSize(10).text(`${label}: `, MARGIN, doc.y, { continued: true });
  doc.font('Helvetica').text(value || '-');
}

function drawSimpleTable(doc, title, rows) {
  ensureSpace(doc, 40);
  doc.font('Helvetica-Bold').fillColor(COLORS.text).fontSize(10).text(title, MARGIN, doc.y);
  doc.y += 6;

  const width = doc.page.width - MARGIN * 2;
  const col1 = 0.55 * width;
  const col2 = width - col1;
  const rowH = 18;

  const drawHeader = () => {
    ensureSpace(doc, rowH + 8);
    doc.save();
    doc.rect(MARGIN, doc.y, width, rowH).fill(COLORS.tableHeader).stroke(COLORS.border);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.text)
      .text('Field', MARGIN + 6, doc.y + 5, { width: col1 - 12 })
      .text('Value', MARGIN + col1 + 6, doc.y + 5, { width: col2 - 12 });
    doc.y += rowH;
  };

  drawHeader();

  if (!rows || rows.length === 0) {
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text('No data', MARGIN + 6, doc.y + 5);
    doc.y += rowH;
    return;
  }

  rows.forEach((row, index) => {
    if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawHeader();
    }

    doc.save();
    doc.rect(MARGIN, doc.y, width, rowH)
      .fill(index % 2 === 0 ? 'white' : COLORS.rowAlt)
      .stroke(COLORS.border);
    doc.restore();

    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text)
      .text(asText(row.name), MARGIN + 6, doc.y + 5, { width: col1 - 12, ellipsis: true })
      .text(asText(row.value), MARGIN + col1 + 6, doc.y + 5, { width: col2 - 12, ellipsis: true });

    doc.y += rowH;
  });

  doc.y += 8;
}

function drawMaterialsTable(doc, lines = []) {
  ensureSpace(doc, 44);
  doc.font('Helvetica-Bold').fillColor(COLORS.text).fontSize(10).text('Materials', MARGIN, doc.y);
  doc.y += 6;

  const width = doc.page.width - MARGIN * 2;
  const cols = [0.40, 0.14, 0.11, 0.17, 0.18].map((r) => Math.floor(width * r));
  cols[cols.length - 1] = width - cols.slice(0, -1).reduce((a, b) => a + b, 0);
  const rowH = 18;

  const drawHeader = () => {
    ensureSpace(doc, rowH + 8);
    doc.save();
    doc.rect(MARGIN, doc.y, width, rowH).fill(COLORS.tableHeader).stroke(COLORS.border);
    doc.restore();

    let x = MARGIN;
    const headers = ['Material', 'Qty', 'Unit', 'Unit Price', 'Subtotal'];
    headers.forEach((h, i) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.text)
        .text(h, x + 4, doc.y + 5, { width: cols[i] - 8, ellipsis: true });
      x += cols[i];
    });

    doc.y += rowH;
  };

  drawHeader();

  if (!Array.isArray(lines) || lines.length === 0) {
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text('No material lines', MARGIN + 6, doc.y + 5);
    doc.y += rowH + 4;
    return;
  }

  lines.forEach((line, index) => {
    if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawHeader();
    }

    doc.save();
    doc.rect(MARGIN, doc.y, width, rowH)
      .fill(index % 2 === 0 ? 'white' : COLORS.rowAlt)
      .stroke(COLORS.border);
    doc.restore();

    const qty = n(line.quantity_with_waste ?? line.quantity, 0);
    const subtotal = n(line.sub_total, 0);
    const unitPrice = qty > 0 ? subtotal / qty : 0;

    const cells = [
      line.material_name || '-',
      String(qty),
      line.unit_symbol || '-',
      formatMoney(unitPrice),
      formatMoney(subtotal),
    ];

    let x = MARGIN;
    cells.forEach((cell, i) => {
      doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.text)
        .text(cell, x + 4, doc.y + 5, { width: cols[i] - 8, ellipsis: true });
      x += cols[i];
    });

    doc.y += rowH;
  });

  doc.y += 8;
}

function toInputRows(leaf) {
  if (Array.isArray(leaf.input_values_display) && leaf.input_values_display.length > 0) {
    return leaf.input_values_display.map((entry) => ({
      name: entry.name || entry.key || '-',
      value: entry.unit ? `${asText(entry.value)} ${entry.unit}` : asText(entry.value),
    }));
  }

  return objectEntries(leaf.field_values).map(([key, value]) => ({ name: key, value: asText(value) }));
}

function toResultRows(leaf) {
  if (Array.isArray(leaf.result_values_display) && leaf.result_values_display.length > 0) {
    return leaf.result_values_display.map((entry) => ({
      name: entry.name || entry.key || '-',
      value: asText(entry.value),
    }));
  }

  return objectEntries(leaf.results).map(([key, value]) => ({
    name: key.replace(/_/g, ' '),
    value: asText(value),
  }));
}

function generateDetailedProjectPdf(doc, data) {
  drawHeader(doc, data);

  const leaves = Array.isArray(data.leaf_calculations) ? data.leaf_calculations : [];

  leaves.forEach((leaf, index) => {
    drawSectionTitle(
      doc,
      `Detail ${index + 1} - ${leaf.category_name_en || leaf.category_name_ar || 'Category'}`
    );

    drawInfoLine(doc, 'Formula', leaf.formula_name || '-');
    drawInfoLine(doc, 'Config', leaf.config_name || '-');
    drawInfoLine(doc, 'Saved at', leaf.created_at ? new Date(leaf.created_at).toLocaleString() : '-');

    doc.y += 6;
    drawSimpleTable(doc, 'Input Values', toInputRows(leaf));
    drawSimpleTable(doc, 'Calculated Results', toResultRows(leaf));
    drawMaterialsTable(doc, leaf.material_lines || []);

    ensureSpace(doc, 20);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text)
      .text(`Leaf Total: ${formatMoney(leaf.leaf_total)}`, MARGIN, doc.y, { align: 'right' });
    doc.y += 14;
  });

  ensureSpace(doc, 30);
  doc.moveTo(MARGIN, doc.y).lineTo(doc.page.width - MARGIN, doc.y).strokeColor(COLORS.border).stroke();
  doc.y += 8;
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.danger)
    .text(`Grand Total: ${formatMoney(data.total_cost)}`, MARGIN, doc.y, { align: 'right' });
}

function generateLegacyPdf(doc, data) {
  drawHeader(doc, data);
  drawSectionTitle(doc, data.categoryName || 'Estimation');

  const inputRows = objectEntries(data.dimensions).map(([key, value]) => ({ name: key, value: asText(value) }));
  drawSimpleTable(doc, 'Input Values', inputRows);

  const resultRows = (Array.isArray(data.intermediateResults) ? data.intermediateResults : []).map((r) => ({
    name: r.label || r.output_key || 'result',
    value: r.unit ? `${asText(r.value)} ${r.unit}` : asText(r.value),
  }));
  drawSimpleTable(doc, 'Calculated Results', resultRows);

  drawMaterialsTable(doc, data.material_lines || []);

  ensureSpace(doc, 30);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.danger)
    .text(`Grand Total: ${formatMoney(data.total_cost)}`, MARGIN, doc.y, { align: 'right' });
}

const generatePDF = (data) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (Array.isArray(data?.leaf_calculations) && data.leaf_calculations.length > 0) {
      generateDetailedProjectPdf(doc, data);
    } else {
      generateLegacyPdf(doc, data || {});
    }

    doc.end();
  });

export { generatePDF };
