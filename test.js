const test = require('node:test');
const assert = require('node:assert');

// 1. Prueba unitaria del generador de código
function generarCodigoUnico() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = 'OP-';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

test('CP-10 / CA-6: Generador debe crear un código con formato OP-XXXXXX (9 caracteres totales)', () => {
    const codigo = generarCodigoUnico();
    assert.strictEqual(codigo.startsWith('OP-'), true);
    assert.strictEqual(codigo.length, 9);
});

test('CA-6: Generación masiva no debe generar duplicados fácilmente', () => {
    const codigos = new Set();
    for (let i = 0; i < 50; i++) {
        codigos.add(generarCodigoUnico());
    }
    assert.strictEqual(codigos.size, 50);
});

// 2. Pruebas de validación de correo institucional
const emailRegex = /^[a-zA-Z0-9._%+-]+@poligran\.edu\.co$/;

test('CA-2: Correo institucional válido debe ser aceptado', () => {
    assert.strictEqual(emailRegex.test('estudiante@poligran.edu.co'), true);
});

test('CA-2: Correo no institucional (gmail, hotmail) debe ser rechazado', () => {
    assert.strictEqual(emailRegex.test('estudiante@gmail.com'), false);
    assert.strictEqual(emailRegex.test('usuario@poligran.com'), false);
});