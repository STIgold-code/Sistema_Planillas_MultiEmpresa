"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import type { CrearFacturaData, ComparativaLinea } from "@/types/inventario";

/** Respuesta del POST /uploads (estructura del módulo de uploads). */
interface UploadResponse {
  file: { url: string; originalname: string };
}

/** Archivo de la factura ya subido a Wasabi/almacenamiento. */
export interface FacturaArchivoSubido {
  url: string;
  nombre: string;
}

const ENDPOINT = "/inventario/ingresos";

export function useFactura() {
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  /** Sube el archivo de la factura y devuelve su URL + nombre original. */
  const subirArchivo = async (
    file: File,
  ): Promise<FacturaArchivoSubido | null> => {
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.upload<UploadResponse>(
        "/uploads?categoria=documentos",
        formData,
      );
      return { url: res.file.url, nombre: res.file.originalname };
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo subir el archivo"));
      return null;
    } finally {
      setSubiendo(false);
    }
  };

  /** Digitaliza la factura: crea el ingreso y carga las prendas al stock. */
  const crearFactura = async (data: CrearFacturaData): Promise<boolean> => {
    setGuardando(true);
    try {
      const res = await api.post<{ total_items: number }>(
        `${ENDPOINT}/factura`,
        data,
      );
      toast.success(
        `Factura registrada: ${res.total_items} prendas cargadas al stock`,
      );
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Error al registrar la factura"));
      return false;
    } finally {
      setGuardando(false);
    }
  };

  /** Comparativa pedido-vs-recibido de un requerimiento. */
  const fetchComparativa = async (
    requerimientoId: number,
  ): Promise<ComparativaLinea[]> => {
    try {
      return await api.get<ComparativaLinea[]>(
        `${ENDPOINT}/comparativa/${requerimientoId}`,
      );
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          "No se pudo cargar la comparativa pedido-vs-recibido",
        ),
      );
      return [];
    }
  };

  return { guardando, subiendo, subirArchivo, crearFactura, fetchComparativa };
}
