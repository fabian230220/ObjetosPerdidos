const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_USER = process.env.ADMIN_USER || 'porteria_principal';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin2026';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'token-porteria-poligran-2026';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database(process.env.DB_PATH || 'objetos_perdidos.db');
db.pragma('journal_mode = WAL');

db.prepare(`
    CREATE TABLE IF NOT EXISTS reportes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_seguimiento TEXT UNIQUE,
        descripcion TEXT,
        categoria TEXT,
        lugar TEXT,
        fecha_perdida TEXT,
        contacto TEXT,
        estado TEXT DEFAULT 'Activo',
        ubicacion_fisica TEXT DEFAULT NULL,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// Migraciones seguras para bases de datos de incrementos anteriores
try {
    db.prepare("ALTER TABLE reportes ADD COLUMN estado TEXT DEFAULT 'Activo'").run();
} catch (e) {}

try {
    db.prepare("ALTER TABLE reportes ADD COLUMN ubicacion_fisica TEXT DEFAULT NULL").run();
} catch (e) {}

function generarCodigoUnico() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = 'OP-';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

function obtenerFechaHoyColombia() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

const categoriasValidas = [
    "Electrónicos", "Documentos", "Llaves",
    "Ropa y accesorios", "Útiles académicos", "Otros"
];

// Middleware de autenticación para rutas de portería
function autenticarPorteria(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (!token || token !== ADMIN_TOKEN) {
        return res.status(401).json({
            exito: false,
            mensaje: 'Acceso denegado: inicia sesión como personal de portería.'
        });
    }
    next();
}

// Endpoint auxiliar para sincronizar fecha local en el calendario del frontend
app.get('/api/fecha-hoy', (req, res) => {
    res.json({ exito: true, fecha: obtenerFechaHoyColombia() });
});

// 1. Registrar reporte de objeto perdido (Estudiante)
app.post('/api/reportes', (req, res) => {
    if (process.env.SIMULAR_FALLO_ALMACENAMIENTO === 'true') {
        return res.status(500).json({ exito: false, mensaje: "Error controlado: La base de datos no está disponible." });
    }

    const { descripcion, categoria, lugar, fecha, contacto } = req.body;

    if (!descripcion || !categoria || !lugar || !fecha || !contacto ||
        !descripcion.trim() || !lugar.trim() || !contacto.trim()) {
        return res.status(400).json({ exito: false, mensaje: "Todos los campos obligatorios deben completarse." });
    }

    if (descripcion.trim().length < 5 || descripcion.trim().length > 300) {
        return res.status(400).json({ exito: false, mensaje: "La descripción debe tener entre 5 y 300 caracteres." });
    }

    if (lugar.trim().length < 3 || lugar.trim().length > 100) {
        return res.status(400).json({ exito: false, mensaje: "El lugar debe tener entre 3 y 100 caracteres." });
    }

    if (!categoriasValidas.includes(categoria)) {
        return res.status(400).json({ exito: false, mensaje: "La categoría seleccionada no es válida." });
    }

    const hoyColombia = obtenerFechaHoyColombia();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoyColombia) {
        return res.status(400).json({ exito: false, mensaje: "La fecha seleccionada no puede ser posterior al día de hoy." });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@poligran\.edu\.co$/;
    if (!emailRegex.test(contacto.trim())) {
        return res.status(400).json({ exito: false, mensaje: "Debe proporcionar un correo válido que finalice en @poligran.edu.co" });
    }

    try {
        let codigoUnico;
        let guardado = false;
        let intentos = 0;

        while (!guardado && intentos < 5) {
            codigoUnico = generarCodigoUnico();
            try {
                const stmt = db.prepare(`
                    INSERT INTO reportes (codigo_seguimiento, descripcion, categoria, lugar, fecha_perdida, contacto, estado)
                    VALUES (?, ?, ?, ?, ?, ?, 'Activo')
                `);
                stmt.run(codigoUnico, descripcion.trim(), categoria, lugar.trim(), fecha, contacto.trim());
                guardado = true;
            } catch (err) {
                intentos++;
            }
        }

        if (!guardado) {
            return res.status(500).json({ exito: false, mensaje: "No se pudo generar un código único de seguimiento." });
        }

        return res.status(201).json({
            exito: true,
            mensaje: "Reporte creado exitosamente",
            codigo: codigoUnico
        });
    } catch (error) {
        return res.status(500).json({ exito: false, mensaje: "Error interno en el servidor." });
    }
});

// 2. Consultar estado de un reporte por Código (OP-XXXXXX)
app.get('/api/reportes/:codigo', (req, res) => {
    const codigo = req.params.codigo.trim().toUpperCase();

    try {
        const stmt = db.prepare(
            'SELECT codigo_seguimiento, descripcion, categoria, lugar, fecha_perdida, estado, fecha_registro FROM reportes WHERE codigo_seguimiento = ?'
        );
        const reporte = stmt.get(codigo);

        if (!reporte) {
            return res.status(404).json({ exito: false, mensaje: "No se encontró ningún reporte con ese código." });
        }

        return res.json({ exito: true, reporte });
    } catch (error) {
        return res.status(500).json({ exito: false, mensaje: "Error al consultar la base de datos." });
    }
});

// 3. Consultar Catálogo público blindado (sin códigos ni ubicación interna)
app.get('/api/catalogo', (req, res) => {
    const { categoria } = req.query;
    let query = "SELECT descripcion, categoria, lugar, fecha_perdida, estado FROM reportes WHERE estado != 'Entregado'";
    const params = [];

    if (categoria && categoria !== 'Todas') {
        query += ' AND categoria = ?';
        params.push(categoria);
    }

    query += ' ORDER BY id DESC';

    try {
        const stmt = db.prepare(query);
        const objetos = stmt.all(...params);
        return res.json({ exito: true, objetos });
    } catch (error) {
        return res.status(500).json({ exito: false, mensaje: "Error al obtener el catálogo." });
    }
});

// 4. Inicio de sesión modal de Portería (B-21)
app.post('/api/admin/login', (req, res) => {
    const { usuario, clave } = req.body || {};

    if (usuario === ADMIN_USER && clave === ADMIN_PASS) {
        return res.json({
            exito: true,
            mensaje: 'Sesión de portería iniciada correctamente.',
            usuario: ADMIN_USER,
            token: ADMIN_TOKEN
        });
    }

    return res.status(401).json({
        exito: false,
        mensaje: 'Usuario o contraseña de portería incorrectos.'
    });
});

// 5. Listado interno completo para el panel de Portería
app.get('/api/admin/reportes', autenticarPorteria, (req, res) => {
    try {
        const reportes = db.prepare(`
            SELECT id, codigo_seguimiento, descripcion, categoria, lugar, fecha_perdida, contacto, estado, ubicacion_fisica, fecha_registro
            FROM reportes
            ORDER BY id DESC
        `).all();
        return res.json({ exito: true, reportes });
    } catch (error) {
        return res.status(500).json({ exito: false, mensaje: 'Error al consultar el inventario de portería.' });
    }
});

// 6. Recepción directa de objeto hallado entregado en Portería (B-22 / T-22.1)
app.post('/api/admin/recepcion', autenticarPorteria, (req, res) => {
    const { descripcion, categoria, lugar, fecha, ubicacion_fisica } = req.body || {};

    if (!descripcion || !categoria || !lugar || !fecha || !ubicacion_fisica ||
        !descripcion.trim() || !lugar.trim() || !ubicacion_fisica.trim()) {
        return res.status(400).json({
            exito: false,
            mensaje: 'Todos los campos son obligatorios, incluida la ubicación física (ej. Locker B-04).'
        });
    }

    if (descripcion.trim().length < 5 || descripcion.trim().length > 300) {
        return res.status(400).json({ exito: false, mensaje: 'La descripción debe tener entre 5 y 300 caracteres.' });
    }

    if (lugar.trim().length < 3 || lugar.trim().length > 100) {
        return res.status(400).json({ exito: false, mensaje: 'El lugar del hallazgo debe tener entre 3 y 100 caracteres.' });
    }

    if (ubicacion_fisica.trim().length < 2 || ubicacion_fisica.trim().length > 60) {
        return res.status(400).json({ exito: false, mensaje: 'La ubicación física debe tener entre 2 y 60 caracteres.' });
    }

    if (!categoriasValidas.includes(categoria)) {
        return res.status(400).json({ exito: false, mensaje: 'La categoría seleccionada no es válida.' });
    }

    const hoyColombia = obtenerFechaHoyColombia();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoyColombia) {
        return res.status(400).json({ exito: false, mensaje: 'La fecha del hallazgo no puede ser posterior al día de hoy.' });
    }

    try {
        let codigoUnico;
        let guardado = false;
        let intentos = 0;

        while (!guardado && intentos < 5) {
            codigoUnico = generarCodigoUnico();
            try {
                const stmt = db.prepare(`
                    INSERT INTO reportes (codigo_seguimiento, descripcion, categoria, lugar, fecha_perdida, contacto, estado, ubicacion_fisica)
                    VALUES (?, ?, ?, ?, ?, 'Recepción Directa Portería', 'En Custodia', ?)
                `);
                stmt.run(codigoUnico, descripcion.trim(), categoria, lugar.trim(), fecha, ubicacion_fisica.trim());
                guardado = true;
            } catch (err) {
                intentos++;
            }
        }

        if (!guardado) {
            return res.status(500).json({ exito: false, mensaje: 'No se pudo generar un código único.' });
        }

        return res.status(201).json({
            exito: true,
            mensaje: 'Objeto recepcionado en custodia con éxito.',
            codigo: codigoUnico,
            ubicacion_fisica: ubicacion_fisica.trim()
        });
    } catch (error) {
        return res.status(500).json({ exito: false, mensaje: 'Error interno al registrar el hallazgo.' });
    }
});

// 7. Actualizar estado y ubicación física (Protegido por sesión de Portería)
app.patch('/api/reportes/:codigo/estado', autenticarPorteria, (req, res) => {
    const codigo = req.params.codigo.trim().toUpperCase();
    const { nuevoEstado, ubicacion_fisica } = req.body || {};

    const estadosValidos = ['Activo', 'En Custodia', 'Entregado'];
    if (!nuevoEstado || !estadosValidos.includes(nuevoEstado)) {
        return res.status(400).json({ exito: false, mensaje: 'Estado no válido.' });
    }

    try {
        const reporteActual = db.prepare('SELECT ubicacion_fisica FROM reportes WHERE codigo_seguimiento = ?').get(codigo);
        if (!reporteActual) {
            return res.status(404).json({ exito: false, mensaje: 'No se encontró ningún reporte con ese código.' });
        }

        const ubicacionFinal = (ubicacion_fisica && ubicacion_fisica.trim())
            ? ubicacion_fisica.trim()
            : reporteActual.ubicacion_fisica;

        if (nuevoEstado === 'En Custodia' && !ubicacionFinal) {
            return res.status(400).json({
                exito: false,
                mensaje: 'Asigna una ubicación física (ej. Locker B-04) antes de marcar En Custodia.'
            });
        }

        db.prepare('UPDATE reportes SET estado = ?, ubicacion_fisica = ? WHERE codigo_seguimiento = ?')
            .run(nuevoEstado, ubicacionFinal, codigo);

        return res.json({
            exito: true,
            mensaje: `Estado actualizado a "${nuevoEstado}" con éxito.`
        });
    } catch (error) {
        return res.status(500).json({ exito: false, mensaje: 'Error interno al actualizar estado.' });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Servidor con validaciones estrictas en http://localhost:${PORT}`);
    });
}

module.exports = { app, db, generarCodigoUnico };