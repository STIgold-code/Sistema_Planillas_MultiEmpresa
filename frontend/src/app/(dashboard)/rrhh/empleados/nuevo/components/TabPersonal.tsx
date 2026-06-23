'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  EmpleadoFormValues,
  Departamento,
  Provincia,
  Distrito,
  handleNumericInput,
  handleLetterInput,
} from '../useEmpleadoNuevo';

interface TabPersonalProps {
  form: UseFormReturn<EmpleadoFormValues>;
  loading: boolean;
  departamentos: Departamento[];
  provincias: Provincia[];
  distritos: Distrito[];
  selectedDepartamentoId: string | undefined;
  selectedProvinciaId: string | undefined;
}

export function TabPersonal({
  form,
  loading,
  departamentos,
  provincias,
  distritos,
  selectedDepartamentoId,
  selectedProvinciaId,
}: TabPersonalProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos Personales</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          {/* Foto del empleado */}
          <div className="flex flex-col items-center">
            <FormField
              control={form.control}
              name="foto_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-center block mb-2">Foto</FormLabel>
                  <FormControl>
                    <PhotoUpload
                      value={field.value}
                      onChange={field.onChange}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Campos del formulario */}
          <div className="flex-1 grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="tipo_documento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Documento *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DNI">DNI</SelectItem>
                      <SelectItem value="CE">Carnet Extranjeria</SelectItem>
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
                  <FormLabel>Numero Documento *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={12}
                      onChange={(e) => handleNumericInput(e, field.onChange)}
                      placeholder="12345678"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fecha_nacimiento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha Nacimiento *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apellido_paterno"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido Paterno *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => handleLetterInput(e, field.onChange)}
                      placeholder="GARCIA"
                    />
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
                    <Input
                      {...field}
                      onChange={(e) => handleLetterInput(e, field.onChange)}
                      placeholder="LOPEZ"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nombres"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombres *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => handleLetterInput(e, field.onChange)}
                      placeholder="JUAN CARLOS"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sexo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estado_civil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado Civil</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SOLTERO">Soltero(a)</SelectItem>
                      <SelectItem value="CASADO">Casado(a)</SelectItem>
                      <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                      <SelectItem value="VIUDO">Viudo(a)</SelectItem>
                      <SelectItem value="CONVIVIENTE">Conviviente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nacionalidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nacionalidad</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="celular"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Celular</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={9}
                      onChange={(e) => handleNumericInput(e, field.onChange)}
                      placeholder="987654321"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono Fijo</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => handleNumericInput(e, field.onChange)}
                      placeholder="014567890"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Personal</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="col-span-full">
              <h3 className="font-medium mb-4 mt-4">Direccion</h3>
            </div>

            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Direccion</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referencia</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="departamento_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione departamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departamentos.map((dep) => (
                        <SelectItem key={dep.id} value={dep.id.toString()}>
                          {dep.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provincia_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provincia</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={!selectedDepartamentoId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione provincia" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {provincias.map((prov) => (
                        <SelectItem key={prov.id} value={prov.id.toString()}>
                          {prov.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="distrito_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Distrito</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                    disabled={!selectedProvinciaId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione distrito" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {distritos.map((dist) => (
                        <SelectItem key={dist.id} value={dist.id.toString()}>
                          {dist.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
