'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
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
      const blob = await api.getBlob(`/contratos/${contratoId}/descargar`);
      const filename = 'contrato.pdf';

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error('Error al descargar el contrato');
    } finally {
      setDownloadingContratoId(null);
    }
  };

  const handleGenerarUnificado = async () => {
    let plantillaId = '';
    let endpoint = '';
    let body: Record<string, unknown> = {};

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
      const blob = await api.postBlob(endpoint, body);

      let filename = 'documento.docx';
      if (activeTab === 'banco') {
        const p = plantillasBanco.find(pb => pb.id.toString() === plantillaId);
        if (p) filename = `${p.nombre}.docx`;
      } else {
        const p = plantillas.find(pc => pc.id.toString() === plantillaId);
        if (p) filename = `${p.nombre}.docx`;
      }

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
    } catch (error: unknown) {
      console.error(error);
      toast.error(getApiErrorMessage(error, 'Error al generar documento'));
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
