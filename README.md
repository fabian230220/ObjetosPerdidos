# Sistema de Gestión de Objetos Perdidos

## Segundo incremento — Práctica Aplicada a Sistemas

### 1. Descripción del proyecto

El proyecto **Objetos Perdidos** busca mejorar la gestión de los objetos extraviados dentro del entorno universitario, facilitando el registro de reportes y proporcionando información que permita realizar su seguimiento.

La iniciativa surge de la necesidad de centralizar la información, reducir las consultas dirigidas a dependencias equivocadas y ofrecer un procedimiento más claro para reportar objetos perdidos.

Este desarrollo corresponde al segundo incremento del proyecto, enfocado en fortalecer el proceso de registro mediante validaciones, almacenamiento de información y generación de códigos de seguimiento.

### 2. Objetivo general

Desarrollar una solución informática que facilite el registro y seguimiento de objetos perdidos en el entorno universitario, mejorando la organización de la información y la claridad del procedimiento para los usuarios.

### 3. Funcionalidades implementadas

- **Registro de reportes:** permite registrar información sobre objetos perdidos.
- **Validación de campos:** verifica que los campos obligatorios estén completos y no contengan únicamente espacios.
- **Validación de descripción:** exige una descripción de entre 5 y 300 caracteres.
- **Validación de ubicación:** exige una ubicación de entre 3 y 100 caracteres.
- **Validación de categorías:** restringe la selección a las categorías definidas en el sistema.
- **Validación de fecha:** impide registrar una fecha de pérdida posterior al día actual.
- **Validación de correo institucional:** exige un correo con el dominio `@poligran.edu.co`.
- **Código de seguimiento:** genera un identificador único con el formato `OP-XXXXXX`.
- **Persistencia de datos:** almacena los reportes en una base de datos SQLite.
- **Manejo de errores:** contempla respuestas para datos inválidos y fallos de almacenamiento.
- **Pruebas automatizadas:** permite ejecutar las pruebas mediante el sistema de pruebas integrado de Node.js.

### 4. Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| JavaScript | Lenguaje de programación |
| Node.js | Entorno de ejecución |
| Express 5 | Desarrollo del servidor y la API |
| SQLite | Almacenamiento persistente |
| better-sqlite3 | Conexión y operaciones con la base de datos |
| HTML, CSS y JavaScript | Interfaz web del proyecto |
| Node.js Test Runner | Ejecución de pruebas automatizadas |
| Git y GitHub | Control de versiones y trabajo colaborativo |

### 5. Estructura del proyecto

```text
ObjetosPerdidos/
├── public/          # Archivos de la interfaz web
├── index.js         # Servidor, API y lógica de registro
├── test.js          # Pruebas automatizadas
├── package.json     # Dependencias y comandos
├── package-lock.json
└── .gitignore       # Archivos excluidos del repositorio
```

### 6. Requisitos previos

Antes de ejecutar el proyecto, se necesita:

- Node.js instalado.
- npm, incluido con Node.js.
- Git, si se desea clonar el repositorio.

### 7. Instalación y ejecución

**Paso 1. Clonar el repositorio**

```bash
git clone https://github.com/fabian230220/ObjetosPerdidos.git
```

**Paso 2. Ingresar a la carpeta**

```bash
cd ObjetosPerdidos
```

**Paso 3. Instalar las dependencias**

```bash
npm install
```

**Paso 4. Iniciar el servidor**

```bash
node index.js
```

El servidor se ejecuta en:

http://localhost:3000

La base de datos SQLite se crea cuando se inicializa el servidor, si todavía no existe.

### 8. API de registro de reportes

El sistema dispone del siguiente endpoint para registrar un reporte:

`POST /api/reportes`

**Ejemplo de solicitud JSON:**

```json
{
  "descripcion": "Cuaderno universitario de color azul",
  "categoria": "Útiles académicos",
  "lugar": "Biblioteca principal",
  "fecha": "2026-10-20",
  "contacto": "estudiante@poligran.edu.co"
}
```

**Respuestas principales:**

| Código HTTP | Descripción |
|---|---|
| 201 | Reporte creado correctamente |
| 400 | Error de validación en los datos |
| 500 | Error interno o fallo de almacenamiento |

Cuando el registro es exitoso, la respuesta incluye un mensaje de confirmación y el código de seguimiento generado.

### 9. Modelo de almacenamiento

La información se almacena en la tabla `reportes`, que contempla los siguientes campos:

| Campo | Descripción |
|---|---|
| `id` | Identificador interno del reporte |
| `codigo_seguimiento` | Código único asignado al reporte |
| `descripcion` | Descripción del objeto perdido |
| `categoria` | Tipo de objeto |
| `lugar` | Lugar donde se perdió el objeto |
| `fecha_perdida` | Fecha de pérdida |
| `contacto` | Correo electrónico institucional |
| `fecha_registro` | Fecha y hora de creación del registro |

### 10. Ejecución de las pruebas

Para ejecutar las pruebas automatizadas, utiliza:

```bash
npm test
```

Las pruebas permiten comprobar el comportamiento del sistema frente a diferentes condiciones de registro y validación.

Para simular un fallo de almacenamiento en un entorno de pruebas, se puede establecer la variable de entorno `SIMULAR_FALLO_ALMACENAMIENTO=true` antes de iniciar el servidor.

**Windows — CMD:**

```cmd
set SIMULAR_FALLO_ALMACENAMIENTO=true
node index.js
```

Para desactivar la simulación en la misma ventana:

```cmd
set SIMULAR_FALLO_ALMACENAMIENTO=
```

### 11. Alcance del segundo incremento

Este incremento fortalece el proceso de registro mediante validaciones, generación de códigos de seguimiento, persistencia de datos y manejo de errores.

La documentación se limita a las funcionalidades identificadas en el código disponible. Las funcionalidades adicionales deberán documentarse cuando estén implementadas y verificadas en la rama correspondiente.

### 12. Integrantes del proyecto

- Edgar Fabian Garcia Florez
- Heiner Lambraño Osorio

### 13. Repositorio

Código fuente: https://github.com/fabian230220/ObjetosPerdidos

---

**Proyecto académico — Práctica Aplicada a Sistemas**
