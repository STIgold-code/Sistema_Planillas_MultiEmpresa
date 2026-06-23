'use client';

import { UseFormReturn } from 'react-hook-form';
import { EditarFormValues } from '../hooks/useEditarPostulante';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PhotoUpload } from '@/components/ui/photo-upload';

interface CardIdentificacionProps {
  form: UseFormReturn<EditarFormValues>;
}

export function CardIdentificacion({ form }: CardIdentificacionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de Identificacion</CardTitle>
        <CardDescription>Documento, nombres y foto del postulante</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-4">
            <div className="grid gap-2 md:gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="tipo_documento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Doc.</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DNI">DNI</SelectItem>
                        <SelectItem value="CE">CE</SelectItem>
                        <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numero_documento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="12345678" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-2 md:gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="apellido_paterno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido Paterno *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="GARCIA" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apellido_materno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido Materno *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="LOPEZ" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nombres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombres *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="JUAN CARLOS" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="foto_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Foto</FormLabel>
                <PhotoUpload
                  value={field.value}
                  onChange={(url) => field.onChange(url || '')}
                />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
