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
