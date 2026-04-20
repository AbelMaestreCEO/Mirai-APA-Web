/**
 * js/processors/docxWriter.js
 * API para docx v8.x — compatible con UMD en navegador
 *
 * Fixes:
 * - font debe ser { name: 'Times New Roman' } no string en v8
 * - Packer.toBlob() para navegador
 * - mergeRuns evita texto letra por letra
 * - Document con creator evita modo borrador
 */

function getDocxLib() {
  const candidates = [window.docx, window.DocxJS, window.DOCX];
  for (const c of candidates) {
    if (c?.Document) return c;
    if (c?.docx?.Document) return c.docx;
  }
  throw new Error('Libreria docx no encontrada.');
}

function makeRun(docx, { text, bold = false, italic = false, size = 24 }) {
  return new docx.TextRun({
    text: String(text ?? ''),
    bold,
    italics: italic,
    size,
    font: { name: 'Times New Roman' },
  });
}

function mergeRuns(runs) {
  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && !!last.bold === !!r.bold && !!last.italic === !!r.italic) {
      last.text += r.text;
    } else {
      merged.push({ text: r.text ?? '', bold: !!r.bold, italic: !!r.italic });
    }
  }
  return merged;
}

export async function generateDocx(data, options = {}) {
  const docx = getDocxLib();
  const { Document, Paragraph, Header, Footer, Packer, AlignmentType,
          LineRuleType, Table, TableRow, TableCell, WidthType, BorderStyle,
          ImageRun, PageNumber } = docx;

  const { paragraphs = [], tables = [], images = [] } = data;
  const { title = 'Titulo del Documento', author = 'Autor',
          affiliation = '', course = '', instructor = '', date = '' } = options;

  console.log('[DocxWriter]: Iniciando generacion del documento...');

  const emu = (inches) => Math.round(inches * 914400);
  const lr  = LineRuleType?.AUTO ?? 'auto';

  const emptyLine = () => new Paragraph({
    children: [],
    spacing: { line: 480, lineRule: lr, before: 0, after: 0 },
  });

  const centeredParagraph = (text, bold = false) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: 480, lineRule: lr, before: 0, after: 0 },
    indent: { firstLine: 0 },
    children: [makeRun(docx, { text, bold })],
  });

  // PORTADA
  const titlePageChildren = [];
  for (let i = 0; i < 5; i++) titlePageChildren.push(emptyLine());
  if (title)       titlePageChildren.push(centeredParagraph(title, true));
  if (author)      titlePageChildren.push(centeredParagraph(author));
  if (affiliation) titlePageChildren.push(centeredParagraph(affiliation));
  if (course)      titlePageChildren.push(centeredParagraph(course));
  if (instructor)  titlePageChildren.push(centeredParagraph(instructor));
  if (date)        titlePageChildren.push(centeredParagraph(date));
  for (let i = 0; i < 3; i++) titlePageChildren.push(emptyLine());
  console.log('[DocxWriter]: Portada generada.');

  // CUERPO
  const bodyChildren = [];

  if (data.abstract) {
    bodyChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 480, lineRule: lr, before: 0, after: 0 },
      children: [makeRun(docx, { text: 'Resumen', bold: true })],
    }));
    if (data.abstract.body) {
      bodyChildren.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: 480, lineRule: lr, before: 0, after: 0 },
        indent: { firstLine: 0 },
        children: [makeRun(docx, { text: data.abstract.body })],
      }));
    }
    if (data.abstract.keywords?.length) {
      bodyChildren.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: 480, lineRule: lr, before: 240, after: 0 },
        indent: { firstLine: 0 },
        children: [
          makeRun(docx, { text: 'Palabras clave:', italic: true }),
          makeRun(docx, { text: ' ' + data.abstract.keywords.join(', ') }),
        ],
      }));
    }
  }

  for (const p of paragraphs)  { const x = convertParagraph(p, docx, lr); if (x) bodyChildren.push(x); }
  for (const t of tables)      { const x = convertTable(t, docx);         if (x) bodyChildren.push(x); }
  for (const img of images)    { const x = convertImage(img, docx);       if (x) bodyChildren.push(x); }

  // HEADER
  const pageHeader = new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [new docx.TextRun({
        children: [PageNumber.CURRENT],
        size: 24,
        font: { name: 'Times New Roman' },
      })],
    })],
  });

  const pageFooter = new Footer({ children: [emptyLine()] });

  // DOCUMENTO
  const doc = new Document({
    creator: 'Mirai APA',
    description: 'Documento formateado en APA 7',
    sections: [{
      properties: {
        page: { margin: { top: emu(1), right: emu(1), bottom: emu(1), left: emu(1) } },
      },
      headers: { default: pageHeader },
      footers: { default: pageFooter },
      children: [...titlePageChildren, ...bodyChildren],
    }],
  });

  console.log('[DocxWriter]: Empaquetando documento...');

  let blob;
  if (typeof Packer.toBlob === 'function') {
    blob = await Packer.toBlob(doc);
  } else {
    const base64 = await Packer.toBase64String(doc);
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  console.log('[DocxWriter]: Documento generado exitosamente.');
  return blob;
}

function convertParagraph(p, docx, lr) {
  if (!p) return null;
  const { Paragraph, AlignmentType } = docx;
  const type  = p.type  || 'body';
  const level = p.level || 0;

  let alignment    = AlignmentType.LEFT;
  let forceBold    = false, forceItalic = false;
  let firstLine    = 720, hanging = 0, leftIndent = 0, spacingBefore = 0;

  switch (type) {
    case 'heading':
      forceBold = true; firstLine = 0; spacingBefore = 240;
      if (level === 1) alignment = AlignmentType.CENTER;
      if (level === 3 || level === 5) forceItalic = true;
      if (level === 4 || level === 5) leftIndent = 720;
      break;
    case 'reference':
      firstLine = 0; hanging = 720;
      break;
    case 'block_quote':
      firstLine = 0; leftIndent = 720;
      break;
  }

  const rawRuns = (p.runs && p.runs.length > 0)
    ? p.runs
    : [{ text: p.text ?? '', bold: false, italic: false }];

  const children = mergeRuns(rawRuns).map(r => makeRun(docx, {
    text:   r.text,
    bold:   forceBold   || r.bold,
    italic: forceItalic || r.italic,
  }));

  return new Paragraph({
    alignment,
    spacing: { line: 480, lineRule: lr, before: spacingBefore, after: 0 },
    indent:  { firstLine, hanging, left: leftIndent },
    children,
  });
}

function convertTable(t, docx) {
  if (!t?.rows?.length) return null;
  const { Table, TableRow, TableCell, Paragraph, AlignmentType, WidthType, BorderStyle } = docx;
  const none = { style: BorderStyle.NONE,   size: 0, color: 'auto' };
  const line = { style: BorderStyle.SINGLE, size: 4, color: '000000' };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: t.rows.map((cells, ri) => new TableRow({
      children: (Array.isArray(cells) ? cells : []).map((cell) => {
        const txt  = typeof cell === 'string' ? cell : (cell?.text ?? '');
        const isH  = ri === 0;
        return new TableCell({
          borders: { top: isH ? line : none, bottom: isH ? line : none, left: none, right: none },
          children: [new Paragraph({
            alignment: /^[+-]?[\d.,\s%$€]+$/.test(txt.trim()) ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children:  [makeRun(docx, { text: txt, bold: isH, size: 20 })],
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
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
