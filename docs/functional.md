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
* **Optimismo:** Los indicadores deben reaccionar inmediatamente a los cambios de estado locales.

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
Como gestor, quiero crear pedidos seleccionando productos del catálogo de forma rápida y visual (interfaz adaptada a tablet/táctil) para asegurar la consistencia y agilidad en tienda.

**Flujo Principal:**
1. El usuario pulsa "Crear Nuevo Pedido".
2. El sistema muestra una cuadrícula de familias de productos para filtrado rápido.
3. El usuario selecciona una familia y luego un producto mediante botones táctiles grandes.
4. Si el producto tiene raciones/tallas definidas, se muestran como "chips" seleccionables.
5. El sistema rellena automáticamente la fecha de entrega sugerida (mañana).
6. Al confirmar, el pedido aparece inmediatamente en la lista (UI Optimista) mientras se sincroniza en segundo plano.

**Criterios de Aceptación:**
* La interfaz debe ser utilizable sin teclado/ratón (target táctil > 44px).
* Feedback visual inmediato tras la creación.
* Persistencia en Google Sheets.
