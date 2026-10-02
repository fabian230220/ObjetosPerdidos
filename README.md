# Objetos Perdidos

Aplicación web para el registro y seguimiento de objetos perdidos dentro del entorno universitario.

## Descripción

**Objetos Perdidos** es un proyecto académico desarrollado para facilitar el registro organizado de objetos perdidos dentro de un entorno universitario.

La aplicación permite registrar información básica del objeto perdido, generar un código único de seguimiento y almacenar el reporte en una base de datos local. El sistema incorpora validaciones para reducir errores en los datos registrados y garantizar que la información cumpla con las reglas definidas para el proyecto.

El proyecto busca ofrecer una alternativa más organizada frente al manejo informal de reportes de objetos perdidos.

## Funcionalidades

Actualmente, el sistema permite:

* Registrar un reporte de objeto perdido.
* Registrar la descripción del objeto.
* Seleccionar una categoría.
* Registrar el lugar donde se perdió.
* Registrar la fecha de pérdida.
* Registrar un correo institucional de contacto.
* Validar que los campos obligatorios estén completos.
* Validar que algunos campos respeten límites de longitud.
* Validar que la categoría seleccionada pertenezca al conjunto permitido.
* Validar que la fecha registrada no sea posterior al día actual.
* Validar que el correo de contacto pertenezca al dominio `@poligran.edu.co`.
* Generar un código único de seguimiento con el formato `OP-XXXXXX`.
* Almacenar los reportes en una base de datos SQLite.
* Devolver un código de seguimiento cuando el registro se crea correctamente.
* Manejar errores de almacenamiento mediante respuestas controladas de la API.
* Ejecutar pruebas automatizadas sobre algunas de las validaciones principales.

## Categorías disponibles

El sistema actualmente contempla las siguientes categorías:

* Electrónicos
* Documentos
* Llaves
* Ropa y accesorios
* Útiles académicos
* Otros

## Tecnologías utilizadas

* **Node.js**
* **Express.js 5**
* **SQLite**
* **better-sqlite3**
* **HTML**
* **CSS**
* **JavaScript**
* **Node.js Test Runner**

## Estructura del proyecto

```text
ObjetosPerdidos/
│
├── public/
│   └── Archivos de la interfaz web
│
├── index.js
├── test.js
├── package.json
├── package-lock.json
├── .gitignore
└── objetos_perdidos.db
```

> La base de datos SQLite se genera localmente cuando se ejecuta la aplicación y los archivos `.db` están excluidos del control de versiones mediante `.gitignore`.

## Requisitos

Para ejecutar el proyecto se necesita tener instalado:

* Node.js
* npm

Puedes comprobar la instalación con:

```bash
node --version
npm --version
```

## Instalación

1. Clonar el repositorio:

```bash
git clone https://github.com/fabian230220/ObjetosPerdidos.git
```

2. Entrar al directorio del proyecto:

```bash
cd ObjetosPerdidos
```

3. Instalar las dependencias:

```bash
npm install
```

## Ejecución

El proyecto utiliza un servidor Express configurado para ejecutarse en el puerto `3000`.

Ejecuta:

```bash
node index.js
```

Cuando el servidor se encuentre activo, abre en el navegador:

```text
http://localhost:3000
```

La aplicación sirve los archivos de la interfaz ubicados en la carpeta `public`.

## Base de datos

El sistema utiliza **SQLite** mediante la dependencia `better-sqlite3`.

La base de datos se inicializa automáticamente al ejecutar la aplicación.

La tabla principal utilizada por el sistema es:

```text
reportes
```

Sus principales campos son:

| Campo                | Descripción                           |
| -------------------- | ------------------------------------- |
| `id`                 | Identificador del reporte             |
| `codigo_seguimiento` | Código único generado para el reporte |
| `descripcion`        | Descripción del objeto perdido        |
| `categoria`          | Categoría del objeto                  |
| `lugar`              | Lugar donde se perdió                 |
| `fecha_perdida`      | Fecha registrada de pérdida           |
| `contacto`           | Correo institucional del usuario      |
| `fecha_registro`     | Fecha y hora de creación del reporte  |

## API

La aplicación cuenta actualmente con el siguiente endpoint principal:

### Crear reporte

```http
POST /api/reportes
```

Ejemplo de solicitud:

