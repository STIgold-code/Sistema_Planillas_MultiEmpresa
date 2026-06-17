import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

/**
 * Extrae las variables `{{algo}}` que aparecen en un archivo Word (.docx).
 * Funcion pura sin dependencias de NestJS — la usan tanto el service principal
 * como el sub-service de generacion de documentos.
 */
export function extractVariablesFromWordFile(file: string | Buffer): string[] {
  try {
    let content: Buffer;
    if (Buffer.isBuffer(file)) {
      content = file;
    } else {
      content = fs.readFileSync(file);
    }

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

    const fullText = doc.getFullText();

    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(fullText)) !== null) {
      const variable = `{{${match[1]}}}`;
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  } catch (error) {
    throw new BadRequestException(
      `Error al leer el archivo Word: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
