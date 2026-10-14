# Contribuir 🤝

Puedes contribuir con **código, ejercicios, ideas o comentarios** sobre
cómo funciona el editor.

Estamos construyendo estas herramientas mientras aprendemos. Intentamos
mantener buenas prácticas **sin convertirlas en una barrera para participar**.

## 💬 Errores e ideas

Antes de abrir una issue, revisa si alguien ya reportó lo mismo.

### Reportar un error

Incluye lo necesario para que otra persona pueda reproducirlo:

- **Contexto:** qué intentabas hacer.
- **Pasos:** cómo llegar al problema.
- **Resultado:** qué esperabas y qué ocurrió.
- **Ejemplo:** una captura, fórmula o archivo, si ayuda a explicarlo.

### Proponer una mejora

Explica **qué problema resolvería y a quién le serviría**.
No necesitas llegar con una solución técnica.

Para cambios grandes, abre primero una issue para acordar el alcance.
Las correcciones pequeñas pueden ir directamente en un Pull Request.

### Aportar ejercicios

Incluye el **enunciado**, la **solución** y la **fuente**, cuando corresponda.
Usa material propio o que tengas permiso para compartir.

## 🛠️ Preparar el proyecto

Los requisitos y comandos de instalación están en el **[README](./README.md)**.

Antes de empezar, comprueba que el proyecto funciona en tu entorno:

```bash
pnpm check
```

## 🌿 Flujo de ramas

Intentamos seguir **[Gitflow](https://nvie.com/posts/a-successful-git-branching-model/)**:
un flujo que separa las versiones publicadas del trabajo en desarrollo.

En este proyecto, **`main` contiene las versiones publicadas** y
**`develop` integra los cambios de la próxima versión**. Cada contribución
se trabaja en una rama propia y se incorpora mediante un Pull Request.

| Rama         | Propósito                                        |
| ------------ | ------------------------------------------------ |
| `main`       | Versiones publicadas                             |
| `develop`    | Integración de la próxima versión                |
| `feat/…`     | Nuevas funcionalidades                           |
| `fix/…`      | Correcciones                                     |
| `refactor/…` | Cambios internos sin modificar el comportamiento |
| `docs/…`     | Documentación                                    |
| `chore/…`    | Configuración y mantenimiento                    |

### Empezar un cambio

Con tu copia del repositorio actualizada y sin cambios pendientes:

```bash
git switch develop
git pull --ff-only
git switch -c feat/nombre-del-cambio
```

Dirige el **Pull Request a `develop`**.

Si contribuyes desde un fork, actualiza tu rama base desde el repositorio
original antes de empezar.

> Las correcciones urgentes de una versión publicada pueden partir de
> `main`. Coordínalas con los mantenedores para incorporarlas también a
> `develop`.

Tomamos Gitflow como una guía. **No necesitas dominar todo el flujo para
hacer tu primera contribución.**

## ✍️ Escribir el cambio

- **Un propósito por PR.** Evita mezclar funcionalidades con limpiezas ajenas.
- **Sigue el código cercano.** Conserva los nombres y convenciones existentes.
- **Prueba el comportamiento.** Agrega pruebas al corregir errores o cambiar reglas.
- **Explica las decisiones.** Usa comentarios para restricciones o motivos que
  el código no deja claros.

### Dónde colocar el código

| Ruta                      | Responsabilidad                        |
| ------------------------- | -------------------------------------- |
| `src/components/`         | Interfaz e interacciones               |
| `src/domain/venn/`        | Modelos y reglas de conjuntos          |
| `src/services/venn/`      | Integraciones con WASM y la plataforma |
| `src/state/`              | Estado, historial y almacenamiento     |
| `src/tests/`              | Pruebas unitarias                      |
| `e2e/`                    | Pruebas de navegador                   |
| `crates/venn-engine/src/` | Motor de expresiones en Rust           |

No hace falta crear una abstracción para cada función ni dividir un archivo
solo porque sea largo. **Separa responsabilidades cuando facilite entender,
modificar o comprobar el código.**

Los directorios `crates/venn-engine/pkg/`, `crates/venn-engine/target/`
y `dist/` contienen archivos generados. **No los edites manualmente ni
los incluyas en el PR.**

## 📝 Mensajes de commit

Usamos **[Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/)**:
una convención que indica el tipo de cambio al comienzo del mensaje.
Ayuda a leer el historial y a generar las versiones automáticamente.

El formato básico es:

```text
tipo: descripción del cambio
```

También puedes indicar la parte del proyecto afectada:

```text
tipo(alcance): descripción del cambio
```

### Tipos habituales

| Tipo       | Cuándo usarlo                                   |
| ---------- | ----------------------------------------------- |
| `feat`     | Agregar una funcionalidad                       |
| `fix`      | Corregir un error                               |
| `refactor` | Mejorar el código sin cambiar su comportamiento |
| `docs`     | Modificar documentación                         |
| `test`     | Agregar o modificar pruebas                     |
| `perf`     | Mejorar el rendimiento                          |
| `build`    | Modificar dependencias o compilación            |
| `ci`       | Modificar la integración continua               |
| `chore`    | Otras tareas de mantenimiento                   |

### Ejemplos

```text
feat: permitir seleccionar varias regiones
fix(canvas): corregir el complemento del universo
refactor: simplificar la consulta de regiones
docs: explicar cómo compilar el motor WASM
test: cubrir fórmulas con conjuntos vacíos
ci: unificar las verificaciones del proyecto
```

Puedes escribir la descripción en **español o inglés**.
Intenta mantener consistencia dentro del cambio.

### Cambios incompatibles

Usa `!` o `BREAKING CHANGE:` cuando el cambio requiera que los usuarios
adapten su uso o migren sus datos.

```text
feat(project)!: cambiar el formato de los archivos de proyecto

BREAKING CHANGE: los archivos anteriores deben migrarse al nuevo formato.
```

Explica en el PR **qué se rompe y cómo migrar**.

## 🧪 Verificar el cambio

Antes de abrir el PR:

```bash
pnpm check
```

Si modificaste la interfaz o un flujo del editor:

- Comprueba el comportamiento en **escritorio y móvil**.
- Revisa el uso con **teclado**.
- Verifica los nombres accesibles de los controles y los mensajes de error.
- Ejecuta las pruebas de navegador.

```bash
pnpm build
pnpm test:e2e
```

_Si no pudiste completar una verificación, indícalo en el PR junto con el motivo._

## 📬 Abrir el Pull Request

Completa la plantilla del repositorio y explica:

- **Qué problema resuelve** y qué cambia.
- **Qué issue está relacionada**, si existe.
- **Cómo lo verificaste**.
- **Cómo se ve**, con capturas cuando haya cambios visuales.

Evita cambios de formato ajenos al propósito del PR.
**Un cambio pequeño y claro es más fácil de revisar.**

## 📦 Versiones y publicaciones

Usamos **[Semantic Versioning](https://semver.org/lang/es/)**:

| Versión   | Tipo de cambio                     |
| --------- | ---------------------------------- |
| **PATCH** | Correcciones compatibles           |
| **MINOR** | Nuevas funcionalidades compatibles |
| **MAJOR** | Cambios incompatibles              |

**[Release Please](https://github.com/googleapis/release-please)**
prepara las publicaciones a partir de los mensajes de commit:
`fix` genera una versión PATCH, `feat` una MINOR y los cambios incompatibles
una MAJOR.

Para una contribución normal, **no cambies la versión de `package.json`
ni edites `CHANGELOG.md` manualmente**. El proceso de release actualiza ambos.
