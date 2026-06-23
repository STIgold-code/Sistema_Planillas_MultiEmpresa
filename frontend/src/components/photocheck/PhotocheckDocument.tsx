'use client';

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { Empleado } from '@/types';

// Registrar fuentes
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 700 },
  ],
});

// SEGURIDAD: deshabilitar el algoritmo de hyphenation por defecto de react-pdf.
// Sin esto, los apellidos largos como "MARAVI" se cortaban con guion ("MAR-AVI")
// para encajar en el ancho. Al devolver la palabra entera como un único
// fragmento, react-pdf nunca la rompe internamente — si no entra en una linea,
// salta entera a la siguiente.
Font.registerHyphenationCallback((word) => [word]);

// CR80 estándar (ISO/IEC 7810 ID-1): 53.98mm x 85.6mm
// En puntos PDF (1pt = 1/72in, 1in = 25.4mm):
// Ancho: 53.98mm = 153pt | Alto: 85.6mm = 242.6pt
const CARD_WIDTH = 153;
const CARD_HEIGHT = 243;

// La pagina es un "doble carnet" horizontal: frente y reverso lado a lado.
// Asi se imprime una sola hoja y se corta al medio para tener ambos lados.
const PAGE_WIDTH = CARD_WIDTH * 2;
const PAGE_HEIGHT = CARD_HEIGHT;

const COLORS = {
  azulOscuro: '#1a4b8c',
  rojo: '#dc2626',
  gris: '#6b7280',
};

const styles = StyleSheet.create({
  // ========== PÁGINA (doble carnet) ==========
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: '#fff',
    fontFamily: 'Roboto',
    flexDirection: 'row',
  },
  // Linea divisoria entre frente y reverso (guia de corte)
  divider: {
    position: 'absolute',
    left: CARD_WIDTH - 0.5,
    top: 0,
    width: 1,
    height: '100%',
    borderLeft: '1px dashed #9ca3af',
  },
  // ========== FRENTE ==========
  cardFront: {
    width: CARD_WIDTH,
    height: '100%',
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoEmpresa: {
    width: 100,
    height: 60,
    objectFit: 'contain',
    marginBottom: 4,
  },
  empresaNombreText: {
    fontSize: 7,
    color: COLORS.azulOscuro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 2,
  },
  empresaSiglas: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.azulOscuro,
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 4,
  },
  fotoContainer: {
    width: 90,
    height: 110,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 8,
    border: '1px solid #ddd',
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  fotoPlaceholder: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
  // Bloque del nombre: nombres en una linea, apellidos en otra.
  // Soporta hasta 2 lineas por bloque y nunca corta palabras (gracias al
  // hyphenation callback registrado arriba).
  nombresText: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.azulOscuro,
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 1.2,
    width: '100%',
  },
  apellidosText: {
    fontSize: 9,
    fontWeight: 700,
    color: COLORS.azulOscuro,
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 1.2,
    marginBottom: 6,
    width: '100%',
  },
  documento: {
    fontSize: 8,
    color: COLORS.rojo,
    marginBottom: 4,
    fontWeight: 700,
  },
  cargo: {
    fontSize: 7,
    color: COLORS.azulOscuro,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontWeight: 700,
    lineHeight: 1.3,
  },
  // ========== REVERSO ==========
  cardBack: {
    width: CARD_WIDTH,
    height: '100%',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  instruccion: {
    fontSize: 8,
    color: COLORS.azulOscuro,
    marginBottom: 6,
    lineHeight: 1.5,
    fontWeight: 700,
    textAlign: 'center',
  },
  telefonoContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  telefonoLabel: {
    fontSize: 9,
    color: COLORS.azulOscuro,
    fontWeight: 700,
  },
  telefonoNumero: {
    fontSize: 11,
    color: COLORS.azulOscuro,
    fontWeight: 700,
    marginTop: 2,
  },
  centroControlLabel: {
    fontSize: 9,
    color: COLORS.azulOscuro,
    fontWeight: 700,
    marginTop: 8,
  },
  centroControlNumeros: {
    fontSize: 10,
    color: COLORS.azulOscuro,
    fontWeight: 700,
    marginTop: 2,
  },
});

