# Documentación Técnica - Pastelería Arruti

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

#### Hoja: `Produccion_Diaria`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| ID_Lote | String | Identificador del lote de producción |
| ID_Pedido | String | Referencia al pedido |
| Hora_Inicio | DateTime | Entrada a producción |
| Fase | String | Preparación, Horno, Decoración |

## Arquitectura de Capas (Angular)

1.  **Capa de Presentación (UI):** Componentes Standalone de Angular.
2.  **Capa de Negocio (Servicios):** Orquestan el flujo y aplican reglas (ej: cálculo de merma).
3.  **Capa de Dominio (Modelos):** Interfaces TypeScript que definen el contrato de datos.
4.  **Capa de Infraestructura (Adaptadores):** Implementan la lógica de `fetch` o `HttpClient` para conectar con Google Sheets API.
