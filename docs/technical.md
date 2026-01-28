# Documentación Técnica - Pastelería Arruti

## Reglas de Datos

### Identificadores (IDs)
Todos los identificadores únicos (IDs) deben ser generados por el cliente (quien realiza la llamada) utilizando el estándar **UUID (v4)**. La base de datos (Google Sheets) almacenará estos IDs como strings. Para modificaciones, se debe reutilizar el ID original.

## Integraciones: Google Sheets

El sistema utiliza Google Sheets como base de datos centralizada.

### Estructura de "Tablas" (Hojas)

#### Hoja: `Pedidos`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| ID_Pedido | String | Identificador único |
| Producto | String | Nombre del producto artesanal |
| Cantidad | Number | Unidades solicitadas |
| Fecha_Entrega | Date | Fecha comprometida |
| Estado | String | Pendiente, En Proceso, Finalizado |
| Fecha_Act | DateTime | Última actualización |
| Cliente | String | Nombre del cliente |
| Notas_Pastelero | String | Instrucciones para obrador |
| Notas_Tienda | String | Comentarios de tienda |
| Relleno | String | Relleno seleccionado para el pedido |
| Talla | String | Ración o talla seleccionada |
| Vendedor | String | Nombre de la persona que atendió al cliente |

#### Hoja: `Empleados`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| ID_Empleado | String | Identificador único |
| Nombre | String | Nombre completo |
| Activo | String | "SI" o "NO" |

#### Hoja: `Produccion_Diaria`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| ID_Lote | String | Identificador del lote de producción |
| ID_Pedido | String | Referencia al pedido |
| Hora_Inicio | DateTime | Entrada a producción |
| Fase | String | Preparación, Horno, Decoración |

#### Hoja: `Productos`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| ID_Producto | String | UUID (v4) |
| Familia | String | Categoría (Bollos, Pasteles, etc.) |
| Nombre | String | Nombre comercial |
| Raciones_Tallas | String | Lista separada por comas |
| Rellenos | String | Lista separada por comas |

#### Hoja: `Recetas`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| ID | String | UUID (v4) |
| ID_Producto | String | Referencia a Productos |
| Nombre_Producto | String | Denormalizado |
| Raciones | String | Tamaño específico |
| Ingredientes | String | Detalle de ingredientes |
| Pasos | String | Guía de preparación |
| Tiempo_Total | String | Tiempo estimado |

#### Hoja: `Usuarios` (Planificado)
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| ID_Usuario | String | Identificador único |
| Nombre | String | Nombre completo |
| Email | String | Correo electrónico (Login) |
| Activo | Boolean | Estado de la cuenta |

## Seguridad y Autenticación

El sistema implementa un esquema de autenticación basado en servicios de Angular y guardias de ruta.

### Componentes de Seguridad

1.  **AuthService**: Centraliza la lógica de inicio de sesión, cierre de sesión y gestión del estado del usuario actual utilizando un `BehaviorSubject` para reactividad en la UI.
2.  **AuthGuard**: Guardia funcional que protege todas las rutas de la aplicación (excepto `/login`). Verifica si hay un usuario autenticado antes de permitir la navegación.
3.  **Local Storage**: Se utiliza para persistir la sesión del usuario de forma sencilla, permitiendo que la sesión se mantenga tras recargar la página.

### Flujo de Autenticación

- Al intentar acceder a cualquier ruta protegida, el `AuthGuard` verifica `AuthService.isLoggedIn()`.
- Si es `false`, redirige a `/login`.
- Tras un login exitoso, se guarda el objeto `Usuario` en el `localStorage` y se navega a la ruta principal.

## Contrato de API (Intercambio de Datos)

El middleware (Google Apps Script) expondrá un endpoint GET que devuelve la información en el siguiente formato JSON:

### GET /produccion-diaria
...
```json
{
  "status": "success",
  "data": [
    {
      "id": "PED-001",
      "producto": "Croissant Mantequilla",
      "cantidad": 50,
      "fecha": "2026-01-14",
      "estado_actual": "En Proceso"
    },
    ...
  ],
  "stats": {
    "pendientes": 10,
    "horno": 2,
    "finalizados": 15
  }
}
```

