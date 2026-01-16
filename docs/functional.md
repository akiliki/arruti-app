# Documentación Funcional - Pastelería Arruti

## Casos de Uso

### CU-01: Visualización del Dashboard de Producción
**Estado:** Definido
**Criticidad:** CRÍTICA (Requiere tests E2E)

**Descripción:**
Como gestor de la pastelería, quiero ver un resumen en tiempo real del estado de la producción diaria para tomar decisiones rápidas.

**Flujo Principal:**
1. El usuario accede a la aplicación.
2. El sistema carga los datos desde Google Sheets.
3. Se muestran indicadores:
    * Total de lotes pendientes.
    * Lotes en horno.
    * Lotes finalizados hoy.
4. Se muestra un gráfico de distribución de productos.

**Criterios de Aceptación:**
* Los datos deben actualizarse al recargar la página.
* Si no hay conexión o falla la API, debe mostrarse un mensaje de error claro.

### CU-02: Gestión de Catálogo de Productos
**Estado:** Definido
**Criticidad:** ALTA

**Descripción:**
Como administrador, quiero gestionar los productos de la pastelería (familias, nombres y tamaños/raciones) para mantener el catálogo actualizado.

**Flujo Principal (Añadir):**
1. El usuario accede a la sección de Productos.
2. El usuario pulsa "Añadir Producto".
3. Completa los datos: Familia (ej: Bollería), Producto (ej: Croissant), Raciones o Tamaños (lista separada por comas).
4. El sistema genera un UUID para el producto y lo guarda.

**Flujo Principal (Listar):**
1. El usuario accede a la sección de Productos.
2. El sistema muestra la lista de productos agrupados o filtrables por Familia.

**Criterios de Aceptación:**
* Cada producto debe tener al menos una familia y un nombre.
* Los tamaños/raciones son opcionales pero recomendados para productos divisibles.

### CU-03: Creación de Pedidos
**Estado:** En Desarrollo
**Criticidad:** CRÍTICA

**Descripción:**
Como gestor, quiero crear pedidos seleccionando productos del catálogo para asegurar la consistencia de los datos.

**Flujo Principal:**
1. El usuario pulsa "Crear Nuevo Pedido".
2. El sistema muestra un desplegable con los productos del catálogo.
3. El usuario selecciona un producto.
4. Si el producto tiene raciones/tallas definidas, el sistema muestra un segundo desplegable para seleccionar la talla.
5. El usuario indica la cantidad y la fecha de entrega.
6. El sistema guarda el pedido.

**Criterios de Aceptación:**
* No se puede crear un pedido sin seleccionar un producto válido.
* Si el producto tiene tallas, debe seleccionarse una.
