const https = require('https');

/**
 * Script para verificar si el backend de Google Apps Script está desplegado y respondiendo.
 * Carga la URL desde el archivo de configuración de Angular.
 */

// Intentar leer la URL del archivo environment.ts (extrayéndola de forma sencilla)
const fs = require('fs');
const path = require('path');

// Prioridad: 1. Variable de entorno BACKEND_URL, 2. Archivo environment.ts
let apiUrl = process.env.BACKEND_URL;

if (!apiUrl) {
    const envPath = path.join(__dirname, '../src/environments/environment.ts');
    try {
        const envFile = fs.readFileSync(envPath, 'utf8');
        const match = envFile.match(/apiUrl:\s*['"](.*)['"]/);
        if (match && match[1]) {
            apiUrl = match[1];
        }
    } catch (e) {
        console.warn('⚠️ No se pudo leer el archivo environment.ts');
    }
}

if (!apiUrl || apiUrl.includes('PLACEHOLDER')) {
    console.error('❌ Error: La apiUrl en environment.ts no está configurada.');
    console.log('   Sustituye PLACEHOLDER por tu URL de Google Apps Script antes de probar.');
    process.exit(1);
}

console.log(`🔍 Probando conexión con: ${apiUrl}...`);

https.get(apiUrl, (res) => {
    let data = '';

    // Manejar redirecciones de Google (muy común en Apps Script)
    if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location;
        console.log('🔄 Siguiendo redirección de Google...');
        https.get(redirectUrl, (res2) => {
            let data2 = '';
            res2.on('data', (chunk) => data2 += chunk);
            res2.on('end', () => validateResponse(data2, res2.statusCode));
        });
        return;
    }

    res.on('data', (chunk) => data += chunk);
    res.on('end', () => validateResponse(data, res.statusCode));

}).on('error', (err) => {
    console.error('❌ Error de conexión:', err.message);
    process.exit(1);
});

function validateResponse(body, statusCode) {
    if (statusCode !== 200) {
        console.error(`❌ El servidor respondió con código: ${statusCode}`);
        console.log('Cuerpo de respuesta:', body.substring(0, 200));
        process.exit(1);
    }

    try {
        const json = JSON.parse(body);
        if (json.status === 'success' && json.stats) {
            console.log('✅ ¡Conexión exitosa! El backend está desplegado y funcionando correctamente.');
            console.log('📊 Stats recibidas:', JSON.stringify(json.stats, null, 2));
            process.exit(0);
        } else {
            console.warn('⚠️ La respuesta no tiene el formato esperado (faltan stats o status: success).');
            console.log('Respuesta recibida:', body);
            process.exit(1);
        }
    } catch (e) {
        console.error('❌ Error: La respuesta no es un JSON válido.');
        console.log('Cuerpo recibido:', body.substring(0, 500));
        process.exit(1);
    }
}