```json
{
  "descripcion": "Cuaderno universitario de color negro",
  "categoria": "Útiles académicos",
  "lugar": "Bloque A",
  "fecha": "2026-09-30",
  "contacto": "estudiante@poligran.edu.co"
}
```

### Respuesta exitosa

Cuando el reporte se crea correctamente, la API responde con código HTTP `201` y devuelve un código de seguimiento.

Ejemplo:

```json
{
  "exito": true,
  "mensaje": "Reporte creado exitosamente",
  "codigo": "OP-W5RSRW"
}
```

El código generado tiene el formato:

```text
OP-XXXXXX
```

## Validaciones

El endpoint de registro incorpora diferentes reglas de validación:

### Campos obligatorios

Se verifica que los campos requeridos estén presentes y que los campos de texto no estén compuestos únicamente por espacios.

### Descripción

La descripción debe tener entre **5 y 300 caracteres**.

### Lugar

El lugar debe tener entre **3 y 100 caracteres**.

### Categoría

La categoría debe pertenecer a las opciones definidas por el sistema.

### Fecha

La fecha debe ser válida y no puede ser posterior al día actual.

### Correo institucional

El correo de contacto debe pertenecer al dominio institucional:

```text
@poligran.edu.co
```

Por ejemplo:

```text
estudiante@poligran.edu.co
```

Los correos de otros dominios, como Gmail o Hotmail, son rechazados por esta validación.

## Manejo de errores

La API utiliza diferentes códigos HTTP dependiendo del resultado de la operación.

| Código | Situación                                      |
| ------ | ---------------------------------------------- |
| `201`  | Reporte creado correctamente                   |
| `400`  | Datos enviados que no cumplen las validaciones |
| `500`  | Error controlado o interno del servidor        |

El proyecto también contempla una variable de entorno para simular un fallo de almacenamiento:

```text
SIMULAR_FALLO_ALMACENAMIENTO=true
```

Cuando esta variable está activa, la API devuelve un error controlado indicando que la base de datos no está disponible.

## Pruebas

El proyecto utiliza el sistema de pruebas integrado de Node.js.

Para ejecutar las pruebas:

```bash
npm test
```

El script configurado actualmente en `package.json` es:

```json
"test": "node --test"
```

Las pruebas disponibles actualmente verifican, entre otros aspectos:

* Formato del código de seguimiento.
* Longitud del código generado.
* Generación de múltiples códigos.
* Ausencia de duplicados en una generación de prueba.
* Validación de correos institucionales.
* Rechazo de correos pertenecientes a otros dominios.

## Generación del código de seguimiento

Los códigos utilizan el prefijo:

```text
OP-
```

seguido de seis caracteres alfanuméricos.

Ejemplo:

```text
OP-W5RSRW
```

El sistema utiliza un conjunto de caracteres que evita determinadas letras y utiliza números y letras mayúsculas para facilitar la lectura del código.

Además, la base de datos establece `codigo_seguimiento` como un campo único.

## Configuración para simular errores

Para probar el comportamiento del sistema ante un fallo de almacenamiento, se puede establecer la variable:

### Windows PowerShell

```powershell
$env:SIMULAR_FALLO_ALMACENAMIENTO="true"
node index.js
```

### Windows CMD

```cmd
set SIMULAR_FALLO_ALMACENAMIENTO=true
node index.js
```

Para volver al funcionamiento normal, inicia nuevamente el servidor sin establecer esta variable.

## Control de versiones

El proyecto utiliza Git y GitHub para el almacenamiento del código fuente.

Repositorio:

https://github.com/fabian230220/ObjetosPerdidos

Actualmente, el repositorio contiene la rama principal `main`.

## Estado del proyecto

El proyecto se encuentra en desarrollo como parte de un proyecto académico orientado al análisis y mejora de la gestión de objetos perdidos en el entorno universitario.

La versión actual se concentra principalmente en:

* Registro de objetos perdidos.
* Validación de información.
* Generación de códigos de seguimiento.
* Persistencia local mediante SQLite.
* Pruebas automatizadas de funcionalidades específicas.

Las funcionalidades adicionales pueden incorporarse en futuras iteraciones de acuerdo con el backlog y la planeación del proyecto.

## Autores

Proyecto académico desarrollado por:

* Edgar Fabian Garcia Florez
* Heiner Lambraño Osorio

## Licencia

Este proyecto fue desarrollado con fines académicos.
