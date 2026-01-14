/**
 * Google Apps Script - Backend para Pastelería Arruti
 * 
 * Este script actúa como API para la aplicación Angular.
 * Debe desplegarse como "Aplicación Web" siguiendo las instrucciones del README principal.
 */

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetPedidos = ss.getSheetByName('Pedidos');
  
  if (!sheetPedidos) {
    return createResponse({
      status: "error",
      message: "Hoja 'Pedidos' no encontrada"
    });
  }

  // Obtener todos los datos de la hoja
  const values = sheetPedidos.getDataRange().getValues();
  const rows = values.slice(1); // Excluir cabecera

  // Mapear los datos al formato JSON que espera Angular
  const data = rows.map(row => {
    return {
      id: row[0],
      producto: row[1],
      cantidad: row[2],
      fecha: row[3],
      estado_actual: row[4]
    };
  });

  // Calcular estadísticas para el dashboard
  const stats = {
    pendientes: data.filter(p => String(p.estado_actual).trim() === 'Pendiente').length,
    horno: data.filter(p => String(p.estado_actual).trim() === 'En Proceso').length,
    finalizados: data.filter(p => String(p.estado_actual).trim() === 'Finalizado').length
  };

  return createResponse({
    status: "success",
    data: data,
    stats: stats
  });
}

/**
 * Utilidad para crear respuestas JSON con CORS habilitado
 */
function createResponse(content) {
  return ContentService.createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Función opcional para probar desde el editor
 */
function testDeployment() {
  const result = doGet();
  Logger.log(result.getContent());
}
