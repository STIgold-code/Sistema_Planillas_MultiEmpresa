// Utilidad para exportar documentos a PDF
// NO usar import estatico - usamos import dinamico para SSR compatibility
import DOMPurify from 'dompurify';
import { toDateString } from './utils';

/**
 * Elimina funciones de color no soportadas por html2canvas (lab, oklch, oklab, lch)
 * y las reemplaza con colores seguros
 */
function sanitizeColorsForPdf(html: string): string {
  // Reemplazar funciones de color no soportadas con equivalentes hex
  return html
    // lab(), oklch(), oklab(), lch() -> #000 (negro) o transparent
    .replace(/(?:ok)?l(?:ab|ch)\([^)]+\)/gi, '#000000')
    // color-mix() con lab/oklch -> negro
    .replace(/color-mix\([^)]*(?:ok)?l(?:ab|ch)[^)]*\)/gi, '#000000')
    // Variables CSS que podrían tener estos colores
    .replace(/var\(--[^)]+\)/g, (match) => {
      // Mantener variables conocidas, reemplazar otras
      const safeVars = ['--background', '--foreground', '--primary', '--secondary', '--muted', '--border', '--accent', '--destructive'];
      const varName = match.match(/var\((--[^,)]+)/)?.[1];
      if (varName && safeVars.some(v => varName.startsWith(v))) {
        return match;
      }
      return '#000000';
    });
}

interface ExportOptions {
  filename?: string;
  margin?: number;
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

export async function exportToPdf(
  htmlContent: string,
  options: ExportOptions = {}
): Promise<void> {
  // Import dinamico - solo se carga en el cliente
  const html2pdf = (await import('html2pdf.js')).default;

  const {
    filename = 'documento.pdf',
    margin = 10,
    pageSize = 'a4',
    orientation = 'portrait',
  } = options;

  // Crear un contenedor temporal para el HTML
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = 'white';

  // SEGURIDAD: Sanitizar HTML para prevenir XSS
  const xssSanitized = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'br', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
                   'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'i', 'em', 'u', 'ul', 'ol', 'li',
                   'img', 'hr', 'pre', 'code', 'blockquote', 'a'],
    ALLOWED_ATTR: ['class', 'style', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan', 'href'],
    ALLOW_DATA_ATTR: false,
  });

  // Sanitizar colores no soportados por html2canvas (lab, oklch, etc.)
  const sanitizedContent = sanitizeColorsForPdf(xssSanitized);

  container.innerHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        /* Reset colores para compatibilidad con html2canvas (no soporta lab/oklch) */
        :root {
          --background: #ffffff;
          --foreground: #0a0a0a;
          --primary: #171717;
          --primary-foreground: #fafafa;
          --secondary: #f5f5f5;
          --secondary-foreground: #171717;
          --muted: #f5f5f5;
          --muted-foreground: #737373;
          --accent: #f5f5f5;
          --accent-foreground: #171717;
          --destructive: #ef4444;
          --border: #e5e5e5;
          --ring: #0a0a0a;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #000000;
          background: #ffffff;
        }
        * {
          box-sizing: border-box;
          color: inherit;
        }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #000; padding: 4px; }
        .page-break { page-break-before: always; }
        .doc-page { padding: 10px; }
        @media print {
          .page-break { page-break-before: always; }
        }
      </style>
    </head>
    <body>${sanitizedContent}</body>
    </html>
  `;

  document.body.appendChild(container);

  const opt = {
    margin: margin,
    filename: filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm',
      format: pageSize,
      orientation: orientation
    },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  try {
    await html2pdf().set(opt).from(container).save();
  } catch (error) {
    console.error('Error generando PDF:', error);
    throw new Error(
      `Error al generar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  } finally {
    document.body.removeChild(container);
  }
}

export function generatePdfFilename(documentName: string, employeeName?: string): string {
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '').trim().replace(/\s+/g, '_');

  const docName = sanitize(documentName);
  const date = toDateString(new Date());

  if (employeeName) {
    const empName = sanitize(employeeName);
    return `${docName}_${empName}_${date}.pdf`;
  }

  return `${docName}_${date}.pdf`;
}

interface DocumentContent {
  nombre: string;
  contenido: string;
}

export async function exportMultipleToPdf(
  documents: DocumentContent[],
  options: ExportOptions = {}
): Promise<void> {
  if (documents.length === 0) {
    throw new Error('No hay documentos para exportar');
  }

  // Filtrar documentos sin contenido
  const validDocuments = documents.filter(
    (doc) => doc.contenido && doc.contenido.trim() !== ''
  );

  if (validDocuments.length === 0) {
    throw new Error('Los documentos no tienen contenido para exportar');
  }

  // Import dinamico - solo se carga en el cliente
  const html2pdf = (await import('html2pdf.js')).default;

  const {
    filename = 'documentos.pdf',
    margin = 10,
    pageSize = 'a4',
    orientation = 'portrait',
  } = options;

  // SEGURIDAD: Configuración de sanitización para prevenir XSS
  const sanitizeConfig = {
    ALLOWED_TAGS: ['div', 'span', 'p', 'br', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
                   'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'i', 'em', 'u', 'ul', 'ol', 'li',
                   'img', 'hr', 'pre', 'code', 'blockquote', 'a'],
    ALLOWED_ATTR: ['class', 'style', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan', 'href'],
    ALLOW_DATA_ATTR: false,
  };

  // Concatenar todos los documentos con saltos de pagina
  const combinedHtml = validDocuments
    .map((doc, index) => {
      const pageBreakClass = index > 0 ? 'html2pdf__page-break' : '';
      // Sanitizar nombre y contenido del documento
      const sanitizedNombre = DOMPurify.sanitize(doc.nombre, { ALLOWED_TAGS: [] });
      const xssSanitized = DOMPurify.sanitize(doc.contenido, sanitizeConfig);
      // Sanitizar colores no soportados por html2canvas
      const sanitizedContenido = sanitizeColorsForPdf(xssSanitized);
      return `
        <div class="doc-page ${pageBreakClass}">
          <div style="text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ccc;">
            <strong style="font-size: 12px; color: #333;">${sanitizedNombre}</strong>
          </div>
          ${sanitizedContenido}
        </div>
      `;
    })
    .join('');

  // Crear un contenedor temporal para el HTML
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = 'white';

  container.innerHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        /* Reset colores para compatibilidad con html2canvas (no soporta lab/oklch) */
        :root {
          --background: #ffffff;
          --foreground: #0a0a0a;
          --primary: #171717;
          --primary-foreground: #fafafa;
          --secondary: #f5f5f5;
          --secondary-foreground: #171717;
          --muted: #f5f5f5;
          --muted-foreground: #737373;
          --accent: #f5f5f5;
          --accent-foreground: #171717;
          --destructive: #ef4444;
          --border: #e5e5e5;
          --ring: #0a0a0a;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #000000;
          background: #ffffff;
        }
        * {
          box-sizing: border-box;
          color: inherit;
        }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #000; padding: 4px; }
        .doc-page { padding: 10px; }
        .html2pdf__page-break {
          page-break-before: always;
          break-before: page;
        }
      </style>
    </head>
    <body>${combinedHtml}</body>
    </html>
  `;

  document.body.appendChild(container);

  const opt = {
    margin: margin,
    filename: filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm',
      format: pageSize,
      orientation: orientation
    },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  try {
    await html2pdf().set(opt).from(container).save();
  } catch (error) {
    console.error('Error generando PDF multiple:', error);
    throw new Error(
      `Error al generar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  } finally {
    document.body.removeChild(container);
  }
}
