'use client';

import { useState, useRef, useCallback } from 'react';
import { X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uploadFile } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';

interface LogoUploadProps {
  currentLogoUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
  disabled?: boolean;
  uploadPath?: string;
  label?: string;
  sublabel?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function LogoUpload({
  currentLogoUrl,
  onUpload,
  onRemove,
  disabled = false,
  uploadPath = '/uploads/logos',
  label = 'Arrastra una imagen o haz clic para seleccionar',
  sublabel = 'JPEG, PNG o WEBP (max. 5MB)',
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Solo se permiten imágenes JPEG, PNG o WEBP';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'El archivo no debe superar los 5MB';
    }
    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    // Crear preview local
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const result = await uploadFile(uploadPath, file) as { url?: string; file?: { url?: string } };
      const url = result.url || result.file?.url;
      if (url) onUpload(url);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Error al subir el logo'));
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [onUpload, uploadPath]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || uploading) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [disabled, uploading, handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleClick = () => {
    if (!disabled && !uploading) {
      inputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onRemove();
  };

  const rawUrl = preview || currentLogoUrl;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  // Normalize URL: extract the S3 key from full URLs and use public endpoint
  let displayUrl = rawUrl;
  if (rawUrl && !rawUrl.startsWith('data:')) {
    const keyMatch = rawUrl.match(/\/files\/key\/(.+)$/);
    if (keyMatch) {
      displayUrl = `${apiBase}/files/public/${keyMatch[1]}`;
    } else if (!rawUrl.startsWith('http')) {
      displayUrl = `${apiBase}/files/public/${encodeURIComponent(rawUrl)}`;
    }
  }

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          dragActive && 'border-primary bg-primary/5',
          error && 'border-destructive',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && !uploading && 'hover:bg-muted/50',
          displayUrl && 'border-solid border-muted'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleChange}
          disabled={disabled || uploading}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin" />
            <span className="text-sm">Subiendo...</span>
          </div>
        ) : displayUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl || ''}
              alt={label}
              className="max-h-40 max-w-full object-contain rounded"
            />
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="p-3 rounded-full bg-muted">
              <ImageIcon className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {label}
              </p>
              <p className="text-xs mt-1">
                {sublabel}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