### GET /productos
```json
{
  "status": "success",
  "data": [
    {
      "id_producto": "uuid-1234",
      "familia": "Pastelería",
      "nombre": "Tarta de Queso",
      "raciones_tallas": "4p, 6p, 8p"
    }
  ]
}
```

## Arquitectura de Capas (Angular)

### Estándares de Componentes
- **Separación de CSS/SCSS**: Los estilos de los componentes deben estar siempre en archivos independientes (ej. `nombre.component.scss`). No se permite el uso de estilos inline (`styles: [...]`) dentro del decorador `@Component`.

## Interfaz de Usuario y Experiencia (UX/UI)

El sistema está diseñado para ser utilizado principalmente en tablets dentro de la tienda y el obrador.

### Principios de Diseño Tablet-First

1.  **Layout Adaptativo**:
    *   **Móvil/Tablet Vertical**: Listas en formato de "Cards" (tarjetas) para facilitar el scroll vertical y maximizar el área de toque.
    *   **Tablet Horizontal/Desktop**: Tablas compactas o grids de doble columna para aprovechar el ancho de pantalla.
2.  **Objetivos de Toque**:
    *   Botones críticos (Guardar, Entregar, Buscar) tienen un tamaño mínimo de **44x44px** (estándar Apple/Material).
    *   Espaciado generoso entre elementos interactivos para evitar errores de pulsación.
3.  **Jerarquía Visual**:
    *   **Tienda (Creación)**: Doble columna. Izquierda para selección de producto (lo que el cliente pide), Derecha para datos de entrega (cuándo se lo lleva).
    *   **Lista de Pedidos**: Cards con bordes de colores según urgencia (Rojo = Para hoy/Pendiente).

### Tipos de Páginas

| Página | Rol Principal | Optimizaciones Específicas |
| :--- | :--- | :--- |
| **Lista de Pedidos** | Seguimiento y Entrega | Vista rápida de estados, botones de "ENTREGAR" directos, filtros por fecha. |
| **Nuevo Pedido** | Captura de Venta | Buscador predictivo, chips de acceso rápido a familias (Tarta, Pan), selección de hora simplificada. |
| **Obrador Detail** | Producción | Texto de notas ampliado, estados de producción claros, feedback visual de cambios. |

## Optimización de Rendimiento (Estrategia de Caché)

Para mitigar la latencia de Google Apps Script, se implementa un patrón de **Multicasting con Replay** utilizando RxJS en la capa de Servicios.

### Mecanismo: shareReplay(1) y Actualización Optimista

Para mitigar la latencia de Google Apps Script, se combina la caché de lectura con **Actualizaciones Optimistas** gestionadas mediante Angular Signals.

```mermaid
sequenceDiagram
    participant UI as Componente Angular
    participant S as Servicio (Signal Store)
    participant B as Backend (Google Sheets)

    Note over UI, S: Primera Petición
    UI->>S: getDatos()
    S->>B: HTTP GET
    B-->>S: JSON Response
    S->>S: Actualizar Signal Local
    S-->>UI: Datos transformados
    
    Note over UI, S: Escritura (Optimista)
    UI->>S: addDato(nuevo)
    S->>S: 1. Añadir a Signal Local (Instantáneo)
    S-->>UI: UI se actualiza (0ms)
    
    S->>B: 2. Sincronización (HTTP POST)
    
    alt Éxito
        B-->>S: 3a. Confirmación OK
    else Error
        B-->>S: 3b. Error de Servidor
        S->>S: 4. ROLLBACK (Restaurar Signal)
        S-->>UI: Notificar Error
    end
```

### Reglas de Estado
*   **Signals:** El estado maestro de la aplicación reside en Signals dentro de los servicios.
*   **Invalidación:** La caché se invalida o se revierte automáticamente si la sincronización con el backend falla.
