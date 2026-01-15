/**
 * Google Apps Script - Backend para Pastelería Arruti
 */

// CONFIGURACIÓN: ID de tu Google Sheet
const SPREADSHEET_ID = '1ECzAYLymvMzKq_lG1FVZ_J3Fx4jMv5nD9gQNpCeUCsc'; 

function doGet() {
  try {
    let ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (!ss) {
      throw new Error("No se pudo acceder a la hoja de cálculo con el ID proporcionado.");
    }
    
    const sheetPedidos = ss.getSheetByName('Pedidos');
    if (!sheetPedidos) {
      return createResponse({
        status: "error",
        message: "Hoja 'Pedidos' no encontrada en el documento. Verifique que la pestaña se llame exactamente 'Pedidos'."
      });
    }

    const range = sheetPedidos.getDataRange();
    const values = range.getValues();
    
    // Si la hoja está vacía o solo tiene cabecera
    if (values.length < 2) {
      return createResponse({
        status: "success",
        data: [],
        stats: { pendientes: 0, horno: 0, finalizados: 0 }
      });
    }

    const rows = values.slice(1);

    // Mapeo de datos
    const data = rows.map(row => ({
      id: row[0],
      producto: row[1],
      cantidad: row[2],
      fecha: row[3],
      estado_actual: row[4],
      fecha_actualizacion: row[5] || null
    }));

    // Cálculo de estadísticas
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

  } catch (e) {
    return createResponse({
      status: "error",
      message: "Error en el script: " + e.message
    });
  }
}

function createResponse(content) {
  return ContentService.createTextOutput(JSON.stringify(content))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Maneja las peticiones POST para añadir nuevos pedidos
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetPedidos = ss.getSheetByName('Pedidos');
    
    if (!sheetPedidos) {
      throw new Error("Hoja 'Pedidos' no encontrada.");
    }

    if (payload.action === 'updateStatus') {
      return handleUpdateStatus(sheetPedidos, payload);
    }

    // Acción por defecto: Añadir pedido
    return handleAddPedido(sheetPedidos, payload);

  } catch (e) {
    return createResponse({
      status: "error",
      message: "Error en doPost: " + e.message
    });
  }
}

/**
 * Añade un nuevo pedido a la hoja
 */
function handleAddPedido(sheet, pedido) {
  const lastRow = sheet.getLastRow();
  const id = pedido.id || "P-" + (lastRow + 1).toString().padStart(4, '0');
  
  // Preparar fila: ID, Producto, Cantidad, Fecha, Estado, Fecha Actualización
  const newRow = [
    id,
    pedido.producto,
    pedido.cantidad,
    pedido.fechaEntrega,
    pedido.estado || 'Pendiente',
    new Date() // Timestamp inicial
  ];

  sheet.appendRow(newRow);

  return createResponse({
    status: "success",
    message: "Pedido añadido correctamente",
    data: { id: id }
  });
}

/**
 * Actualiza el estado de un pedido existente
 */
function handleUpdateStatus(sheet, payload) {
  const data = sheet.getDataRange().getValues();
  const idToUpdate = payload.id;
  const nuevoEstado = payload.estado;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === idToUpdate) {
      const row = i + 1;
      sheet.getRange(row, 5).setValue(nuevoEstado); // Columna E (Estado)
      sheet.getRange(row, 6).setValue(new Date());   // Columna F (Fecha Actualización)
      
      return createResponse({
        status: "success",
        message: "Estado actualizado correctamente"
      });
    }
  }
  
  throw new Error("Pedido con ID " + idToUpdate + " no encontrado.");
}

/**
 * Función para probar y autorizar permisos
 */
function testDeployment() {
  const result = doGet();
  Logger.log(result.getContent());
}