interface PhotocheckDocumentProps {
  empleado: Empleado;
  empresaLogo?: string;
  empresaNombre?: string;
  empresaTelefono?: string;
  centroControl?: string;
  fotoBase64?: string | null; // Foto precargada en base64 para evitar problemas de JWT
}

export function PhotocheckDocument({
  empleado,
  empresaLogo,
  empresaNombre = 'EMPRESA',
  empresaTelefono,
  centroControl,
  fotoBase64,
}: PhotocheckDocumentProps) {
  // Separar nombres de apellidos para colocarlos en lineas distintas.
  // Esto evita que apellidos largos se corten con guion automatico.
  const nombres = (empleado.nombres ?? '').trim();
  const apellidos = [empleado.apellido_paterno, empleado.apellido_materno]
    .filter(Boolean)
    .join(' ')
    .trim();
  const cargoNombre = empleado.cargo?.nombre || 'SIN CARGO ASIGNADO';
  // SOLO usar foto base64 (precargada con JWT)
  // react-pdf NO puede añadir headers JWT, así que no usar URLs directamente
  const fotoUrl = fotoBase64 || null;

  const pageSize = { width: PAGE_WIDTH, height: PAGE_HEIGHT };

  return (
    <Document>
      {/* Una sola pagina con frente (izquierda) y reverso (derecha) */}
      <Page size={pageSize} style={styles.page}>
        {/* ========== FRENTE ========== */}
        <View style={styles.cardFront}>
          {/* Logo de empresa */}
          {empresaLogo ? (
            // Image de @react-pdf/renderer (PDF), no soporta alt; no es un <img> del DOM
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={empresaLogo} style={styles.logoEmpresa} />
          ) : (
            <Text style={styles.empresaSiglas}>{empresaNombre.substring(0, 5).toUpperCase()}</Text>
          )}

          {/* Nombre de empresa */}
          <Text style={styles.empresaNombreText}>{empresaNombre}</Text>

          {/* Foto del empleado */}
          <View style={styles.fotoContainer}>
            {fotoUrl ? (
              // Image de @react-pdf/renderer (PDF), no soporta alt; no es un <img> del DOM
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={fotoUrl} style={styles.foto} />
            ) : (
              <Text style={styles.fotoPlaceholder}>SIN{'\n'}FOTO</Text>
            )}
          </View>

          {/* Datos del empleado: nombres en una linea, apellidos en otra */}
          <Text style={styles.nombresText}>{nombres}</Text>
          <Text style={styles.apellidosText}>{apellidos}</Text>
          <Text style={styles.documento}>
            DNI N° {empleado.numero_documento}
          </Text>
          <Text style={styles.cargo}>{cargoNombre}</Text>
        </View>

        {/* Linea divisoria (guia de corte) */}
        <View style={styles.divider} />

        {/* ========== REVERSO ========== */}
        <View style={styles.cardBack}>
          {/* Instrucciones */}
          <Text style={styles.instruccion}>
            1. ESTE FOTOCHECK ES PERSONAL E INTRASFERIBLE.
          </Text>
          <Text style={styles.instruccion}>
            2. EN CASO DE PÉRDIDA O EXTRAVÍO DEVOLVER A LAS OFICINAS DE NUESTRA EMPRESA O LLAMAR A LOS
          </Text>

          {/* Teléfonos */}
          {(empresaTelefono || centroControl) && (
            <View style={styles.telefonoContainer}>
              {empresaTelefono && (
                <>
                  <Text style={styles.telefonoLabel}>TELEFONO</Text>
                  <Text style={styles.telefonoNumero}>{empresaTelefono}</Text>
                </>
              )}
              {centroControl && (
                <>
                  <Text style={styles.centroControlLabel}>CENTRO CONTROL :</Text>
                  <Text style={styles.centroControlNumeros}>{centroControl}</Text>
                </>
              )}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
