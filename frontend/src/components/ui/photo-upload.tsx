'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from './button';
import { api, getAccessToken } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthImage } from '@/hooks/useAuthImage';

interface PhotoUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export function PhotoUpload({
  value,
  onChange,
  disabled = false,
  className,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const authImageUrl = useAuthImage(value);

  // Sincronizar preview con la imagen autenticada
  useEffect(() => {
    if (authImageUrl) {
      setPreview((prev) => {
        // Revocar blob local anterior si existe (del upload preview)
        if (prev && prev.startsWith('blob:') && prev !== authImageUrl) {
          URL.revokeObjectURL(prev);
        }
        return authImageUrl;
      });
    } else if (!value) {
      setPreview(undefined);
    }
  }, [authImageUrl, value]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Solo se permiten imágenes (JPEG, PNG, WEBP)');
        return;
      }

      // Validar tamaño (máx 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('La imagen no debe superar los 5MB');
        return;
      }

      // Mostrar preview local mientras sube
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/uploads/fotos`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getAccessToken()}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error('Error al subir la imagen');
        }

        const data = await response.json();
        // data.file.path = key para DB (ej: "empleados/UUID.jpg")
        // data.file.url = URL servible (absoluta si Wasabi, relativa si local)
        const dbPath = data.file?.path;
        if (!dbPath) {
          throw new Error('No se recibió path del archivo');
        }
        // Mantener el blob local como preview hasta que useAuthImage resuelva
        // (el useEffect de sincronizacion lo reemplazara y revocara)
        onChange(dbPath);
        toast.success('Foto subida correctamente');
      } catch (error) {
        console.error('Error al subir foto:', error);
        toast.error('Error al subir la foto');
        setPreview(value); // Restaurar preview anterior
        URL.revokeObjectURL(localPreview);
      } finally {
        setUploading(false);
      }

      // Limpiar input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [value, onChange]
  );

  const handleRemove = useCallback(() => {
    setPreview(undefined);
    onChange(undefined);
  }, [onChange]);

  const handleClick = useCallback(() => {
    if (!disabled && !uploading) {
      inputRef.current?.click();
    }
  }, [disabled, uploading]);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Área de foto */}
      <div
        onClick={handleClick}
        className={cn(
          'relative w-32 h-36 rounded-lg border-2 border-dashed transition-colors overflow-hidden',
          'flex items-center justify-center cursor-pointer',
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-primary hover:bg-gray-50',
          preview && 'border-solid border-gray-200'
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs">Subiendo...</span>
          </div>
        ) : preview ? (
          <>
            <img
              src={preview}
              alt="Foto del empleado"
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-8 w-8 text-white" />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Camera className="h-10 w-10" />
            <span className="text-xs text-center px-2">
              Click para subir foto
            </span>
          </div>
        )}
      </div>

      {/* Botón de eliminar */}
      {preview && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <X className="h-4 w-4 mr-1" />
          Eliminar foto
        </Button>
      )}

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />
    </div>
  );
}
