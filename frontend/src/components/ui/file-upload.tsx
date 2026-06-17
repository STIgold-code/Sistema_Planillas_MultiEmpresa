'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, File, Loader2, Eye } from 'lucide-react';
import { Button } from './button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getAccessToken } from '@/lib/api';
import { FilePreviewModal } from './file-preview-modal';

export interface UploadedFile {
  archivo_url: string;
  archivo_nombre: string;
  archivo_tipo: string;
  archivo_size: number;
}

interface FileUploadProps {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // bytes
  accept?: string;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx,.doc';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(tipo: string) {
  if (tipo.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (tipo.includes('image') || tipo.includes('jpg') || tipo.includes('jpeg') || tipo.includes('png')) {
    return <Image className="h-5 w-5 text-blue-500" />;
  }
  if (tipo.includes('doc')) return <FileText className="h-5 w-5 text-blue-700" />;
  return <File className="h-5 w-5 text-gray-500" />;
}

export function FileUpload({
  value = [],
  onChange,
  maxFiles = DEFAULT_MAX_FILES,
  maxSize = DEFAULT_MAX_SIZE,
  accept = DEFAULT_ACCEPT,
  disabled = false,
  className,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Vista previa de archivos
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const remainingSlots = maxFiles - value.length;
      if (remainingSlots <= 0) {
        toast.error(`Máximo ${maxFiles} archivos permitidos`);
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      const newFiles: UploadedFile[] = [];

      setUploading(true);

      for (const file of filesToUpload) {
        // Validar tamaño
        if (file.size > maxSize) {
          toast.error(`${file.name} excede el tamaño máximo (${formatFileSize(maxSize)})`);
          continue;
        }

        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/uploads/documentos`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${getAccessToken()}`,
              },
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error(`Error al subir ${file.name}`);
          }

          const data = await response.json();
          // Si la URL ya es absoluta (empieza con http), usarla directamente
          // Si es relativa, concatenar con la base URL
          const fileUrl = data.file.url.startsWith('http')
            ? data.file.url
            : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${data.file.url}`;

          newFiles.push({
            archivo_url: fileUrl,
            archivo_nombre: file.name,
            archivo_tipo: file.type || data.mimetype || 'application/octet-stream',
            archivo_size: file.size,
          });
        } catch (error) {
          console.error('Error al subir archivo:', error);
          toast.error(`Error al subir ${file.name}`);
        }
      }

      if (newFiles.length > 0) {
        onChange([...value, ...newFiles]);
        toast.success(`${newFiles.length} archivo(s) subido(s)`);
      }

      setUploading(false);

      // Limpiar input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [value, onChange, maxFiles, maxSize]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const newFiles = [...value];
      newFiles.splice(index, 1);
      onChange(newFiles);
    },
    [value, onChange]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled || uploading) return;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [disabled, uploading, handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !uploading) {
      inputRef.current?.click();
    }
  }, [disabled, uploading]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Zona de arrastre */}
      <div
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors',
          'flex flex-col items-center justify-center cursor-pointer',
          disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : dragActive
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-primary hover:bg-gray-50',
          value.length >= maxFiles && 'opacity-50 cursor-not-allowed'
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Subiendo archivos...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Upload className="h-8 w-8" />
            <div className="text-center">
              <span className="text-sm font-medium">
                Arrastra archivos aquí o haz click para seleccionar
              </span>
              <p className="text-xs text-gray-400 mt-1">
                Máx. {maxFiles} archivos, {formatFileSize(maxSize)} cada uno
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lista de archivos */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((file, index) => (
            <div
              key={`${file.archivo_url}-${index}`}
              className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border"
            >
              {getFileIcon(file.archivo_tipo)}
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewIndex(index);
                    setPreviewOpen(true);
                  }}
                  className="text-sm font-medium text-gray-700 hover:text-primary truncate block text-left w-full"
                >
                  {file.archivo_nombre}
                </button>
                <span className="text-xs text-gray-400">
                  {formatFileSize(file.archivo_size)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex(index);
                  setPreviewOpen(true);
                }}
                className="h-8 w-8 p-0 text-gray-400 hover:text-primary"
                title="Vista previa"
              >
                <Eye className="h-4 w-4" />
              </Button>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleChange}
        disabled={disabled || uploading || value.length >= maxFiles}
        className="hidden"
      />

      {/* Modal de vista previa */}
      <FilePreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        files={value.map((f) => ({
          archivo_url: f.archivo_url,
          archivo_nombre: f.archivo_nombre,
          archivo_tipo: f.archivo_tipo,
        }))}
        initialIndex={previewIndex}
      />
    </div>
  );
}
