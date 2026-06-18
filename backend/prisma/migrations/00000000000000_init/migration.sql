-- CreateEnum
CREATE TYPE "EstadoSolicitudBaja" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "TipoRegimen" AS ENUM ('AFP', 'ONP', 'SIN_REGIMEN');

-- CreateEnum
CREATE TYPE "RegimenLaboral" AS ENUM ('GENERAL', 'PEQUENA_EMPRESA', 'MICROEMPRESA', 'AGRARIO', 'CONSTRUCCION_CIVIL', 'HOGAR');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DNI', 'CE', 'PASAPORTE');

-- CreateEnum
CREATE TYPE "SexoTipo" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "EstadoEmpleado" AS ENUM ('ACTIVO', 'BAJA', 'VACACIONES', 'SUSPENDIDO', 'CESE', 'PENDIENTE', 'CESADO');

-- CreateEnum
CREATE TYPE "EstadoDocumentacion" AS ENUM ('PENDIENTE', 'INCOMPLETO', 'COMPLETO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "TipoPago" AS ENUM ('PLANILLA', 'RECIBO');

-- CreateEnum
CREATE TYPE "TurnoTipo" AS ENUM ('DIA', 'NOCHE');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ALTA', 'BAJA', 'RENUNCIA', 'VACACIONES', 'SUSPENSION', 'REINCORPORACION', 'ANULACION_CONTRATO');

-- CreateEnum
CREATE TYPE "EstadoContrato" AS ENUM ('ACTIVO', 'PENDIENTE', 'RENOVADO', 'CESADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'CALCULAR', 'APROBAR', 'RECHAZAR', 'PAGAR', 'ANULAR', 'CERRAR_PERIODO', 'REABRIR_PERIODO', 'INICIAR_SESION', 'FINALIZAR_SESION', 'APROBAR_JEFE', 'APROBAR_RRHH');

-- CreateEnum
CREATE TYPE "TipoVigenciaDocumento" AS ENUM ('SIN_FECHAS', 'SOLO_EMISION', 'CON_VENCIMIENTO');

-- CreateEnum
CREATE TYPE "EstadoVacante" AS ENUM ('BORRADOR', 'PUBLICADA', 'EN_PROCESO', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoPostulante" AS ENUM ('EN_PROCESO', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoEvaluacion" AS ENUM ('CURRICULAR', 'ENTREVISTA', 'PSICOLOGICA', 'TECNICA', 'REFERENCIAS', 'MEDICA', 'OTRO');

-- CreateEnum
CREATE TYPE "ProcedenciaPostulante" AS ENUM ('COMPUTRABAJO', 'RECOMENDADO', 'REDES');

-- CreateEnum
CREATE TYPE "EstadoPeriodoTareo" AS ENUM ('BORRADOR', 'EN_PROCESO', 'CERRADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "CategoriaDocumento" AS ENUM ('INGRESO', 'LABORAL', 'SALIDA', 'CARTA_PRE_AVISO');

-- CreateEnum
CREATE TYPE "OrigenDocumentoEmpleado" AS ENUM ('SELECCION', 'RRHH');

-- CreateEnum
CREATE TYPE "EstadoDocumentoGenerado" AS ENUM ('PENDIENTE', 'FIRMADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoTareo" AS ENUM ('PENDIENTE', 'COMPLETO', 'VALIDADO');

-- CreateEnum
CREATE TYPE "MotivoPhotocheck" AS ENUM ('NUEVO', 'RENOVACION', 'PERDIDA', 'DETERIORO');

-- CreateEnum
CREATE TYPE "TipoJustificacion" AS ENUM ('CERTIFICADO_MEDICO', 'DESCANSO_MEDICO', 'PERMISO_PERSONAL', 'PERMISO_LABORAL', 'LICENCIA_MATERNIDAD', 'LICENCIA_PATERNIDAD', 'LICENCIA_FALLECIMIENTO', 'VACACIONES', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoDocumentoJustificacion" AS ENUM ('CCI', 'PRIVADO', 'OTROS');

-- CreateEnum
CREATE TYPE "EstadoPeriodoVacacional" AS ENUM ('ACUMULANDO', 'DISPONIBLE', 'PARCIAL', 'AGOTADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "EstadoSolicitudVacaciones" AS ENUM ('PENDIENTE_JEFE', 'PENDIENTE_RRHH', 'APROBADA', 'EN_GOCE', 'GOZADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoMovimientoVacacional" AS ENUM ('GOCE', 'VENTA', 'ADELANTO', 'TRUNCAS', 'AJUSTE');

-- CreateEnum
CREATE TYPE "EstadoCarnetSucamec" AS ENUM ('VIGENTE', 'VENCIDO', 'SUSPENDIDO', 'ANULADO');

-- CreateEnum
CREATE TYPE "CategoriaSucamec" AS ENUM ('BASICO', 'ESPECIALIZADO', 'RESGUARDO', 'PROTECCION', 'TRANSPORTE', 'TECNOLOGIA', 'CAPACITADOR');

-- CreateEnum
CREATE TYPE "TipoArchivoPlantilla" AS ENUM ('HTML', 'WORD', 'EXCEL');

-- CreateEnum
CREATE TYPE "EstadoPlanilla" AS ENUM ('BORRADOR', 'CALCULADA', 'REVISADA', 'APROBADA', 'PAGADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoBoleta" AS ENUM ('GENERADA', 'DESCARGADA', 'ENVIADA', 'CONFIRMADA');

-- CreateEnum
CREATE TYPE "FaseOnboarding" AS ENUM ('PRE_INGRESO', 'DIA_1', 'SEMANA_1', 'MES_1', 'MES_3', 'CONTINUO');

-- CreateEnum
CREATE TYPE "ResponsableOnboarding" AS ENUM ('RRHH', 'JEFE_DIRECTO', 'TI', 'SEGURIDAD', 'EMPLEADO', 'MENTOR', 'ADMINISTRACION');

-- CreateEnum
CREATE TYPE "EstadoProcesoOnboarding" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoTareaOnboarding" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'OMITIDA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "EstadoSesionTareo" AS ENUM ('ACTIVA', 'FINALIZADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "EstadoSolicitudExtension" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoSolicitudCese" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "FormatoReporte" AS ENUM ('EXCEL', 'PDF');

-- CreateEnum
CREATE TYPE "EstadoVinculo" AS ENUM ('ACTIVO', 'CERRADO');

-- CreateEnum
CREATE TYPE "GeneroUniforme" AS ENUM ('UNISEX', 'MASCULINO', 'FEMENINO');

-- CreateEnum
CREATE TYPE "EstadoItemInventario" AS ENUM ('DISPONIBLE', 'ENTREGADO', 'BAJA');

-- CreateEnum
CREATE TYPE "CondicionItemInventario" AS ENUM ('NUEVO', 'USADO');

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('ENTRADA', 'ENTREGA', 'DEVOLUCION', 'BAJA');

-- CreateEnum
CREATE TYPE "EstadoSolicitudDescuentoUniforme" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoRequerimientoUniforme" AS ENUM ('BORRADOR', 'APROBADO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "EstadoSolicitudAnulacionContrato" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "tokens_revocados" (
    "id" SERIAL NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "usuario_id" INTEGER,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_revocados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(500) NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "categoria" VARCHAR(50) NOT NULL,
    "publico" BOOLEAN NOT NULL DEFAULT false,
    "subido_por_id" INTEGER,
    "mime" VARCHAR(150),
    "size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" SERIAL NOT NULL,
    "ruc" VARCHAR(11) NOT NULL,
    "razon_social" VARCHAR(200) NOT NULL,
    "nombre_comercial" VARCHAR(200),
    "direccion" VARCHAR(300),
    "telefono" VARCHAR(20),
    "centro_control" VARCHAR(100),
    "email" VARCHAR(100),
    "representante_legal" VARCHAR(200),
    "dni_representante" VARCHAR(12),
    "cargo_representante" VARCHAR(100),
    "partida_electronica" VARCHAR(20),
    "logo_url" VARCHAR(500),
    "firma_representante_url" VARCHAR(500),
    "regimen_laboral_default" "RegimenLaboral" NOT NULL DEFAULT 'GENERAL',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(300),
    "permisos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "empresa_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "nombre_completo" VARCHAR(200) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresa_id" INTEGER NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "ultimo_acceso" TIMESTAMP(3),
    "tokens_revocados_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "usuario_email" VARCHAR(150),
    "accion" "AccionAuditoria" NOT NULL,
    "tabla_afectada" VARCHAR(100),
    "registro_id" INTEGER,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "empresa_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(300),
    "empresa_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "ruc" VARCHAR(11) NOT NULL,
    "razon_social" VARCHAR(200) NOT NULL,
    "nombre_comercial" VARCHAR(200),
    "direccion" VARCHAR(300),
    "telefono" VARCHAR(20),
    "email" VARCHAR(100),
    "contacto_nombre" VARCHAR(200),
    "contacto_telefono" VARCHAR(20),
    "contacto_email" VARCHAR(100),
    "empresa_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bancos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "codigo" VARCHAR(10),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bancos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedencias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(300),
    "empresa_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regimenes_pensionarios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "tipo" "TipoRegimen" NOT NULL,
    "aporte_obligatorio" DECIMAL(5,2) DEFAULT 0,
    "comision_flujo" DECIMAL(5,2) DEFAULT 0,
    "comision_saldo" DECIMAL(5,2) DEFAULT 0,
    "prima_seguro" DECIMAL(5,2) DEFAULT 0,
    "remuneracion_maxima" DECIMAL(10,2) DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regimenes_pensionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_marcacion" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(100) NOT NULL,
    "color" VARCHAR(20),
    "cuenta_como" VARCHAR(50),
    "horas_default" INTEGER DEFAULT 8,
    "horas_diurnas" INTEGER NOT NULL DEFAULT 0,
    "horas_nocturnas" INTEGER NOT NULL DEFAULT 0,
    "requiere_calculo" BOOLEAN NOT NULL DEFAULT false,
    "es_laborable" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "es_feriado_trabajado" BOOLEAN NOT NULL DEFAULT false,
    "equivalente_codigo" VARCHAR(20),
    "genera_pago" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_marcacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departamentos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provincias" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "departamento_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provincias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distritos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "provincia_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" SERIAL NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL DEFAULT 'DNI',
    "numero_documento" VARCHAR(12) NOT NULL,
    "apellido_paterno" VARCHAR(100) NOT NULL,
    "apellido_materno" VARCHAR(100) NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "fecha_nacimiento" DATE NOT NULL,
    "sexo" "SexoTipo" NOT NULL,
    "estado_civil" VARCHAR(20),
    "nacionalidad" VARCHAR(50) DEFAULT 'PERUANA',
    "telefono" VARCHAR(20),
    "celular" VARCHAR(20),
    "email" VARCHAR(100),
    "foto_url" VARCHAR(500),
    "direccion" VARCHAR(300),
    "referencia" VARCHAR(200),
    "distrito_id" INTEGER,
    "area_id" INTEGER,
    "cargo_id" INTEGER,
    "sede_id" INTEGER,
    "fecha_ingreso" DATE NOT NULL,
    "fecha_planilla" DATE,
    "fecha_cese" DATE,
    "estado" "EstadoEmpleado" NOT NULL DEFAULT 'ACTIVO',
    "estado_documentacion" "EstadoDocumentacion" NOT NULL DEFAULT 'PENDIENTE',
    "sueldo_base" DECIMAL(10,2) NOT NULL DEFAULT 1130.00,
    "tipo_pago" "TipoPago" NOT NULL DEFAULT 'PLANILLA',
    "turno" "TurnoTipo" NOT NULL DEFAULT 'DIA',
    "regimen_pensionario_id" INTEGER,
    "cuspp" VARCHAR(20),
    "asignacion_familiar" BOOLEAN NOT NULL DEFAULT false,
    "sctr" BOOLEAN NOT NULL DEFAULT false,
    "es_mype" BOOLEAN NOT NULL DEFAULT false,
    "bono_productividad" DECIMAL(10,2),
    "bono_desempeno" DECIMAL(10,2),
    "bono_movilidad" DECIMAL(10,2),
    "bono_refrigerio" DECIMAL(10,2),
    "bono_armado" DECIMAL(10,2),
    "asignacion_cliente" DECIMAL(10,2),
    "monto_adelanto" DECIMAL(10,2),
    "banco_haberes_id" INTEGER,
    "nro_cuenta_haberes" VARCHAR(30),
    "cci_haberes" VARCHAR(25),
    "banco_cts_id" INTEGER,
    "nro_cuenta_cts" VARCHAR(30),
    "cci_cts" VARCHAR(25),
    "celular_asignado" VARCHAR(20),
    "email_asignado" VARCHAR(100),
    "estatura" DECIMAL(3,2),
    "peso" DECIMAL(5,2),
    "categoria_licencia" VARCHAR(10),
    "estudios" JSONB,
    "capacitaciones" JSONB,
    "experiencias" JSONB,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados_familiares" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "parentesco" VARCHAR(50) NOT NULL,
    "nombres_apellidos" VARCHAR(200) NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL DEFAULT 'DNI',
    "numero_documento" VARCHAR(12),
    "fecha_nacimiento" DATE,
    "telefono" VARCHAR(20),
    "es_dependiente" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_familiares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_documento_empleado" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(300),
    "es_obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "aplica_seleccion" BOOLEAN NOT NULL DEFAULT false,
    "aplica_rrhh" BOOLEAN NOT NULL DEFAULT false,
    "dias_alerta" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "tipo_vigencia" "TipoVigenciaDocumento" NOT NULL DEFAULT 'SIN_FECHAS',

    CONSTRAINT "tipos_documento_empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados_documentos" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "tipo_documento_empleado_id" INTEGER,
    "descripcion" VARCHAR(300),
    "archivo_url" VARCHAR(500) NOT NULL,
    "archivo_nombre" VARCHAR(200),
    "fecha_emision" DATE,
    "fecha_vencimiento" DATE,
    "fecha_carga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "origen" "OrigenDocumentoEmpleado" NOT NULL DEFAULT 'RRHH',
    "version" INTEGER NOT NULL DEFAULT 1,
    "es_version_vigente" BOOLEAN NOT NULL DEFAULT true,
    "documento_origen_id" INTEGER,
    "motivo_nueva_version" VARCHAR(500),
    "subido_por_id" INTEGER,
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "eliminado_en" TIMESTAMP(3),
    "eliminado_por_id" INTEGER,
    "motivo_eliminacion" VARCHAR(500),

    CONSTRAINT "empleados_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados_movimientos" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "tipo_movimiento" "TipoMovimiento" NOT NULL,
    "fecha_movimiento" DATE NOT NULL,
    "motivo" VARCHAR(500),
    "observaciones" TEXT,
    "usuario_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empleados_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "plantilla_id" INTEGER,
    "cliente_id" INTEGER,
    "vinculo_laboral_id" INTEGER,
    "tipo_contrato" VARCHAR(100) NOT NULL,
    "modalidad" VARCHAR(100),
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "fecha_firma" DATE,
    "estado" "EstadoContrato" NOT NULL DEFAULT 'ACTIVO',
    "renovar" BOOLEAN NOT NULL DEFAULT false,
    "remuneracion" DECIMAL(10,2),
    "regimen_laboral" "RegimenLaboral",
    "observaciones" TEXT,
    "archivo_url" VARCHAR(500),
    "empresa_cliente" VARCHAR(200),
    "lugar_trabajo" VARCHAR(300),
    "usuario_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "fecha_cese" DATE,
    "motivo_cese" VARCHAR(500),
    "numero_renovacion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros_legales" (
    "id" SERIAL NOT NULL,
    "clave" VARCHAR(50) NOT NULL,
    "valor" DECIMAL(14,6) NOT NULL,
    "descripcion" VARCHAR(200),
    "vigencia_desde" DATE NOT NULL,
    "vigencia_hasta" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametros_legales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carnets_sucamec" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "numero_carnet" VARCHAR(20) NOT NULL,
    "categoria" "CategoriaSucamec" NOT NULL DEFAULT 'BASICO',
    "fecha_emision" DATE NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "estado" "EstadoCarnetSucamec" NOT NULL DEFAULT 'VIGENTE',
    "observaciones" TEXT,
    "usuario_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "documento_id" INTEGER,

    CONSTRAINT "carnets_sucamec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas_contrato" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" VARCHAR(500),
    "tipo_contrato" VARCHAR(100) NOT NULL,
    "contenido" TEXT NOT NULL,
    "variables" JSONB,
    "archivo_base_url" VARCHAR(500),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "es_predeterminada" BOOLEAN NOT NULL DEFAULT false,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas_documento" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" VARCHAR(500),
    "categoria" "CategoriaDocumento" NOT NULL DEFAULT 'LABORAL',
    "contenido" TEXT,
    "archivo_base_url" VARCHAR(500),
    "tipo_archivo" "TipoArchivoPlantilla" NOT NULL DEFAULT 'HTML',
    "variables" JSONB,
    "requiere_firma" BOOLEAN NOT NULL DEFAULT true,
    "es_obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_generados" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "plantilla_documento_id" INTEGER NOT NULL,
    "contenido_generado" TEXT,
    "archivo_url" VARCHAR(500),
    "archivo_firmado_url" VARCHAR(500),
    "estado" "EstadoDocumentoGenerado" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_firma" TIMESTAMP(3),
    "generado_por" INTEGER,
    "observaciones" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_generados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacantes" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "cargo_id" INTEGER,
    "area_id" INTEGER,
    "sede_id" INTEGER,
    "cantidad_puestos" INTEGER NOT NULL DEFAULT 1,
    "sueldo_ofrecido" DECIMAL(10,2),
    "tipo_contrato" VARCHAR(100),
    "modalidad" VARCHAR(50),
    "requisitos" JSONB,
    "fecha_publicacion" DATE,
    "fecha_cierre" DATE,
    "estado" "EstadoVacante" NOT NULL DEFAULT 'BORRADOR',
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postulantes" (
    "id" SERIAL NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL DEFAULT 'DNI',
    "numero_documento" VARCHAR(12) NOT NULL,
    "apellido_paterno" VARCHAR(100) NOT NULL,
    "apellido_materno" VARCHAR(100) NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "fecha_nacimiento" DATE,
    "sexo" "SexoTipo",
    "celular" VARCHAR(20),
    "telefono" VARCHAR(20),
    "email" VARCHAR(100),
    "foto_url" VARCHAR(500),
    "estado_civil" VARCHAR(20),
    "nacionalidad" VARCHAR(50),
    "direccion" VARCHAR(300),
    "referencia" VARCHAR(300),
    "distrito_id" INTEGER,
    "estatura" DECIMAL(3,2),
    "peso" DECIMAL(5,2),
    "categoria_licencia" VARCHAR(10),
    "estudios" JSONB,
    "experiencias" JSONB,
    "capacitaciones" JSONB,
    "vacante_id" INTEGER NOT NULL,
    "estado" "EstadoPostulante" NOT NULL DEFAULT 'EN_PROCESO',
    "fecha_postulacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluaciones" JSONB,
    "pretension_salarial" DECIMAL(10,2),
    "procedencia" "ProcedenciaPostulante",
    "procedencia_id" INTEGER,
    "motivo_rechazo" VARCHAR(500),
    "empleado_id" INTEGER,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postulantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_evaluacion" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(500),
    "puntaje_maximo" DECIMAL(5,2),
    "es_obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postulante_evaluaciones" (
    "id" SERIAL NOT NULL,
    "postulante_id" INTEGER NOT NULL,
    "tipo" "TipoEvaluacion",
    "tipo_evaluacion_id" INTEGER,
    "puntaje" DECIMAL(5,2),
    "comentario" VARCHAR(1000),
    "evaluador_id" INTEGER,
    "archivo_url" VARCHAR(500),
    "archivo_nombre" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postulante_evaluaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postulante_documentos" (
    "id" SERIAL NOT NULL,
    "postulante_id" INTEGER NOT NULL,
    "tipo_documento_empleado_id" INTEGER,
    "descripcion" VARCHAR(300),
    "archivo_url" VARCHAR(500) NOT NULL,
    "archivo_nombre" VARCHAR(200),
    "fecha_emision" DATE,
    "fecha_vencimiento" DATE,
    "fecha_carga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "es_version_vigente" BOOLEAN NOT NULL DEFAULT true,
    "documento_origen_id" INTEGER,
    "motivo_nueva_version" VARCHAR(500),
    "subido_por_id" INTEGER,
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "eliminado_en" TIMESTAMP(3),
    "eliminado_por_id" INTEGER,
    "motivo_eliminacion" VARCHAR(500),

    CONSTRAINT "postulante_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sedes" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "direccion" VARCHAR(300),
    "cliente_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sede_contactos" (
    "id" SERIAL NOT NULL,
    "sede_id" INTEGER NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "cargo" VARCHAR(100),
    "telefono" VARCHAR(20),
    "email" VARCHAR(100),
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sede_contactos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodos_tareo" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" "EstadoPeriodoTareo" NOT NULL DEFAULT 'BORRADOR',
    "fecha_cierre" TIMESTAMP(3),
    "cerrado_por" INTEGER,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodos_tareo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareos" (
    "id" SERIAL NOT NULL,
    "periodo_id" INTEGER NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "area_id" INTEGER,
    "sede_id" INTEGER,
    "cargo_id" INTEGER,
    "estado" "EstadoTareo" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareo_detalles" (
    "id" SERIAL NOT NULL,
    "tareo_id" INTEGER NOT NULL,
    "dia" INTEGER NOT NULL,
    "tipo_marcacion_id" INTEGER,
    "horas" DECIMAL(4,2),
    "observacion" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareo_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareo_detalle_audits" (
    "id" SERIAL NOT NULL,
    "tareo_detalle_id" INTEGER NOT NULL,
    "valor_anterior" VARCHAR(10),
    "valor_nuevo" VARCHAR(10),
    "usuario_id" INTEGER,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tareo_detalle_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareo_justificaciones" (
    "id" SERIAL NOT NULL,
    "tareo_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "dia_inicio" INTEGER NOT NULL,
    "dia_fin" INTEGER NOT NULL,
    "tipo" "TipoJustificacion" NOT NULL,
    "tipo_documento" "TipoDocumentoJustificacion" NOT NULL DEFAULT 'OTROS',
    "codigo_certificado" TEXT,
    "descripcion" TEXT,
    "solicitud_vacaciones_id" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareo_justificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareo_justificacion_archivos" (
    "id" SERIAL NOT NULL,
    "justificacion_id" INTEGER NOT NULL,
    "archivo_url" TEXT NOT NULL,
    "archivo_nombre" TEXT NOT NULL,
    "archivo_tipo" TEXT NOT NULL,
    "archivo_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tareo_justificacion_archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planillas" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "periodo_tareo_id" INTEGER,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "estado" "EstadoPlanilla" NOT NULL DEFAULT 'BORRADOR',
    "fecha_generacion" TIMESTAMP(3),
    "fecha_aprobacion" TIMESTAMP(3),
    "fecha_pago" TIMESTAMP(3),
    "aprobado_por" INTEGER,
    "total_bruto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_descuentos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_neto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_empleados" INTEGER NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planilla_detalles" (
    "id" SERIAL NOT NULL,
    "planilla_id" INTEGER NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "total_dias" INTEGER NOT NULL DEFAULT 30,
    "dias_trabajados" INTEGER NOT NULL DEFAULT 0,
    "dias_no_laborados" INTEGER NOT NULL DEFAULT 0,
    "dias_falta" INTEGER NOT NULL DEFAULT 0,
    "dias_cesado_no_lab" INTEGER NOT NULL DEFAULT 0,
    "dias_nuevo_no_lab" INTEGER NOT NULL DEFAULT 0,
    "dias_sin_cobertura" INTEGER NOT NULL DEFAULT 0,
    "dias_suspension" INTEGER NOT NULL DEFAULT 0,
    "dias_vacaciones" INTEGER NOT NULL DEFAULT 0,
    "dias_subsidio" INTEGER NOT NULL DEFAULT 0,
    "dias_subsidio_incapacidad" INTEGER NOT NULL DEFAULT 0,
    "dias_subsidio_maternidad" INTEGER NOT NULL DEFAULT 0,
    "dias_descanso_medico" INTEGER NOT NULL DEFAULT 0,
    "dias_licencia_sin_goce" INTEGER NOT NULL DEFAULT 0,
    "dias_licencia_fallecimiento" INTEGER NOT NULL DEFAULT 0,
    "dias_licencia_paternidad" INTEGER NOT NULL DEFAULT 0,
    "dias_licencia_con_goce" INTEGER NOT NULL DEFAULT 0,
    "turno_dia" INTEGER NOT NULL DEFAULT 0,
    "turno_noche" INTEGER NOT NULL DEFAULT 0,
    "horas_8" INTEGER NOT NULL DEFAULT 0,
    "cantidad_feriados" INTEGER NOT NULL DEFAULT 0,
    "rem_basica" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bono_productividad_base" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bono_desempeno_base" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bono_movilidad_base" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bono_refrigerio_base" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "asig_fam_cliente_base" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "he_25_estructura" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "he_35_estructura" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonif_nocturna_base" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vac_base" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "grat_base" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cts_base" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bono_armado_base" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_sueldo_estructura" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "diferencia_estructura" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "por_dias_trab" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sueldo_neto_estructura" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sueldo_base" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sueldo_proporcional" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "haber_mensual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sueldo_nocturno" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pasaje_especial" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "horas_extras" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "horas_extras_25" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "horas_extras_35" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "feriado_trabajado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descanso_medico_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subsidio_incapacidad" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subsidio_maternidad" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "asignacion_familiar" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "licencia_goce_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonificaciones" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonificacion_nocturna" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vacaciones_ingreso" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gratificacion_ingreso" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cts_ingreso" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bono_armado_ingreso" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otros_ingresos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "remuneracion_vacacional" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "compensacion_vacacional" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cts_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gratificacion_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "movilidad" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "refrigerio" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bono_desempeno_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "asignacion_cliente" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pegada_reenganche" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bono_productividad_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bono_armado_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bono_referido" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonos_modulo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reintegro_dias_trab" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reintegro_inafecto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ingreso_sobregiro" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "venta_vacaciones" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "afp_aporte" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "afp_comision" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "afp_seguro" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "afp_prima" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "onp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "essalud" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "renta_5ta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adelantos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adelanto_quincena" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adelanto_vacacional" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otros_adelantos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adelanto_cts" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adelanto_gratificacion" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "prestamos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "prestamo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otros_descuentos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento_faltas" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento_sobregiro" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento_reintegro" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "retencion_judicial" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento_feriado" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sctr" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quinta_categoria" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_ingresos_afectos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_ingresos_no_afectos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_ingresos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_descuentos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_descuentos_ley" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_descuentos_otros" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "remuneracion_afecta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "neto_pagar" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "neto_mes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_haberes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "essalud_empleador" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sctr_salud_empleador" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sctr_pension_empleador" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vida_ley_empleador" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_aportes_empleador" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rem_computable_vacaciones" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rem_computable_gratificacion" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rem_computable_cts" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rem_computable_afp" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rem_computable_renta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "promedio_horas_extras" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "promedio_comisiones" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sexto_gratificacion" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bonif_extraordinaria" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "treintavo_diario" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "meses_cts" INTEGER NOT NULL DEFAULT 0,
    "dias_cts" INTEGER NOT NULL DEFAULT 0,
    "cts_periodo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cts_trunca" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "grat_trunca" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vac_truncas" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_beneficios_sociales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "regimen_pensionario" VARCHAR(50),
    "banco_nombre" VARCHAR(100),
    "cuenta_numero" VARCHAR(30),
    "cci" VARCHAR(30),
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "descanso_trabajado_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento_permisos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descuento_tardanzas" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dias_descanso_trabajado" INTEGER NOT NULL DEFAULT 0,
    "dias_falta_justificada" INTEGER NOT NULL DEFAULT 0,
    "dias_feriado_no_trabajado" INTEGER NOT NULL DEFAULT 0,
    "dias_horas_extra" INTEGER NOT NULL DEFAULT 0,
    "dias_pegada" INTEGER NOT NULL DEFAULT 0,
    "dias_permiso" INTEGER NOT NULL DEFAULT 0,
    "dias_retenido" INTEGER NOT NULL DEFAULT 0,
    "minutos_tardanza" INTEGER NOT NULL DEFAULT 0,
    "tiene_adelanto_quincenal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "planilla_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boletas" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "planilla_detalle_id" INTEGER NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "estado" "EstadoBoleta" NOT NULL DEFAULT 'GENERADA',
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_primera_descarga" TIMESTAMP(3),
    "fecha_ultimo_acceso" TIMESTAMP(3),
    "fecha_envio_email" TIMESTAMP(3),
    "veces_descargada" INTEGER NOT NULL DEFAULT 0,
    "email_enviado_a" VARCHAR(255),
    "pdf_url" VARCHAR(500),
    "generado_por" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boletas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photocheck_logs" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "generado_por" INTEGER,
    "motivo" "MotivoPhotocheck" NOT NULL,
    "observaciones" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "fecha_generacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photocheck_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_vacaciones" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "dias_regimen_general" INTEGER NOT NULL DEFAULT 30,
    "dias_regimen_mype" INTEGER NOT NULL DEFAULT 15,
    "dias_tiempo_parcial" INTEGER NOT NULL DEFAULT 6,
    "permitir_venta" BOOLEAN NOT NULL DEFAULT true,
    "porcentaje_max_venta" INTEGER NOT NULL DEFAULT 50,
    "permitir_fraccionamiento" BOOLEAN NOT NULL DEFAULT true,
    "dias_minimo_goce" INTEGER NOT NULL DEFAULT 7,
    "permitir_acumulacion" BOOLEAN NOT NULL DEFAULT true,
    "max_periodos_acumulados" INTEGER NOT NULL DEFAULT 2,
    "dias_alerta_vencimiento" INTEGER NOT NULL DEFAULT 30,
    "dias_alerta_acumulacion" INTEGER NOT NULL DEFAULT 45,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_vacaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodos_vacacionales" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "numero_periodo" INTEGER NOT NULL,
    "fecha_inicio_periodo" DATE NOT NULL,
    "fecha_fin_periodo" DATE NOT NULL,
    "fecha_limite_goce" DATE NOT NULL,
    "dias_correspondientes" INTEGER NOT NULL,
    "dias_gozados" INTEGER NOT NULL DEFAULT 0,
    "dias_vendidos" INTEGER NOT NULL DEFAULT 0,
    "dias_pendientes" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoPeriodoVacacional" NOT NULL DEFAULT 'ACUMULANDO',
    "genera_triple" BOOLEAN NOT NULL DEFAULT false,
    "fecha_triple" TIMESTAMP(3),
    "monto_triple" DECIMAL(10,2),
    "pagado_triple" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodos_vacacionales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_vacaciones" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "periodo_vacacional_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "fecha_inicio_solicitada" DATE NOT NULL,
    "fecha_fin_solicitada" DATE NOT NULL,
    "dias_solicitados" INTEGER NOT NULL,
    "fecha_inicio_aprobada" DATE,
    "fecha_fin_aprobada" DATE,
    "dias_aprobados" INTEGER,
    "incluye_venta" BOOLEAN NOT NULL DEFAULT false,
    "dias_venta" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoSolicitudVacaciones" NOT NULL DEFAULT 'PENDIENTE_JEFE',
    "fecha_respuesta_jefe" TIMESTAMP(3),
    "aprobado_por_jefe_id" INTEGER,
    "observacion_jefe" VARCHAR(500),
    "motivo_modificacion" VARCHAR(500),
    "fecha_respuesta_rrhh" TIMESTAMP(3),
    "aprobado_por_rrhh_id" INTEGER,
    "observacion_rrhh" VARCHAR(500),
    "motivo_rechazo" VARCHAR(500),
    "rechazado_por_id" INTEGER,
    "motivo_cancelacion" VARCHAR(500),
    "cancelado_por_id" INTEGER,
    "fecha_cancelacion" TIMESTAMP(3),
    "observaciones" VARCHAR(500),
    "creado_por_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_vacaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_vacacionales" (
    "id" SERIAL NOT NULL,
    "periodo_vacacional_id" INTEGER NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "tipo" "TipoMovimientoVacacional" NOT NULL,
    "dias" INTEGER NOT NULL,
    "fecha_movimiento" DATE NOT NULL,
    "solicitud_id" INTEGER,
    "concepto" VARCHAR(200),
    "monto" DECIMAL(10,2),
    "usuario_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_vacacionales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas_onboarding" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" VARCHAR(500),
    "cargo_id" INTEGER,
    "area_id" INTEGER,
    "duracion_dias" INTEGER NOT NULL DEFAULT 90,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas_onboarding" (
    "id" SERIAL NOT NULL,
    "plantilla_id" INTEGER NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" VARCHAR(500),
    "instrucciones" TEXT,
    "fase" "FaseOnboarding" NOT NULL DEFAULT 'DIA_1',
    "responsable" "ResponsableOnboarding" NOT NULL DEFAULT 'RRHH',
    "dias_desde_ingreso" INTEGER NOT NULL DEFAULT 0,
    "duracion_horas" DECIMAL(4,1),
    "es_obligatoria" BOOLEAN NOT NULL DEFAULT true,
    "requiere_evidencia" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procesos_onboarding" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "plantilla_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin_esperada" TIMESTAMP(3) NOT NULL,
    "fecha_fin_real" TIMESTAMP(3),
    "estado" "EstadoProcesoOnboarding" NOT NULL DEFAULT 'PENDIENTE',
    "progreso_porcentaje" INTEGER NOT NULL DEFAULT 0,
    "responsable_rrhh_id" INTEGER,
    "mentor_id" INTEGER,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procesos_onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas_empleado_onboarding" (
    "id" SERIAL NOT NULL,
    "proceso_id" INTEGER NOT NULL,
    "tarea_onboarding_id" INTEGER NOT NULL,
    "estado" "EstadoTareaOnboarding" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_limite" TIMESTAMP(3) NOT NULL,
    "fecha_completada" TIMESTAMP(3),
    "completada_por_id" INTEGER,
    "evidencia_url" VARCHAR(500),
    "evidencia_nombre" VARCHAR(200),
    "observaciones" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_empleado_onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_tareo" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "tiempo_limite_minutos" INTEGER NOT NULL DEFAULT 60,
    "requiere_corrector" BOOLEAN NOT NULL DEFAULT true,
    "sesiones_por_dia" INTEGER NOT NULL DEFAULT 1,
    "sesiones_por_periodo" INTEGER,
    "dias_post_cierre" INTEGER NOT NULL DEFAULT 5,
    "hora_limite_diaria" VARCHAR(5),
    "requiere_aprobacion_extension" BOOLEAN NOT NULL DEFAULT true,
    "max_extensiones_periodo" INTEGER NOT NULL DEFAULT 3,
    "notificar_email" BOOLEAN NOT NULL DEFAULT true,
    "notificar_sistema" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_tareo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_tareo" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "periodo_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMP(3),
    "tiempo_limite_minutos" INTEGER NOT NULL,
    "estado" "EstadoSesionTareo" NOT NULL DEFAULT 'ACTIVA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ultimo_heartbeat" TIMESTAMP(3),

    CONSTRAINT "sesiones_tareo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_extension_tareo" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "periodo_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "sesion_tareo_id" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "tiempo_solicitado_min" INTEGER NOT NULL DEFAULT 30,
    "estado" "EstadoSolicitudExtension" NOT NULL DEFAULT 'PENDIENTE',
    "aprobado_por_id" INTEGER,
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_respuesta" TIMESTAMP(3),
    "comentario_respuesta" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_extension_tareo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_cese" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "contrato_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "tipo_cese_id" INTEGER,
    "motivo" TEXT,
    "archivo_url" VARCHAR(500),
    "archivo_nombre" VARCHAR(200),
    "fecha_efectiva" DATE NOT NULL,
    "estado" "EstadoSolicitudCese" NOT NULL DEFAULT 'PENDIENTE',
    "solicitado_por_id" INTEGER NOT NULL,
    "resuelto_por_id" INTEGER,
    "fecha_resolucion" TIMESTAMP(3),
    "observaciones_admin" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_cese_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_cese_archivos" (
    "id" SERIAL NOT NULL,
    "solicitud_cese_id" INTEGER NOT NULL,
    "archivo_url" VARCHAR(500) NOT NULL,
    "archivo_nombre" VARCHAR(200) NOT NULL,
    "archivo_tipo" VARCHAR(100),
    "archivo_tamano" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitudes_cese_archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_anulacion_contrato" (
    "id" SERIAL NOT NULL,
    "contrato_id" INTEGER NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "motivo" VARCHAR(2000) NOT NULL,
    "estado" "EstadoSolicitudAnulacionContrato" NOT NULL DEFAULT 'PENDIENTE',
    "solicitado_por_id" INTEGER NOT NULL,
    "resuelto_por_id" INTEGER,
    "fecha_resolucion" TIMESTAMP(3),
    "observaciones_admin" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_anulacion_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_anulacion_contrato_archivos" (
    "id" SERIAL NOT NULL,
    "solicitud_anulacion_id" INTEGER NOT NULL,
    "archivo_url" VARCHAR(500) NOT NULL,
    "archivo_nombre" VARCHAR(200) NOT NULL,
    "archivo_tipo" VARCHAR(100),
    "archivo_tamano" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitudes_anulacion_contrato_archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "ruc" VARCHAR(11),
    "contacto" VARCHAR(150),
    "telefono" VARCHAR(20),
    "email" VARCHAR(150),
    "direccion" VARCHAR(300),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_uniforme" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(300),
    "genero" "GeneroUniforme" NOT NULL DEFAULT 'UNISEX',
    "precio_referencial" DECIMAL(10,2),
    "cantidad_estandar" INTEGER NOT NULL DEFAULT 1,
    "codigo_prefijo" VARCHAR(10),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_uniforme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caracteristicas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(500),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caracteristicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas_uniforme" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "predeterminada" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_uniforme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas_uniforme_items" (
    "id" SERIAL NOT NULL,
    "plantilla_id" INTEGER NOT NULL,
    "tipo_uniforme_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "plantillas_uniforme_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tallas_tipo_uniforme" (
    "id" SERIAL NOT NULL,
    "tipo_uniforme_id" INTEGER NOT NULL,
    "valor" VARCHAR(20) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tallas_tipo_uniforme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingresos_inventario" (
    "id" SERIAL NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "requerimiento_id" INTEGER,
    "fecha_ingreso" DATE NOT NULL,
    "numero_documento" VARCHAR(50),
    "observaciones" VARCHAR(500),
    "numero_factura" VARCHAR(50),
    "fecha_factura" DATE,
    "monto_total" DECIMAL(12,2),
    "archivo_url" VARCHAR(500),
    "archivo_nombre" VARCHAR(200),
    "usuario_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingresos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_inventario" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "tipo_uniforme_id" INTEGER NOT NULL,
    "ingreso_id" INTEGER NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "entrega_id" INTEGER,
    "talla" VARCHAR(20) NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoItemInventario" NOT NULL DEFAULT 'DISPONIBLE',
    "condicion" "CondicionItemInventario" NOT NULL DEFAULT 'NUEVO',
    "empleado_id" INTEGER,
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas_uniforme" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "fecha_entrega" DATE NOT NULL,
    "entregado_por_id" INTEGER NOT NULL,
    "observaciones" VARCHAR(500),
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entregas_uniforme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "tipo_movimiento" "TipoMovimientoInventario" NOT NULL,
    "empleado_id" INTEGER,
    "motivo" VARCHAR(500),
    "usuario_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_descuento_uniforme" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "motivo" VARCHAR(500) NOT NULL,
    "estado" "EstadoSolicitudDescuentoUniforme" NOT NULL DEFAULT 'PENDIENTE',
    "monto_total" DECIMAL(10,2),
    "solicitado_por_id" INTEGER NOT NULL,
    "resuelto_por_id" INTEGER,
    "fecha_resolucion" TIMESTAMP(3),
    "observaciones_admin" VARCHAR(500),
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_descuento_uniforme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_descuento_uniforme_items" (
    "id" SERIAL NOT NULL,
    "solicitud_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "precio_referencia" DECIMAL(10,2) NOT NULL,
    "monto_descuento" DECIMAL(10,2),

    CONSTRAINT "solicitudes_descuento_uniforme_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_baja_item" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "motivo" VARCHAR(500) NOT NULL,
    "estado" "EstadoSolicitudBaja" NOT NULL DEFAULT 'PENDIENTE',
    "solicitado_por_id" INTEGER NOT NULL,
    "resuelto_por_id" INTEGER,
    "fecha_resolucion" TIMESTAMP(3),
    "observaciones_admin" VARCHAR(500),
    "empresa_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_baja_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados_tallas" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "tipo_uniforme_id" INTEGER NOT NULL,
    "talla" VARCHAR(20) NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empleados_tallas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requerimientos_uniforme" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "fecha" DATE NOT NULL,
    "estado" "EstadoRequerimientoUniforme" NOT NULL DEFAULT 'BORRADOR',
    "usuario_id" INTEGER NOT NULL,
    "proveedor_id" INTEGER,
    "empresa_id" INTEGER NOT NULL,
    "aprobado_por_id" INTEGER,
    "fecha_aprobacion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requerimientos_uniforme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requerimientos_uniforme_detalles" (
    "id" SERIAL NOT NULL,
    "requerimiento_id" INTEGER NOT NULL,
    "empleado_id" INTEGER,
    "tipo_uniforme_id" INTEGER NOT NULL,
    "talla" VARCHAR(20) NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "requerimientos_uniforme_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_cese" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(300),
    "empresa_id" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_cese_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_generados" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "codigo_reporte" VARCHAR(50) NOT NULL,
    "nombre_reporte" VARCHAR(150) NOT NULL,
    "categoria" VARCHAR(50) NOT NULL,
    "formato" "FormatoReporte" NOT NULL,
    "filtros" JSONB,
    "total_registros" INTEGER NOT NULL DEFAULT 0,
    "archivo_url" VARCHAR(500),
    "archivo_nombre" VARCHAR(200),
    "tiempo_generacion_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reportes_generados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinculos_laborales" (
    "id" SERIAL NOT NULL,
    "empleado_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "estado" "EstadoVinculo" NOT NULL DEFAULT 'ACTIVO',
    "motivo_cierre" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vinculos_laborales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CaracteristicaToTipoUniforme" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_revocados_token_hash_key" ON "tokens_revocados"("token_hash");

-- CreateIndex
CREATE INDEX "tokens_revocados_token_hash_idx" ON "tokens_revocados"("token_hash");

-- CreateIndex
CREATE INDEX "tokens_revocados_expires_at_idx" ON "tokens_revocados"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "archivos_key_key" ON "archivos"("key");

-- CreateIndex
CREATE INDEX "archivos_empresa_id_idx" ON "archivos"("empresa_id");

-- CreateIndex
CREATE INDEX "archivos_categoria_idx" ON "archivos"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_ruc_key" ON "empresas"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_empresa_id_key" ON "roles"("nombre", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_tabla_afectada_registro_id_created_at_idx" ON "auditoria"("tabla_afectada", "registro_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "auditoria_empresa_id_created_at_idx" ON "auditoria"("empresa_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "areas_nombre_empresa_id_key" ON "areas"("nombre", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_nombre_empresa_id_key" ON "cargos"("nombre", "empresa_id");

-- CreateIndex
CREATE INDEX "clientes_empresa_id_idx" ON "clientes"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_ruc_empresa_id_key" ON "clientes"("ruc", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "bancos_nombre_key" ON "bancos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "bancos_codigo_key" ON "bancos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "procedencias_nombre_empresa_id_key" ON "procedencias"("nombre", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "regimenes_pensionarios_nombre_key" ON "regimenes_pensionarios"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_marcacion_codigo_key" ON "tipos_marcacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "departamentos_nombre_key" ON "departamentos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "provincias_nombre_departamento_id_key" ON "provincias"("nombre", "departamento_id");

-- CreateIndex
CREATE UNIQUE INDEX "distritos_nombre_provincia_id_key" ON "distritos"("nombre", "provincia_id");

-- CreateIndex
CREATE INDEX "empleados_empresa_id_idx" ON "empleados"("empresa_id");

-- CreateIndex
CREATE INDEX "empleados_area_id_idx" ON "empleados"("area_id");

-- CreateIndex
CREATE INDEX "empleados_sede_id_idx" ON "empleados"("sede_id");

-- CreateIndex
CREATE INDEX "empleados_distrito_id_idx" ON "empleados"("distrito_id");

-- CreateIndex
CREATE INDEX "empleados_estado_idx" ON "empleados"("estado");

-- CreateIndex
CREATE INDEX "empleados_numero_documento_idx" ON "empleados"("numero_documento");

-- CreateIndex
CREATE INDEX "empleados_empresa_id_estado_idx" ON "empleados"("empresa_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_numero_documento_empresa_id_key" ON "empleados"("numero_documento", "empresa_id");

-- CreateIndex
CREATE INDEX "empleados_familiares_empleado_id_idx" ON "empleados_familiares"("empleado_id");

-- CreateIndex
CREATE INDEX "tipos_documento_empleado_empresa_id_idx" ON "tipos_documento_empleado"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_documento_empleado_codigo_empresa_id_key" ON "tipos_documento_empleado"("codigo", "empresa_id");

-- CreateIndex
CREATE INDEX "empleados_documentos_empleado_id_idx" ON "empleados_documentos"("empleado_id");

-- CreateIndex
CREATE INDEX "empleados_documentos_tipo_documento_empleado_id_idx" ON "empleados_documentos"("tipo_documento_empleado_id");

-- CreateIndex
CREATE INDEX "empleados_documentos_fecha_vencimiento_idx" ON "empleados_documentos"("fecha_vencimiento");

-- CreateIndex
CREATE INDEX "empleados_documentos_documento_origen_id_idx" ON "empleados_documentos"("documento_origen_id");

-- CreateIndex
CREATE INDEX "empleados_documentos_es_version_vigente_idx" ON "empleados_documentos"("es_version_vigente");

-- CreateIndex
CREATE INDEX "empleados_movimientos_empleado_id_idx" ON "empleados_movimientos"("empleado_id");

-- CreateIndex
CREATE INDEX "empleados_movimientos_fecha_movimiento_idx" ON "empleados_movimientos"("fecha_movimiento");

-- CreateIndex
CREATE INDEX "contratos_empleado_id_idx" ON "contratos"("empleado_id");

-- CreateIndex
CREATE INDEX "contratos_estado_idx" ON "contratos"("estado");

-- CreateIndex
CREATE INDEX "contratos_fecha_fin_idx" ON "contratos"("fecha_fin");

-- CreateIndex
CREATE INDEX "contratos_plantilla_id_idx" ON "contratos"("plantilla_id");

-- CreateIndex
CREATE INDEX "contratos_cliente_id_idx" ON "contratos"("cliente_id");

-- CreateIndex
CREATE INDEX "contratos_vinculo_laboral_id_idx" ON "contratos"("vinculo_laboral_id");

-- CreateIndex
CREATE INDEX "contratos_estado_fecha_fin_idx" ON "contratos"("estado", "fecha_fin");

-- CreateIndex
CREATE INDEX "parametros_legales_clave_idx" ON "parametros_legales"("clave");

-- CreateIndex
CREATE INDEX "parametros_legales_clave_vigencia_desde_idx" ON "parametros_legales"("clave", "vigencia_desde");

-- CreateIndex
CREATE UNIQUE INDEX "carnets_sucamec_numero_carnet_key" ON "carnets_sucamec"("numero_carnet");

-- CreateIndex
CREATE INDEX "carnets_sucamec_empleado_id_idx" ON "carnets_sucamec"("empleado_id");

-- CreateIndex
CREATE INDEX "carnets_sucamec_documento_id_idx" ON "carnets_sucamec"("documento_id");

-- CreateIndex
CREATE INDEX "carnets_sucamec_estado_idx" ON "carnets_sucamec"("estado");

-- CreateIndex
CREATE INDEX "carnets_sucamec_fecha_vencimiento_idx" ON "carnets_sucamec"("fecha_vencimiento");

-- CreateIndex
CREATE INDEX "carnets_sucamec_estado_fecha_vencimiento_idx" ON "carnets_sucamec"("estado", "fecha_vencimiento");

-- CreateIndex
CREATE INDEX "plantillas_contrato_empresa_id_idx" ON "plantillas_contrato"("empresa_id");

-- CreateIndex
CREATE INDEX "plantillas_contrato_tipo_contrato_idx" ON "plantillas_contrato"("tipo_contrato");

-- CreateIndex
CREATE INDEX "plantillas_contrato_activo_idx" ON "plantillas_contrato"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_contrato_nombre_empresa_id_key" ON "plantillas_contrato"("nombre", "empresa_id");

-- CreateIndex
CREATE INDEX "plantillas_documento_empresa_id_idx" ON "plantillas_documento"("empresa_id");

-- CreateIndex
CREATE INDEX "plantillas_documento_categoria_idx" ON "plantillas_documento"("categoria");

-- CreateIndex
CREATE INDEX "plantillas_documento_activo_idx" ON "plantillas_documento"("activo");

-- CreateIndex
CREATE INDEX "plantillas_documento_empresa_id_activo_categoria_orden_idx" ON "plantillas_documento"("empresa_id", "activo", "categoria", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_documento_codigo_empresa_id_key" ON "plantillas_documento"("codigo", "empresa_id");

-- CreateIndex
CREATE INDEX "documentos_generados_empleado_id_idx" ON "documentos_generados"("empleado_id");

-- CreateIndex
CREATE INDEX "documentos_generados_plantilla_documento_id_idx" ON "documentos_generados"("plantilla_documento_id");

-- CreateIndex
CREATE INDEX "documentos_generados_estado_idx" ON "documentos_generados"("estado");

-- CreateIndex
CREATE INDEX "documentos_generados_empleado_id_plantilla_documento_id_idx" ON "documentos_generados"("empleado_id", "plantilla_documento_id");

-- CreateIndex
CREATE INDEX "documentos_generados_generado_por_idx" ON "documentos_generados"("generado_por");

-- CreateIndex
CREATE INDEX "vacantes_empresa_id_estado_idx" ON "vacantes"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "vacantes_sede_id_idx" ON "vacantes"("sede_id");

-- CreateIndex
CREATE UNIQUE INDEX "vacantes_codigo_empresa_id_key" ON "vacantes"("codigo", "empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "postulantes_empleado_id_key" ON "postulantes"("empleado_id");

-- CreateIndex
CREATE INDEX "postulantes_empresa_id_estado_idx" ON "postulantes"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "postulantes_vacante_id_idx" ON "postulantes"("vacante_id");

-- CreateIndex
CREATE INDEX "postulantes_procedencia_id_idx" ON "postulantes"("procedencia_id");

-- CreateIndex
CREATE INDEX "postulantes_numero_documento_idx" ON "postulantes"("numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "postulantes_numero_documento_vacante_id_key" ON "postulantes"("numero_documento", "vacante_id");

-- CreateIndex
CREATE INDEX "tipos_evaluacion_empresa_id_idx" ON "tipos_evaluacion"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_evaluacion_codigo_empresa_id_key" ON "tipos_evaluacion"("codigo", "empresa_id");

-- CreateIndex
CREATE INDEX "postulante_evaluaciones_postulante_id_idx" ON "postulante_evaluaciones"("postulante_id");

-- CreateIndex
CREATE INDEX "postulante_evaluaciones_tipo_evaluacion_id_idx" ON "postulante_evaluaciones"("tipo_evaluacion_id");

-- CreateIndex
CREATE INDEX "postulante_documentos_postulante_id_idx" ON "postulante_documentos"("postulante_id");

-- CreateIndex
CREATE INDEX "postulante_documentos_tipo_documento_empleado_id_idx" ON "postulante_documentos"("tipo_documento_empleado_id");

-- CreateIndex
CREATE INDEX "postulante_documentos_fecha_vencimiento_idx" ON "postulante_documentos"("fecha_vencimiento");

-- CreateIndex
CREATE INDEX "postulante_documentos_documento_origen_id_idx" ON "postulante_documentos"("documento_origen_id");

-- CreateIndex
CREATE INDEX "postulante_documentos_es_version_vigente_idx" ON "postulante_documentos"("es_version_vigente");

-- CreateIndex
CREATE INDEX "sedes_cliente_id_idx" ON "sedes"("cliente_id");

-- CreateIndex
CREATE INDEX "sedes_empresa_id_idx" ON "sedes"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "sedes_nombre_cliente_id_empresa_id_key" ON "sedes"("nombre", "cliente_id", "empresa_id");

-- CreateIndex
CREATE INDEX "sede_contactos_sede_id_idx" ON "sede_contactos"("sede_id");

-- CreateIndex
CREATE INDEX "periodos_tareo_empresa_id_idx" ON "periodos_tareo"("empresa_id");

-- CreateIndex
CREATE INDEX "periodos_tareo_estado_idx" ON "periodos_tareo"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "periodos_tareo_empresa_id_anio_mes_key" ON "periodos_tareo"("empresa_id", "anio", "mes");

-- CreateIndex
CREATE INDEX "tareos_periodo_id_idx" ON "tareos"("periodo_id");

-- CreateIndex
CREATE INDEX "tareos_empleado_id_idx" ON "tareos"("empleado_id");

-- CreateIndex
CREATE INDEX "tareos_area_id_idx" ON "tareos"("area_id");

-- CreateIndex
CREATE INDEX "tareos_sede_id_idx" ON "tareos"("sede_id");

-- CreateIndex
CREATE UNIQUE INDEX "tareos_periodo_id_empleado_id_key" ON "tareos"("periodo_id", "empleado_id");

-- CreateIndex
CREATE INDEX "tareo_detalles_tareo_id_idx" ON "tareo_detalles"("tareo_id");

-- CreateIndex
CREATE INDEX "tareo_detalles_tipo_marcacion_id_idx" ON "tareo_detalles"("tipo_marcacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "tareo_detalles_tareo_id_dia_key" ON "tareo_detalles"("tareo_id", "dia");

-- CreateIndex
CREATE INDEX "tareo_detalle_audits_tareo_detalle_id_idx" ON "tareo_detalle_audits"("tareo_detalle_id");

-- CreateIndex
CREATE INDEX "tareo_detalle_audits_usuario_id_idx" ON "tareo_detalle_audits"("usuario_id");

-- CreateIndex
CREATE INDEX "tareo_detalle_audits_created_at_idx" ON "tareo_detalle_audits"("created_at");

-- CreateIndex
CREATE INDEX "tareo_justificaciones_tareo_id_idx" ON "tareo_justificaciones"("tareo_id");

-- CreateIndex
CREATE INDEX "tareo_justificaciones_empresa_id_idx" ON "tareo_justificaciones"("empresa_id");

-- CreateIndex
CREATE INDEX "tareo_justificaciones_created_by_idx" ON "tareo_justificaciones"("created_by");

-- CreateIndex
CREATE INDEX "tareo_justificaciones_solicitud_vacaciones_id_idx" ON "tareo_justificaciones"("solicitud_vacaciones_id");

-- CreateIndex
CREATE INDEX "tareo_justificacion_archivos_justificacion_id_idx" ON "tareo_justificacion_archivos"("justificacion_id");

-- CreateIndex
CREATE INDEX "planillas_empresa_id_idx" ON "planillas"("empresa_id");

-- CreateIndex
CREATE INDEX "planillas_estado_idx" ON "planillas"("estado");

-- CreateIndex
CREATE INDEX "planillas_empresa_id_anio_idx" ON "planillas"("empresa_id", "anio");

-- CreateIndex
CREATE INDEX "planillas_empresa_id_anio_estado_idx" ON "planillas"("empresa_id", "anio", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "planillas_empresa_id_anio_mes_key" ON "planillas"("empresa_id", "anio", "mes");

-- CreateIndex
CREATE INDEX "planilla_detalles_planilla_id_idx" ON "planilla_detalles"("planilla_id");

-- CreateIndex
CREATE INDEX "planilla_detalles_empleado_id_idx" ON "planilla_detalles"("empleado_id");

-- CreateIndex
CREATE UNIQUE INDEX "planilla_detalles_planilla_id_empleado_id_key" ON "planilla_detalles"("planilla_id", "empleado_id");

-- CreateIndex
CREATE UNIQUE INDEX "boletas_planilla_detalle_id_key" ON "boletas"("planilla_detalle_id");

-- CreateIndex
CREATE INDEX "boletas_empresa_id_idx" ON "boletas"("empresa_id");

-- CreateIndex
CREATE INDEX "boletas_empleado_id_idx" ON "boletas"("empleado_id");

-- CreateIndex
CREATE INDEX "boletas_anio_mes_idx" ON "boletas"("anio", "mes");

-- CreateIndex
CREATE INDEX "boletas_estado_idx" ON "boletas"("estado");

-- CreateIndex
CREATE INDEX "photocheck_logs_empleado_id_idx" ON "photocheck_logs"("empleado_id");

-- CreateIndex
CREATE INDEX "photocheck_logs_generado_por_idx" ON "photocheck_logs"("generado_por");

-- CreateIndex
CREATE INDEX "photocheck_logs_fecha_generacion_idx" ON "photocheck_logs"("fecha_generacion");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_vacaciones_empresa_id_key" ON "configuracion_vacaciones"("empresa_id");

-- CreateIndex
CREATE INDEX "periodos_vacacionales_empleado_id_idx" ON "periodos_vacacionales"("empleado_id");

-- CreateIndex
CREATE INDEX "periodos_vacacionales_empresa_id_idx" ON "periodos_vacacionales"("empresa_id");

-- CreateIndex
CREATE INDEX "periodos_vacacionales_estado_idx" ON "periodos_vacacionales"("estado");

-- CreateIndex
CREATE INDEX "periodos_vacacionales_fecha_limite_goce_idx" ON "periodos_vacacionales"("fecha_limite_goce");

-- CreateIndex
CREATE UNIQUE INDEX "periodos_vacacionales_empleado_id_numero_periodo_key" ON "periodos_vacacionales"("empleado_id", "numero_periodo");

-- CreateIndex
CREATE INDEX "solicitudes_vacaciones_empleado_id_idx" ON "solicitudes_vacaciones"("empleado_id");

-- CreateIndex
CREATE INDEX "solicitudes_vacaciones_periodo_vacacional_id_idx" ON "solicitudes_vacaciones"("periodo_vacacional_id");

-- CreateIndex
CREATE INDEX "solicitudes_vacaciones_empresa_id_idx" ON "solicitudes_vacaciones"("empresa_id");

-- CreateIndex
CREATE INDEX "solicitudes_vacaciones_estado_idx" ON "solicitudes_vacaciones"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_vacaciones_fecha_inicio_aprobada_idx" ON "solicitudes_vacaciones"("fecha_inicio_aprobada");

-- CreateIndex
CREATE INDEX "movimientos_vacacionales_periodo_vacacional_id_idx" ON "movimientos_vacacionales"("periodo_vacacional_id");

-- CreateIndex
CREATE INDEX "movimientos_vacacionales_empleado_id_idx" ON "movimientos_vacacionales"("empleado_id");

-- CreateIndex
CREATE INDEX "movimientos_vacacionales_empresa_id_idx" ON "movimientos_vacacionales"("empresa_id");

-- CreateIndex
CREATE INDEX "movimientos_vacacionales_tipo_idx" ON "movimientos_vacacionales"("tipo");

-- CreateIndex
CREATE INDEX "movimientos_vacacionales_fecha_movimiento_idx" ON "movimientos_vacacionales"("fecha_movimiento");

-- CreateIndex
CREATE INDEX "plantillas_onboarding_empresa_id_idx" ON "plantillas_onboarding"("empresa_id");

-- CreateIndex
CREATE INDEX "plantillas_onboarding_cargo_id_idx" ON "plantillas_onboarding"("cargo_id");

-- CreateIndex
CREATE INDEX "plantillas_onboarding_area_id_idx" ON "plantillas_onboarding"("area_id");

-- CreateIndex
CREATE INDEX "plantillas_onboarding_activo_idx" ON "plantillas_onboarding"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_onboarding_codigo_empresa_id_key" ON "plantillas_onboarding"("codigo", "empresa_id");

-- CreateIndex
CREATE INDEX "tareas_onboarding_plantilla_id_idx" ON "tareas_onboarding"("plantilla_id");

-- CreateIndex
CREATE INDEX "tareas_onboarding_fase_idx" ON "tareas_onboarding"("fase");

-- CreateIndex
CREATE INDEX "tareas_onboarding_responsable_idx" ON "tareas_onboarding"("responsable");

-- CreateIndex
CREATE INDEX "tareas_onboarding_orden_idx" ON "tareas_onboarding"("orden");

-- CreateIndex
CREATE INDEX "procesos_onboarding_empleado_id_idx" ON "procesos_onboarding"("empleado_id");

-- CreateIndex
CREATE INDEX "procesos_onboarding_plantilla_id_idx" ON "procesos_onboarding"("plantilla_id");

-- CreateIndex
CREATE INDEX "procesos_onboarding_empresa_id_idx" ON "procesos_onboarding"("empresa_id");

-- CreateIndex
CREATE INDEX "procesos_onboarding_estado_idx" ON "procesos_onboarding"("estado");

-- CreateIndex
CREATE INDEX "procesos_onboarding_fecha_fin_esperada_idx" ON "procesos_onboarding"("fecha_fin_esperada");

-- CreateIndex
CREATE INDEX "tareas_empleado_onboarding_proceso_id_idx" ON "tareas_empleado_onboarding"("proceso_id");

-- CreateIndex
CREATE INDEX "tareas_empleado_onboarding_tarea_onboarding_id_idx" ON "tareas_empleado_onboarding"("tarea_onboarding_id");

-- CreateIndex
CREATE INDEX "tareas_empleado_onboarding_estado_idx" ON "tareas_empleado_onboarding"("estado");

-- CreateIndex
CREATE INDEX "tareas_empleado_onboarding_fecha_limite_idx" ON "tareas_empleado_onboarding"("fecha_limite");

-- CreateIndex
CREATE UNIQUE INDEX "tareas_empleado_onboarding_proceso_id_tarea_onboarding_id_key" ON "tareas_empleado_onboarding"("proceso_id", "tarea_onboarding_id");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_tareo_empresa_id_key" ON "configuracion_tareo"("empresa_id");

-- CreateIndex
CREATE INDEX "sesiones_tareo_empresa_id_idx" ON "sesiones_tareo"("empresa_id");

-- CreateIndex
CREATE INDEX "sesiones_tareo_periodo_id_idx" ON "sesiones_tareo"("periodo_id");

-- CreateIndex
CREATE INDEX "sesiones_tareo_usuario_id_idx" ON "sesiones_tareo"("usuario_id");

-- CreateIndex
CREATE INDEX "sesiones_tareo_estado_idx" ON "sesiones_tareo"("estado");

-- CreateIndex
CREATE INDEX "sesiones_tareo_fecha_idx" ON "sesiones_tareo"("fecha");

-- CreateIndex
CREATE INDEX "sesiones_tareo_ultimo_heartbeat_idx" ON "sesiones_tareo"("ultimo_heartbeat");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_extension_tareo_sesion_tareo_id_key" ON "solicitudes_extension_tareo"("sesion_tareo_id");

-- CreateIndex
CREATE INDEX "solicitudes_extension_tareo_empresa_id_idx" ON "solicitudes_extension_tareo"("empresa_id");

-- CreateIndex
CREATE INDEX "solicitudes_extension_tareo_periodo_id_idx" ON "solicitudes_extension_tareo"("periodo_id");

-- CreateIndex
CREATE INDEX "solicitudes_extension_tareo_usuario_id_idx" ON "solicitudes_extension_tareo"("usuario_id");

-- CreateIndex
CREATE INDEX "solicitudes_extension_tareo_estado_idx" ON "solicitudes_extension_tareo"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_cese_empresa_id_idx" ON "solicitudes_cese"("empresa_id");

-- CreateIndex
CREATE INDEX "solicitudes_cese_empleado_id_idx" ON "solicitudes_cese"("empleado_id");

-- CreateIndex
CREATE INDEX "solicitudes_cese_estado_idx" ON "solicitudes_cese"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_cese_contrato_id_idx" ON "solicitudes_cese"("contrato_id");

-- CreateIndex
CREATE INDEX "solicitudes_cese_empresa_id_estado_idx" ON "solicitudes_cese"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "solicitudes_cese_archivos_solicitud_cese_id_idx" ON "solicitudes_cese_archivos"("solicitud_cese_id");

-- CreateIndex
CREATE INDEX "solicitudes_anulacion_contrato_empresa_id_idx" ON "solicitudes_anulacion_contrato"("empresa_id");

-- CreateIndex
CREATE INDEX "solicitudes_anulacion_contrato_empleado_id_idx" ON "solicitudes_anulacion_contrato"("empleado_id");

-- CreateIndex
CREATE INDEX "solicitudes_anulacion_contrato_contrato_id_idx" ON "solicitudes_anulacion_contrato"("contrato_id");

-- CreateIndex
CREATE INDEX "solicitudes_anulacion_contrato_estado_idx" ON "solicitudes_anulacion_contrato"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_anulacion_contrato_empresa_id_estado_idx" ON "solicitudes_anulacion_contrato"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "solicitudes_anulacion_contrato_archivos_solicitud_anulacion_idx" ON "solicitudes_anulacion_contrato_archivos"("solicitud_anulacion_id");

-- CreateIndex
CREATE INDEX "proveedores_empresa_id_idx" ON "proveedores"("empresa_id");

-- CreateIndex
CREATE INDEX "tipos_uniforme_empresa_id_idx" ON "tipos_uniforme"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_uniforme_nombre_empresa_id_key" ON "tipos_uniforme"("nombre", "empresa_id");

-- CreateIndex
CREATE INDEX "caracteristicas_empresa_id_idx" ON "caracteristicas"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "caracteristicas_nombre_empresa_id_key" ON "caracteristicas"("nombre", "empresa_id");

-- CreateIndex
CREATE INDEX "plantillas_uniforme_empresa_id_idx" ON "plantillas_uniforme"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_uniforme_nombre_empresa_id_key" ON "plantillas_uniforme"("nombre", "empresa_id");

-- CreateIndex
CREATE INDEX "plantillas_uniforme_items_plantilla_id_idx" ON "plantillas_uniforme_items"("plantilla_id");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_uniforme_items_plantilla_id_tipo_uniforme_id_key" ON "plantillas_uniforme_items"("plantilla_id", "tipo_uniforme_id");

-- CreateIndex
CREATE INDEX "tallas_tipo_uniforme_tipo_uniforme_id_idx" ON "tallas_tipo_uniforme"("tipo_uniforme_id");

-- CreateIndex
CREATE UNIQUE INDEX "tallas_tipo_uniforme_tipo_uniforme_id_valor_key" ON "tallas_tipo_uniforme"("tipo_uniforme_id", "valor");

-- CreateIndex
CREATE INDEX "ingresos_inventario_empresa_id_idx" ON "ingresos_inventario"("empresa_id");

-- CreateIndex
CREATE INDEX "ingresos_inventario_proveedor_id_idx" ON "ingresos_inventario"("proveedor_id");

-- CreateIndex
CREATE INDEX "ingresos_inventario_requerimiento_id_idx" ON "ingresos_inventario"("requerimiento_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingresos_inventario_empresa_id_proveedor_id_numero_factura_key" ON "ingresos_inventario"("empresa_id", "proveedor_id", "numero_factura");

-- CreateIndex
CREATE INDEX "items_inventario_empresa_id_idx" ON "items_inventario"("empresa_id");

-- CreateIndex
CREATE INDEX "items_inventario_tipo_uniforme_id_idx" ON "items_inventario"("tipo_uniforme_id");

-- CreateIndex
CREATE INDEX "items_inventario_estado_idx" ON "items_inventario"("estado");

-- CreateIndex
CREATE INDEX "items_inventario_empleado_id_idx" ON "items_inventario"("empleado_id");

-- CreateIndex
CREATE INDEX "items_inventario_entrega_id_idx" ON "items_inventario"("entrega_id");

-- CreateIndex
CREATE INDEX "items_inventario_empresa_id_estado_idx" ON "items_inventario"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "items_inventario_empresa_id_codigo_idx" ON "items_inventario"("empresa_id", "codigo");

-- CreateIndex
CREATE INDEX "items_inventario_empresa_id_estado_tipo_uniforme_id_talla_idx" ON "items_inventario"("empresa_id", "estado", "tipo_uniforme_id", "talla");

-- CreateIndex
CREATE UNIQUE INDEX "items_inventario_codigo_empresa_id_key" ON "items_inventario"("codigo", "empresa_id");

-- CreateIndex
CREATE INDEX "entregas_uniforme_empresa_id_idx" ON "entregas_uniforme"("empresa_id");

-- CreateIndex
CREATE INDEX "entregas_uniforme_empleado_id_idx" ON "entregas_uniforme"("empleado_id");

-- CreateIndex
CREATE INDEX "movimientos_inventario_item_id_idx" ON "movimientos_inventario"("item_id");

-- CreateIndex
CREATE INDEX "movimientos_inventario_empresa_id_idx" ON "movimientos_inventario"("empresa_id");

-- CreateIndex
CREATE INDEX "movimientos_inventario_empresa_id_fecha_idx" ON "movimientos_inventario"("empresa_id", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_inventario_empresa_id_tipo_movimiento_idx" ON "movimientos_inventario"("empresa_id", "tipo_movimiento");

-- CreateIndex
CREATE INDEX "movimientos_inventario_empleado_id_idx" ON "movimientos_inventario"("empleado_id");

-- CreateIndex
CREATE INDEX "solicitudes_descuento_uniforme_empresa_id_idx" ON "solicitudes_descuento_uniforme"("empresa_id");

-- CreateIndex
CREATE INDEX "solicitudes_descuento_uniforme_empleado_id_idx" ON "solicitudes_descuento_uniforme"("empleado_id");

-- CreateIndex
CREATE INDEX "solicitudes_descuento_uniforme_estado_idx" ON "solicitudes_descuento_uniforme"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_descuento_uniforme_empresa_id_estado_idx" ON "solicitudes_descuento_uniforme"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "solicitudes_descuento_uniforme_items_solicitud_id_idx" ON "solicitudes_descuento_uniforme_items"("solicitud_id");

-- CreateIndex
CREATE INDEX "solicitudes_descuento_uniforme_items_item_id_idx" ON "solicitudes_descuento_uniforme_items"("item_id");

-- CreateIndex
CREATE INDEX "solicitudes_baja_item_empresa_id_idx" ON "solicitudes_baja_item"("empresa_id");

-- CreateIndex
CREATE INDEX "solicitudes_baja_item_item_id_idx" ON "solicitudes_baja_item"("item_id");

-- CreateIndex
CREATE INDEX "solicitudes_baja_item_estado_idx" ON "solicitudes_baja_item"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_baja_item_empresa_id_estado_idx" ON "solicitudes_baja_item"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "empleados_tallas_empresa_id_idx" ON "empleados_tallas"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_tallas_empleado_id_tipo_uniforme_id_empresa_id_key" ON "empleados_tallas"("empleado_id", "tipo_uniforme_id", "empresa_id");

-- CreateIndex
CREATE INDEX "requerimientos_uniforme_empresa_id_idx" ON "requerimientos_uniforme"("empresa_id");

-- CreateIndex
CREATE INDEX "requerimientos_uniforme_proveedor_id_idx" ON "requerimientos_uniforme"("proveedor_id");

-- CreateIndex
CREATE INDEX "requerimientos_uniforme_detalles_requerimiento_id_idx" ON "requerimientos_uniforme_detalles"("requerimiento_id");

-- CreateIndex
CREATE INDEX "requerimientos_uniforme_detalles_empleado_id_idx" ON "requerimientos_uniforme_detalles"("empleado_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_cese_nombre_empresa_id_key" ON "tipos_cese"("nombre", "empresa_id");

-- CreateIndex
CREATE INDEX "reportes_generados_empresa_id_created_at_idx" ON "reportes_generados"("empresa_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reportes_generados_empresa_id_codigo_reporte_idx" ON "reportes_generados"("empresa_id", "codigo_reporte");

-- CreateIndex
CREATE INDEX "reportes_generados_usuario_id_idx" ON "reportes_generados"("usuario_id");

-- CreateIndex
CREATE INDEX "vinculos_laborales_empleado_id_idx" ON "vinculos_laborales"("empleado_id");

-- CreateIndex
CREATE INDEX "vinculos_laborales_empresa_id_idx" ON "vinculos_laborales"("empresa_id");

-- CreateIndex
CREATE INDEX "vinculos_laborales_empleado_id_estado_idx" ON "vinculos_laborales"("empleado_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "_CaracteristicaToTipoUniforme_AB_unique" ON "_CaracteristicaToTipoUniforme"("A", "B");

-- CreateIndex
CREATE INDEX "_CaracteristicaToTipoUniforme_B_index" ON "_CaracteristicaToTipoUniforme"("B");

-- AddForeignKey
ALTER TABLE "tokens_revocados" ADD CONSTRAINT "tokens_revocados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedencias" ADD CONSTRAINT "procedencias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provincias" ADD CONSTRAINT "provincias_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "departamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distritos" ADD CONSTRAINT "distritos_provincia_id_fkey" FOREIGN KEY ("provincia_id") REFERENCES "provincias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_banco_cts_id_fkey" FOREIGN KEY ("banco_cts_id") REFERENCES "bancos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_banco_haberes_id_fkey" FOREIGN KEY ("banco_haberes_id") REFERENCES "bancos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_distrito_id_fkey" FOREIGN KEY ("distrito_id") REFERENCES "distritos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_regimen_pensionario_id_fkey" FOREIGN KEY ("regimen_pensionario_id") REFERENCES "regimenes_pensionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_familiares" ADD CONSTRAINT "empleados_familiares_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_documento_empleado" ADD CONSTRAINT "tipos_documento_empleado_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_documentos" ADD CONSTRAINT "empleados_documentos_documento_origen_id_fkey" FOREIGN KEY ("documento_origen_id") REFERENCES "empleados_documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_documentos" ADD CONSTRAINT "empleados_documentos_eliminado_por_id_fkey" FOREIGN KEY ("eliminado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_documentos" ADD CONSTRAINT "empleados_documentos_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_documentos" ADD CONSTRAINT "empleados_documentos_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_documentos" ADD CONSTRAINT "empleados_documentos_tipo_documento_empleado_id_fkey" FOREIGN KEY ("tipo_documento_empleado_id") REFERENCES "tipos_documento_empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_movimientos" ADD CONSTRAINT "empleados_movimientos_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_movimientos" ADD CONSTRAINT "empleados_movimientos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "plantillas_contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_vinculo_laboral_id_fkey" FOREIGN KEY ("vinculo_laboral_id") REFERENCES "vinculos_laborales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carnets_sucamec" ADD CONSTRAINT "carnets_sucamec_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "empleados_documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carnets_sucamec" ADD CONSTRAINT "carnets_sucamec_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carnets_sucamec" ADD CONSTRAINT "carnets_sucamec_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_contrato" ADD CONSTRAINT "plantillas_contrato_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_documento" ADD CONSTRAINT "plantillas_documento_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_generados" ADD CONSTRAINT "documentos_generados_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_generados" ADD CONSTRAINT "documentos_generados_plantilla_documento_id_fkey" FOREIGN KEY ("plantilla_documento_id") REFERENCES "plantillas_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacantes" ADD CONSTRAINT "vacantes_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacantes" ADD CONSTRAINT "vacantes_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacantes" ADD CONSTRAINT "vacantes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacantes" ADD CONSTRAINT "vacantes_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulantes" ADD CONSTRAINT "postulantes_distrito_id_fkey" FOREIGN KEY ("distrito_id") REFERENCES "distritos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulantes" ADD CONSTRAINT "postulantes_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulantes" ADD CONSTRAINT "postulantes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulantes" ADD CONSTRAINT "postulantes_procedencia_id_fkey" FOREIGN KEY ("procedencia_id") REFERENCES "procedencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulantes" ADD CONSTRAINT "postulantes_vacante_id_fkey" FOREIGN KEY ("vacante_id") REFERENCES "vacantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_evaluacion" ADD CONSTRAINT "tipos_evaluacion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulante_evaluaciones" ADD CONSTRAINT "postulante_evaluaciones_evaluador_id_fkey" FOREIGN KEY ("evaluador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulante_evaluaciones" ADD CONSTRAINT "postulante_evaluaciones_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "postulantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulante_evaluaciones" ADD CONSTRAINT "postulante_evaluaciones_tipo_evaluacion_id_fkey" FOREIGN KEY ("tipo_evaluacion_id") REFERENCES "tipos_evaluacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulante_documentos" ADD CONSTRAINT "postulante_documentos_documento_origen_id_fkey" FOREIGN KEY ("documento_origen_id") REFERENCES "postulante_documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulante_documentos" ADD CONSTRAINT "postulante_documentos_eliminado_por_id_fkey" FOREIGN KEY ("eliminado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulante_documentos" ADD CONSTRAINT "postulante_documentos_postulante_id_fkey" FOREIGN KEY ("postulante_id") REFERENCES "postulantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulante_documentos" ADD CONSTRAINT "postulante_documentos_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulante_documentos" ADD CONSTRAINT "postulante_documentos_tipo_documento_empleado_id_fkey" FOREIGN KEY ("tipo_documento_empleado_id") REFERENCES "tipos_documento_empleado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sedes" ADD CONSTRAINT "sedes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sedes" ADD CONSTRAINT "sedes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sede_contactos" ADD CONSTRAINT "sede_contactos_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_tareo" ADD CONSTRAINT "periodos_tareo_cerrado_por_fkey" FOREIGN KEY ("cerrado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_tareo" ADD CONSTRAINT "periodos_tareo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareos" ADD CONSTRAINT "tareos_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareos" ADD CONSTRAINT "tareos_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareos" ADD CONSTRAINT "tareos_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareos" ADD CONSTRAINT "tareos_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos_tareo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareos" ADD CONSTRAINT "tareos_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareo_detalles" ADD CONSTRAINT "tareo_detalles_tareo_id_fkey" FOREIGN KEY ("tareo_id") REFERENCES "tareos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareo_detalles" ADD CONSTRAINT "tareo_detalles_tipo_marcacion_id_fkey" FOREIGN KEY ("tipo_marcacion_id") REFERENCES "tipos_marcacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareo_detalle_audits" ADD CONSTRAINT "tareo_detalle_audits_tareo_detalle_id_fkey" FOREIGN KEY ("tareo_detalle_id") REFERENCES "tareo_detalles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareo_detalle_audits" ADD CONSTRAINT "tareo_detalle_audits_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareo_justificaciones" ADD CONSTRAINT "tareo_justificaciones_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareo_justificaciones" ADD CONSTRAINT "tareo_justificaciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareo_justificaciones" ADD CONSTRAINT "tareo_justificaciones_solicitud_vacaciones_id_fkey" FOREIGN KEY ("solicitud_vacaciones_id") REFERENCES "solicitudes_vacaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareo_justificaciones" ADD CONSTRAINT "tareo_justificaciones_tareo_id_fkey" FOREIGN KEY ("tareo_id") REFERENCES "tareos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareo_justificacion_archivos" ADD CONSTRAINT "tareo_justificacion_archivos_justificacion_id_fkey" FOREIGN KEY ("justificacion_id") REFERENCES "tareo_justificaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas" ADD CONSTRAINT "planillas_aprobado_por_fkey" FOREIGN KEY ("aprobado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas" ADD CONSTRAINT "planillas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas" ADD CONSTRAINT "planillas_periodo_tareo_id_fkey" FOREIGN KEY ("periodo_tareo_id") REFERENCES "periodos_tareo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planilla_detalles" ADD CONSTRAINT "planilla_detalles_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planilla_detalles" ADD CONSTRAINT "planilla_detalles_planilla_id_fkey" FOREIGN KEY ("planilla_id") REFERENCES "planillas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_generado_por_fkey" FOREIGN KEY ("generado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_planilla_detalle_id_fkey" FOREIGN KEY ("planilla_detalle_id") REFERENCES "planilla_detalles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photocheck_logs" ADD CONSTRAINT "photocheck_logs_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photocheck_logs" ADD CONSTRAINT "photocheck_logs_generado_por_fkey" FOREIGN KEY ("generado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_vacaciones" ADD CONSTRAINT "configuracion_vacaciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_vacacionales" ADD CONSTRAINT "periodos_vacacionales_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos_vacacionales" ADD CONSTRAINT "periodos_vacacionales_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_vacaciones" ADD CONSTRAINT "solicitudes_vacaciones_aprobado_por_jefe_id_fkey" FOREIGN KEY ("aprobado_por_jefe_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_vacaciones" ADD CONSTRAINT "solicitudes_vacaciones_aprobado_por_rrhh_id_fkey" FOREIGN KEY ("aprobado_por_rrhh_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_vacaciones" ADD CONSTRAINT "solicitudes_vacaciones_cancelado_por_id_fkey" FOREIGN KEY ("cancelado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_vacaciones" ADD CONSTRAINT "solicitudes_vacaciones_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_vacaciones" ADD CONSTRAINT "solicitudes_vacaciones_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_vacaciones" ADD CONSTRAINT "solicitudes_vacaciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_vacaciones" ADD CONSTRAINT "solicitudes_vacaciones_periodo_vacacional_id_fkey" FOREIGN KEY ("periodo_vacacional_id") REFERENCES "periodos_vacacionales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_vacaciones" ADD CONSTRAINT "solicitudes_vacaciones_rechazado_por_id_fkey" FOREIGN KEY ("rechazado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_vacacionales" ADD CONSTRAINT "movimientos_vacacionales_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_vacacionales" ADD CONSTRAINT "movimientos_vacacionales_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_vacacionales" ADD CONSTRAINT "movimientos_vacacionales_periodo_vacacional_id_fkey" FOREIGN KEY ("periodo_vacacional_id") REFERENCES "periodos_vacacionales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_vacacionales" ADD CONSTRAINT "movimientos_vacacionales_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_vacaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_vacacionales" ADD CONSTRAINT "movimientos_vacacionales_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_onboarding" ADD CONSTRAINT "plantillas_onboarding_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_onboarding" ADD CONSTRAINT "plantillas_onboarding_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_onboarding" ADD CONSTRAINT "plantillas_onboarding_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_onboarding" ADD CONSTRAINT "tareas_onboarding_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "plantillas_onboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procesos_onboarding" ADD CONSTRAINT "procesos_onboarding_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procesos_onboarding" ADD CONSTRAINT "procesos_onboarding_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procesos_onboarding" ADD CONSTRAINT "procesos_onboarding_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procesos_onboarding" ADD CONSTRAINT "procesos_onboarding_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "plantillas_onboarding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procesos_onboarding" ADD CONSTRAINT "procesos_onboarding_responsable_rrhh_id_fkey" FOREIGN KEY ("responsable_rrhh_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_empleado_onboarding" ADD CONSTRAINT "tareas_empleado_onboarding_completada_por_id_fkey" FOREIGN KEY ("completada_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_empleado_onboarding" ADD CONSTRAINT "tareas_empleado_onboarding_proceso_id_fkey" FOREIGN KEY ("proceso_id") REFERENCES "procesos_onboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_empleado_onboarding" ADD CONSTRAINT "tareas_empleado_onboarding_tarea_onboarding_id_fkey" FOREIGN KEY ("tarea_onboarding_id") REFERENCES "tareas_onboarding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_tareo" ADD CONSTRAINT "configuracion_tareo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_tareo" ADD CONSTRAINT "sesiones_tareo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_tareo" ADD CONSTRAINT "sesiones_tareo_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos_tareo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_tareo" ADD CONSTRAINT "sesiones_tareo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_extension_tareo" ADD CONSTRAINT "solicitudes_extension_tareo_aprobado_por_id_fkey" FOREIGN KEY ("aprobado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_extension_tareo" ADD CONSTRAINT "solicitudes_extension_tareo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_extension_tareo" ADD CONSTRAINT "solicitudes_extension_tareo_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos_tareo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_extension_tareo" ADD CONSTRAINT "solicitudes_extension_tareo_sesion_tareo_id_fkey" FOREIGN KEY ("sesion_tareo_id") REFERENCES "sesiones_tareo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_extension_tareo" ADD CONSTRAINT "solicitudes_extension_tareo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_cese" ADD CONSTRAINT "solicitudes_cese_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_cese" ADD CONSTRAINT "solicitudes_cese_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_cese" ADD CONSTRAINT "solicitudes_cese_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_cese" ADD CONSTRAINT "solicitudes_cese_resuelto_por_id_fkey" FOREIGN KEY ("resuelto_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_cese" ADD CONSTRAINT "solicitudes_cese_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_cese" ADD CONSTRAINT "solicitudes_cese_tipo_cese_id_fkey" FOREIGN KEY ("tipo_cese_id") REFERENCES "tipos_cese"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_cese_archivos" ADD CONSTRAINT "solicitudes_cese_archivos_solicitud_cese_id_fkey" FOREIGN KEY ("solicitud_cese_id") REFERENCES "solicitudes_cese"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_anulacion_contrato" ADD CONSTRAINT "solicitudes_anulacion_contrato_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_anulacion_contrato" ADD CONSTRAINT "solicitudes_anulacion_contrato_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_anulacion_contrato" ADD CONSTRAINT "solicitudes_anulacion_contrato_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_anulacion_contrato" ADD CONSTRAINT "solicitudes_anulacion_contrato_resuelto_por_id_fkey" FOREIGN KEY ("resuelto_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_anulacion_contrato" ADD CONSTRAINT "solicitudes_anulacion_contrato_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_anulacion_contrato_archivos" ADD CONSTRAINT "solicitudes_anulacion_contrato_archivos_solicitud_anulacio_fkey" FOREIGN KEY ("solicitud_anulacion_id") REFERENCES "solicitudes_anulacion_contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_uniforme" ADD CONSTRAINT "tipos_uniforme_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caracteristicas" ADD CONSTRAINT "caracteristicas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_uniforme" ADD CONSTRAINT "plantillas_uniforme_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_uniforme_items" ADD CONSTRAINT "plantillas_uniforme_items_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "plantillas_uniforme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_uniforme_items" ADD CONSTRAINT "plantillas_uniforme_items_tipo_uniforme_id_fkey" FOREIGN KEY ("tipo_uniforme_id") REFERENCES "tipos_uniforme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tallas_tipo_uniforme" ADD CONSTRAINT "tallas_tipo_uniforme_tipo_uniforme_id_fkey" FOREIGN KEY ("tipo_uniforme_id") REFERENCES "tipos_uniforme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingresos_inventario" ADD CONSTRAINT "ingresos_inventario_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingresos_inventario" ADD CONSTRAINT "ingresos_inventario_requerimiento_id_fkey" FOREIGN KEY ("requerimiento_id") REFERENCES "requerimientos_uniforme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingresos_inventario" ADD CONSTRAINT "ingresos_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingresos_inventario" ADD CONSTRAINT "ingresos_inventario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_inventario" ADD CONSTRAINT "items_inventario_tipo_uniforme_id_fkey" FOREIGN KEY ("tipo_uniforme_id") REFERENCES "tipos_uniforme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_inventario" ADD CONSTRAINT "items_inventario_ingreso_id_fkey" FOREIGN KEY ("ingreso_id") REFERENCES "ingresos_inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_inventario" ADD CONSTRAINT "items_inventario_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_inventario" ADD CONSTRAINT "items_inventario_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas_uniforme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_inventario" ADD CONSTRAINT "items_inventario_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_inventario" ADD CONSTRAINT "items_inventario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_uniforme" ADD CONSTRAINT "entregas_uniforme_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_uniforme" ADD CONSTRAINT "entregas_uniforme_entregado_por_id_fkey" FOREIGN KEY ("entregado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas_uniforme" ADD CONSTRAINT "entregas_uniforme_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items_inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_descuento_uniforme" ADD CONSTRAINT "solicitudes_descuento_uniforme_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_descuento_uniforme" ADD CONSTRAINT "solicitudes_descuento_uniforme_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_descuento_uniforme" ADD CONSTRAINT "solicitudes_descuento_uniforme_resuelto_por_id_fkey" FOREIGN KEY ("resuelto_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_descuento_uniforme" ADD CONSTRAINT "solicitudes_descuento_uniforme_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_descuento_uniforme_items" ADD CONSTRAINT "solicitudes_descuento_uniforme_items_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_descuento_uniforme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_descuento_uniforme_items" ADD CONSTRAINT "solicitudes_descuento_uniforme_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items_inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_baja_item" ADD CONSTRAINT "solicitudes_baja_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items_inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_baja_item" ADD CONSTRAINT "solicitudes_baja_item_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_baja_item" ADD CONSTRAINT "solicitudes_baja_item_resuelto_por_id_fkey" FOREIGN KEY ("resuelto_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_baja_item" ADD CONSTRAINT "solicitudes_baja_item_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_tallas" ADD CONSTRAINT "empleados_tallas_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_tallas" ADD CONSTRAINT "empleados_tallas_tipo_uniforme_id_fkey" FOREIGN KEY ("tipo_uniforme_id") REFERENCES "tipos_uniforme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados_tallas" ADD CONSTRAINT "empleados_tallas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos_uniforme" ADD CONSTRAINT "requerimientos_uniforme_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos_uniforme" ADD CONSTRAINT "requerimientos_uniforme_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos_uniforme" ADD CONSTRAINT "requerimientos_uniforme_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos_uniforme_detalles" ADD CONSTRAINT "requerimientos_uniforme_detalles_requerimiento_id_fkey" FOREIGN KEY ("requerimiento_id") REFERENCES "requerimientos_uniforme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos_uniforme_detalles" ADD CONSTRAINT "requerimientos_uniforme_detalles_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requerimientos_uniforme_detalles" ADD CONSTRAINT "requerimientos_uniforme_detalles_tipo_uniforme_id_fkey" FOREIGN KEY ("tipo_uniforme_id") REFERENCES "tipos_uniforme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_cese" ADD CONSTRAINT "tipos_cese_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_generados" ADD CONSTRAINT "reportes_generados_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_generados" ADD CONSTRAINT "reportes_generados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos_laborales" ADD CONSTRAINT "vinculos_laborales_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos_laborales" ADD CONSTRAINT "vinculos_laborales_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CaracteristicaToTipoUniforme" ADD CONSTRAINT "_CaracteristicaToTipoUniforme_A_fkey" FOREIGN KEY ("A") REFERENCES "caracteristicas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CaracteristicaToTipoUniforme" ADD CONSTRAINT "_CaracteristicaToTipoUniforme_B_fkey" FOREIGN KEY ("B") REFERENCES "tipos_uniforme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

