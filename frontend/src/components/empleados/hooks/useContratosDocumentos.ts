'use client';

import { useState } from 'react';
import { getAccessToken } from '@/lib/api';
import { Contrato, PlantillaContrato } from '@/types';
import { toast } from 'sonner';
import { PlantillaDocumento } from './contratos.types';

interface UseContratosDocumentosParams {
  empleadoId: number;
  plantillas: PlantillaContrato[];
  plantillasBanco: PlantillaDocumento[];
  fetchPlantillas: () => Promise<PlantillaContrato[]>;
}

export function useContratosDocumentos({
  empleadoId,
  plantillas,
  plantillasBanco,
  fetchPlantillas,
}: UseContratosDocumentosParams) {
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [showGenerarBancoModal, setShowGenerarBancoModal] = useState(false);

  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [selectedPlantilla, setSelectedPlantilla] = useState<string>('');
  const [selectedPlantillaBanco, setSelectedPlantillaBanco] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('banco');

  const [generating, setGenerating] = useState(false);
  const [downloadingContratoId, setDownloadingContratoId] = useState<number | null>(null);

  const handleDescargarContrato = async (contratoId: number) => {
    setDownloadingContratoId(contratoId);
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/contratos/${contratoId}/descargar`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al descargar contrato');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'contrato.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Error al descargar el contrato');
    } finally {
      setDownloadingContratoId(null);
    }
  };

  const handleGenerarUnificado = async () => {
    let plantillaId = '';
    let endpoint = '';
    let body: any = {};

    if (activeTab === 'banco') {
      if (!selectedPlantillaBanco) {
        toast.error('Seleccione una plantilla del Banco');
        return;
      }
      plantillaId = selectedPlantillaBanco;
      endpoint = '/banco-documentos/generar';
      body = {
        empleado_id: empleadoId,
        plantilla_documento_id: parseInt(plantillaId),
      };
    } else {
      if (!selectedPlantilla) {
        toast.error('Seleccione una plantilla de Contrato');
        return;
      }
      plantillaId = selectedPlantilla;
      endpoint = `/plantillas-contrato/${plantillaId}/generar`;
      const contratoData = selectedContrato ? {
        fecha_inicio: selectedContrato.fecha_inicio,
        fecha_fin: selectedContrato.fecha_fin,
        remuneracion: selectedContrato.remuneracion,
        tipo_contrato: selectedContrato.tipo_contrato,
        modalidad: selectedContrato.modalidad,
        empresa_cliente: selectedContrato.cliente?.razon_social || selectedContrato.empresa_cliente,
        lugar_trabajo: selectedContrato.lugar_trabajo,
      } : {};
      body = {
        empleado_id: empleadoId,
        contrato: contratoData,
        formato: 'pdf'
      };
    }

    setGenerating(true);
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al generar documento');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'documento.docx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      } else {
        if (activeTab === 'banco') {
          const p = plantillasBanco.find(pb => pb.id.toString() === plantillaId);
          if (p) filename = `${p.nombre}.docx`;
        } else {
          const p = plantillas.find(pc => pc.id.toString() === plantillaId);
          if (p) filename = `${p.nombre}.docx`;
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Documento generado correctamente');
      setShowGenerarBancoModal(false);
      setSelectedPlantillaBanco('');
      setSelectedPlantilla('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error al generar documento');
    } finally {
      setGenerating(false);
    }
  };

  const handleVerDetalle = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setShowDetalleModal(true);
  };

  const handleGenerarDocClick = async (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setActiveTab('contrato');

    const plantillasActualizadas = await fetchPlantillas();

    const plantillaPredeterminada = plantillasActualizadas.find(
      (p) => p.tipo_contrato === contrato.tipo_contrato && p.es_predeterminada && p.archivo_base_url
    ) || plantillasActualizadas.find((p) => p.archivo_base_url);

    if (plantillaPredeterminada) {
      setSelectedPlantilla(plantillaPredeterminada.id.toString());
    }

    setShowGenerarBancoModal(true);
  };

  return {
    // Modal states
    showDetalleModal, setShowDetalleModal,
    showGenerarBancoModal, setShowGenerarBancoModal,
    // Selected states
    selectedContrato, setSelectedContrato,
    selectedPlantilla, setSelectedPlantilla,
    selectedPlantillaBanco, setSelectedPlantillaBanco,
    activeTab, setActiveTab,
    // Loading
    generating,
    downloadingContratoId,
    // Handlers
    handleDescargarContrato,
    handleGenerarUnificado,
    handleVerDetalle,
    handleGenerarDocClick,
  };
}
