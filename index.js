const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar SQLite
const db = new Database('objetos_perdidos.db');

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
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();
try {
    db.prepare("ALTER TABLE reportes ADD COLUMN estado TEXT DEFAULT 'Activo'").run();
} catch (e) {
}
function generarCodigoUnico() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = 'OP-';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

const categoriasValidas = [
    "Electrónicos", "Documentos", "Llaves",
    "Ropa y accesorios", "Útiles académicos", "Otros"
];

app.post('/api/reportes', (req, res) => {
    if (process.env.SIMULAR_FALLO_ALMACENAMIENTO === 'true') {
        return res.status(500).json({ exito: false, mensaje: "Error controlado: La base de datos no está disponible." });
    }

    const { descripcion, categoria, lugar, fecha, contacto } = req.body;

    // R1. Validar que no haya campos vacíos ni formados solo por espacios
    if (!descripcion || !categoria || !lugar || !fecha || !contacto ||
        !descripcion.trim() || !lugar.trim() || !contacto.trim()) {
        return res.status(400).json({ exito: false, mensaje: "Todos los campos obligatorios deben completarse." });
    }

    // R2. Validar longitudes
    if (descripcion.trim().length < 5 || descripcion.trim().length > 300) {
        return res.status(400).json({ exito: false, mensaje: "La descripción debe tener entre 5 y 300 caracteres." });
    }

    if (lugar.trim().length < 3 || lugar.trim().length > 100) {
        return res.status(400).json({ exito: false, mensaje: "El lugar debe tener entre 3 y 100 caracteres." });
    }

    // R3. Validar categoría cerrada
    if (!categoriasValidas.includes(categoria)) {
        return res.status(400).json({ exito: false, mensaje: "La categoría seleccionada no es válida." });
    }

    // R4. Validar fecha (Formato y que no sea futura)
    const fechaLoss = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    if (isNaN(fechaLoss.getTime()) || fechaLoss > hoy) {
        return res.status(400).json({ exito: false, mensaje: "La fecha seleccionada no puede ser posterior al día de hoy." });
    }

    // Validación estricta del dominio de correo institucional
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
                    INSERT INTO reportes (codigo_seguimiento, descripcion, categoria, lugar, fecha_perdida, contacto)
                    VALUES (?, ?, ?, ?, ?, ?)
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
// Consultar estado de un reporte por Código (OP-XXXXXX)
app.get('/api/reportes/:codigo', (req, res) => {
    const codigo = req.params.codigo.trim().toUpperCase();

    try {
        const stmt = db.prepare('SELECT codigo_seguimiento, descripcion, categoria, lugar, fecha_perdida, estado, fecha_registro FROM reportes WHERE codigo_seguimiento = ?');
        const reporte = stmt.get(codigo);

        if (!reporte) {
            return res.status(404).json({ exito: false, mensaje: "No se encontró ningún reporte con ese código." });
        }

        return res.json({ exito: true, reporte });
    } catch (error) {
        return res.status(500).json({ exito: false, mensaje: "Error al consultar la base de datos." });
    }
});

// Consultar Catálogo público
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
// Actualizar estado de reporte (Protegido por PIN de administración)
app.patch('/api/reportes/:codigo/estado', (req, res) => {
    const codigo = req.params.codigo.trim().toUpperCase();
    const { nuevoEstado, pinAdmin } = req.body;

    // Validación de clave administrativa para evitar que cualquiera cambie el estado
    if (pinAdmin !== '2302') {
        return res.status(403).json({ exito: false, mensaje: 'Acceso denegado: PIN de administración incorrecto.' });
    }

    const estadosValidos = ['Activo', 'En Custodia', 'Entregado'];
    if (!nuevoEstado || !estadosValidos.includes(nuevoEstado)) {
        return res.status(400).json({ exito: false, mensaje: 'Estado no válido.' });
    }

    try {
        const stmt = db.prepare('UPDATE reportes SET estado = ? WHERE codigo_seguimiento = ?');
        const result = stmt.run(nuevoEstado, codigo);

        if (result.changes === 0) {
            return res.status(404).json({ exito: false, mensaje: 'No se encontró ningún reporte con ese código.' });
        }

        return res.json({ exito: true, mensaje: `Estado actualizado a "${nuevoEstado}" con éxito.` });
    } catch (error) {
        return res.status(500).json({ exito: false, mensaje: 'Error interno al actualizar estado.' });
    }
});
app.listen(PORT, () => {
    console.log(`Servidor con validaciones estrictas en http://localhost:${PORT}`);
});