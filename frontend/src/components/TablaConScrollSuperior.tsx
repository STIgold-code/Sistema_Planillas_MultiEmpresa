'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

interface TablaConScrollSuperiorProps {
  /** Clases del contenedor real de scroll (overflow, max-height, bordes, etc.) */
  className?: string;
  children: ReactNode;
}

/**
 * Contenedor de scroll con una barra horizontal espejo en el borde superior.
 * CSS nativo no permite ubicar el scrollbar arriba, así que se sincroniza
 * el scrollLeft entre una barra fantasma superior y el contenedor real.
 */
export function TablaConScrollSuperior({ className, children }: TablaConScrollSuperiorProps) {
  const barraSuperiorRef = useRef<HTMLDivElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [anchoContenido, setAnchoContenido] = useState(0);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const actualizarAncho = () => setAnchoContenido(contenedor.scrollWidth);
    actualizarAncho();

    const observador = new ResizeObserver(actualizarAncho);
    observador.observe(contenedor);
    if (contenedor.firstElementChild) {
      observador.observe(contenedor.firstElementChild);
    }
    return () => observador.disconnect();
  }, []);

  // Asignar el mismo scrollLeft no re-dispara el evento, así que no hay bucle.
  const sincronizarDesdeBarra = () => {
    if (contenedorRef.current && barraSuperiorRef.current) {
      contenedorRef.current.scrollLeft = barraSuperiorRef.current.scrollLeft;
    }
  };

  const sincronizarDesdeContenido = () => {
    if (contenedorRef.current && barraSuperiorRef.current) {
      barraSuperiorRef.current.scrollLeft = contenedorRef.current.scrollLeft;
    }
  };

  return (
    <div>
      <div
        ref={barraSuperiorRef}
        onScroll={sincronizarDesdeBarra}
        className="overflow-x-auto overflow-y-hidden"
        aria-hidden="true"
        tabIndex={-1}
      >
        <div style={{ width: anchoContenido }} className="h-px" />
      </div>
      <div ref={contenedorRef} onScroll={sincronizarDesdeContenido} className={className}>
        {children}
      </div>
    </div>
  );
}
