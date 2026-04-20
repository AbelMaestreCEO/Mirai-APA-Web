/**
 * js/processors/docxWriter.js
 * API corregida para docx v8.x
 *
 * CLAVE: En docx v8, NO existe `new Section(...)`.
 * sections[] es un array de OBJETOS PLANOS dentro de new Document({}).
 */

function getDocxLib() {
  const candidates = [window.docx, window.DocxJS, window.DOCX];
  for (const c of candidates) {
    if (c?.Document) return c;
    if (c?.docx?.Document) return c.docx;
  }
  throw new Error('Librería docx no encontrada. Carga docx.umd.js antes de este archivo.');
}

export async function generateDocx(data, options = {}) {
  const docx = getDocxLib();
  const {
    Document, Paragraph, TextRun, Header, Footer,
    Packer, AlignmentType, LineRuleType,
    Table, TableRow, TableCell, WidthType, BorderStyle,
    ImageRun, PageNumber,
  } = docx;

  const { paragraphs = [], tables = [], images = [] } = data;
  const {
    title = 'Título del Documento', author = 'Autor',
    affiliation = '', course = '', instructor = '', date = '',
  } = options;

  console.log('[DocxWriter]: Iniciando generación del documento...');

  const emu = (inches) => Math.round(inches * 914400);
  const lr = LineRuleType ? LineRuleType.AUTO : 'auto';

  const emptyLine = () => new Paragraph({
    children: [],
    spacing: { line: 480, lineRule: lr, before: 0, after: 0 },
  });

  const centeredText = (text, bold = false) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 480, lineRule: lr, before: 0, after: 0 },
    indent: { firstLine: 0 },
    children: [new TextRun({ text, bold, size: 24, font: 'Times New Roman' })],
  });

  // ── PORTADA ──
  const titlePageChildren = [];
  for (let i = 0; i < 5; i++) titlePageChildren.push(emptyLine());
  if (title)       titlePageChildren.push(centeredText(title, true));
  if (author)      titlePageChildren.push(centeredText(author));
  if (affiliation) titlePageChildren.push(centeredText(affiliation));
  if (course)      titlePageChildren.push(centeredText(course));
  if (instructor)  titlePageChildren.push(centeredText(instructor));
  if (date)        titlePageChildren.push(centeredText(date));
  for (let i = 0; i < 3; i++) titlePageChildren.push(emptyLine());
  console.log('[DocxWriter]: Portada generada.');

  // ── CUERPO ──
  const bodyChildren = [];

  if (data.abstract) {
    bodyChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 480, lineRule: lr, before: 0, after: 0 },
      children: [new TextRun({ text: 'Resumen', bold: true, size: 24, font: 'Times New Roman' })],
    }));
    if (data.abstract.body) {
      bodyChildren.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: 480, lineRule: lr, before: 0, after: 0 },
        indent: { firstLine: 0 },
        children: [new TextRun({ text: data.abstract.body, size: 24, font: 'Times New Roman' })],
      }));
    }
    if (data.abstract.keywords?.length) {
      bodyChildren.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: 480, lineRule: lr, before: 240, after: 0 },
        indent: { firstLine: 0 },
        children: [
          new TextRun({ text: 'Palabras clave:', italics: true, size: 24, font: 'Times New Roman' }),
          new TextRun({ text: ' ' + data.abstract.keywords.join(', '), size: 24, font: 'Times New Roman' }),
        ],
      }));
    }
  }

  for (const p of paragraphs) {
    const para = convertParagraph(p, docx, lr);
    if (para) bodyChildren.push(para);
  }
  for (const t of tables) {
    const tbl = convertTable(t, docx);
    if (tbl) bodyChildren.push(tbl);
  }
  for (const img of images) {
    const imgPara = convertImage(img, docx);
    if (imgPara) bodyChildren.push(imgPara);
  }

  // ── HEADER ──
  const pageHeader = new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 24, font: 'Times New Roman' })],
    })],
  });
  const pageFooter = new Footer({ children: [emptyLine()] });

  // ── DOCUMENTO ──
  // ✅ CORRECTO para docx v8: sections es array de objetos planos, NO new Section()
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: emu(1), right: emu(1), bottom: emu(1), left: emu(1) },
        },
      },
      headers: { default: pageHeader },
      footers: { default: pageFooter },
      children: [...titlePageChildren, ...bodyChildren],
    }],
  });

  console.log('[DocxWriter]: Empaquetando documento...');
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  console.log('[DocxWriter]: Documento generado exitosamente.');
  return blob;
}

function convertParagraph(p, docx, lr) {
  if (!p) return null;
  const { Paragraph, TextRun, AlignmentType } = docx;
  const text = p.text || '';
  const type = p.type || 'body';
  const level = p.level || 0;

  let alignment = AlignmentType.LEFT;
  let bold = false, italic = false;
  let firstLine = 720, hanging = 0, leftIndent = 0, spacingBefore = 0;

  switch (type) {
    case 'heading':
      bold = true; firstLine = 0; spacingBefore = 240;
      if (level === 1) alignment = AlignmentType.CENTER;
      if (level === 3 || level === 5) italic = true;
      if (level === 4 || level === 5) leftIndent = 720;
      break;
    case 'reference':
      firstLine = 0; hanging = 720;
      break;
    case 'block_quote':
      firstLine = 0; leftIndent = 720;
      break;
  }

  return new Paragraph({
    alignment,
    spacing: { line: 480, lineRule: lr, before: spacingBefore, after: 0 },
    indent: { firstLine, hanging, left: leftIndent },
    children: [new TextRun({
      text, bold: p.isBold || bold, italics: p.isItalic || italic,
      size: 24, font: 'Times New Roman',
    })],
  });
}

function convertTable(t, docx) {
  if (!t?.rows?.length) return null;
  const { Table, TableRow, TableCell, Paragraph, TextRun, AlignmentType, WidthType, BorderStyle } = docx;
  const none = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const line = { style: BorderStyle.SINGLE, size: 4, color: '000000' };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: t.rows.map((cells, ri) => new TableRow({
      children: (Array.isArray(cells) ? cells : []).map((cell) => {
        const txt = typeof cell === 'string' ? cell : (cell?.text || '');
        const isNum = /^[+-]?[\d.,\s%$€]+$/.test(txt.trim());
        const isH = ri === 0;
        return new TableCell({
          borders: { top: isH ? line : none, bottom: isH ? line : none, left: none, right: none },
          children: [new Paragraph({
            alignment: isNum ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [new TextRun({ text: txt, bold: isH, size: 20, font: 'Times New Roman' })],
          })],
        });
      }),
    })),
  });
}

function convertImage(img, docx) {
  if (!img?.src) return null;
  const { Paragraph, ImageRun, AlignmentType } = docx;
  try {
    let data = img.src;
    if (typeof data === 'string' && data.startsWith('data:')) {
      const b64 = data.split(',')[1];
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      data = bytes.buffer;
    }
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data, transformation: { width: img.width || 400, height: img.height || 300 } })],
    });
  } catch (e) {
    console.warn('[DocxWriter]: Imagen omitida:', e.message);
    return null;
  }
}

export function downloadBlob(blob, filename = 'documento_apa.docx') {
  if (typeof saveAs !== 'undefined') { saveAs(blob, filename); return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}