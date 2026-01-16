# Documentación Técnica - Pastelería Arruti

## Reglas de Datos

### Identificadores (IDs)
Todos los identificadores únicos (IDs) deben ser generados por el cliente (quien realiza la llamada) utilizando el estándar **UUID (v4)**. La base de datos (Google Sheets) almacenará estos IDs como strings.

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

#### Hoja: `Productos`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| ID_Producto | String | UUID (v4) |
| Familia | String | Categoría (Bollos, Pasteles, etc.) |
| Nombre | String | Nombre comercial |
| Raciones_Tallas | String | Lista separada por comas |

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

1.  **Capa de Presentación (UI):** Componentes Standalone de Angular. Manejan estados de carga y error para feedback al usuario.
2.  **Capa de Negocio (Servicios):** Orquestan el flujo y aplican reglas (ej: cálculo de merma). Incluyen gestión de excepciones y transformación de errores técnicos a mensajes de dominio.
3.  **Capa de Dominio (Modelos):** Interfaces TypeScript que definen el contrato de datos.
4.  **Capa de Infraestructura (Adaptadores):** Implementan la lógica de `fetch` o `HttpClient` para conectar con Google Sheets API.
