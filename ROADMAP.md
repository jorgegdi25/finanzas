# Roadmap del Proyecto: Finanzas JGM

Este documento registra las fases del proyecto, su estado actual y los próximos pasos.

## ✅ Fase 1: Cimentación (Completada)
- Configuración de Next.js y Supabase.
- Estructura de base de datos para Movimientos, Ahorros, Proyectos, Deudas, Clientes y Documentos.
- Autenticación base.

## ✅ Fase 2: Estandarización y Validación (Completada)
- **Migración a React Hook Form + Zod**: Todos los formularios ahora tienen validación profesional y tipado estricto.
- **Sistema de Diseño**: Integración de `AppLayout`, `Button`, `Input`, `Select`, `Modal` y `Toast`.
- **Experiencia de Usuario**: Implementación de **Skeleton Loaders** en toda la aplicación para mejorar la percepción de carga.
- **Multimoneda**: Soporte para cálculos en COP, USD y EUR en Proyectos, Movimientos y Documentos.

## 🚀 Próximas Fases

### Fase 3: Rediseño de Navegación y Dashboard
- [x] Sidebar moderno con todos los módulos.
- [x] Ajustes accesible desde el sidebar.
- [x] Dashboard con Balance Operativo dinámico (colores + signos).
- [x] Tipografía monoespaciada (Geist Mono) para valores financieros.
- [ ] Tipografía optimizada para claridad numérica en móviles.
- [ ] Refinar espaciado y "negative space" adicional.

### Fase 4: Funcionalidades Avanzadas ✅
- [x] **PWA**: Instalación en celulares y escritorio (manifest.json + Service Worker).
- [x] **Búsqueda Global (Cmd+K)**: Acceso rápido a páginas, clientes, proyectos y cuentas.
- [x] **Reportes y Gráficos**: Gráfico de dona interactivo con Recharts para distribución de gastos.
- [x] **Mejora de Documentos**: PDFs con diseño corporativo premium (header oscuro, bloques redondeados, tabla estilizada).

### Fase 5: Optimización y Lanzamiento
- [x] Pruebas de flujo completo (8/8 módulos pasaron).
- [x] Optimización de queries a Supabase (selects específicos, límites, paralelo con Promise.allSettled).
- [ ] Despliegue final y configuración de dominio.

---
*Ultima actualización: 16 de Enero, 2026*
