process.env.DB_PATH = ':memory:';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { app, db, generarCodigoUnico } = require('./index');

let server;
let baseUrl;
let codigoEstudiante;
let codigoHallazgoPorteria;
let adminToken;

before(async () => {
    await new Promise((resolve) => {
        server = app.listen(0, () => {
            const { port } = server.address();
            baseUrl = `http://127.0.0.1:${port}`;
            resolve();
        });
    });
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
    db.close();
});

describe('Suite E2E Real - Sistema de Objetos Perdidos (Entrega Final)', () => {
    it('1. Genera códigos únicos con formato OP-XXXXXX (9 caracteres)', () => {
        const codigos = new Set();
        for (let i = 0; i < 50; i++) {
            const codigo = generarCodigoUnico();
            assert.match(codigo, /^OP-[A-Z0-9]{6}$/);
            codigos.add(codigo);
        }
        assert.equal(codigos.size, 50);
    });

    it('2. Rechaza correos no institucionales y fechas futuras', async () => {
        const resCorreo = await fetch(`${baseUrl}/api/reportes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                descripcion: 'Calculadora científica Casio fx-991',
                categoria: 'Electrónicos',
                lugar: 'Biblioteca piso 2',
                fecha: '2026-11-15',
                contacto: 'estudiante@gmail.com'
            })
        });
        assert.equal(resCorreo.status, 400);

        const resFecha = await fetch(`${baseUrl}/api/reportes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                descripcion: 'Calculadora científica Casio fx-991',
                categoria: 'Electrónicos',
                lugar: 'Biblioteca piso 2',
                fecha: '2099-12-31',
                contacto: 'efagarciaf@poligran.edu.co'
            })
        });
        assert.equal(resFecha.status, 400);
    });

    it('3. Registra reporte válido de estudiante en estado Activo', async () => {
        const res = await fetch(`${baseUrl}/api/reportes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                descripcion: 'Billetera de cuero negra con carné estudiantil',
                categoria: 'Documentos',
                lugar: 'Cafetería central',
                fecha: '2026-11-15',
                contacto: 'efagarciaf@poligran.edu.co'
            })
        });
        const data = await res.json();
        assert.equal(res.status, 201);
        assert.equal(data.exito, true);
        assert.match(data.codigo, /^OP-[A-Z0-9]{6}$/);
        codigoEstudiante = data.codigo;
    });

    it('4. Catálogo público blindado oculta códigos, correos y ubicación interna', async () => {
        const res = await fetch(`${baseUrl}/api/catalogo`);
        const data = await res.json();
        assert.equal(res.status, 200);
        assert.equal(data.exito, true);
        assert.ok(data.objetos.length >= 1);

        for (const obj of data.objetos) {
            assert.equal(obj.codigo_seguimiento, undefined);
            assert.equal(obj.contacto, undefined);
            assert.equal(obj.ubicacion_fisica, undefined);
        }
    });

    it('5. Login modal de portería valida credenciales (B-21)', async () => {
        const resInvalido = await fetch(`${baseUrl}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: 'porteria_principal', clave: 'clave_erronea' })
        });
        assert.equal(resInvalido.status, 401);

        const resValido = await fetch(`${baseUrl}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: 'porteria_principal', clave: 'admin2026' })
        });
        const data = await resValido.json();
        assert.equal(resValido.status, 200);
        assert.equal(data.exito, true);
        assert.ok(data.token);
        adminToken = data.token;
    });

    it('6. Recepción directa de hallazgo guarda en En Custodia con ubicación física (B-22)', async () => {
        const resSinAuth = await fetch(`${baseUrl}/api/admin/recepcion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                descripcion: 'Termo metálico azul encontrado en sala',
                categoria: 'Otros',
                lugar: 'Bloque B',
                fecha: '2026-11-15',
                ubicacion_fisica: 'Locker B-04'
            })
        });
        assert.equal(resSinAuth.status, 401);

        const resConAuth = await fetch(`${baseUrl}/api/admin/recepcion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': adminToken
            },
            body: JSON.stringify({
                descripcion: 'Termo metálico azul encontrado en sala',
                categoria: 'Otros',
                lugar: 'Bloque B',
                fecha: '2026-11-15',
                ubicacion_fisica: 'Locker B-04'
            })
        });
        const data = await resConAuth.json();
        assert.equal(resConAuth.status, 201);
        assert.equal(data.exito, true);
        assert.equal(data.ubicacion_fisica, 'Locker B-04');
        codigoHallazgoPorteria = data.codigo;
    });

    it('7. Cambio de estado a Entregado retira el objeto del catálogo público', async () => {
        const resPatch = await fetch(`${baseUrl}/api/reportes/${codigoHallazgoPorteria}/estado`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': adminToken
            },
            body: JSON.stringify({ nuevoEstado: 'Entregado' })
        });
        assert.equal(resPatch.status, 200);

        const resCatalogo = await fetch(`${baseUrl}/api/catalogo`);
        const dataCatalogo = await resCatalogo.json();
        const sigueEnCatalogo = dataCatalogo.objetos.some(
            (o) => o.descripcion === 'Termo metálico azul encontrado en sala'
        );
        assert.equal(sigueEnCatalogo, false);
    });
});