# Diagrama de Venn ✨

Creamos este editor para quienes están aprendiendo **teoría de conjuntos**,
especialmente los estudiantes de **Lógica y Razonamiento Matemático en la UCSH**.

La idea nació en clases: dibujar círculos a mano una y otra vez en el
cuaderno se volvía tedioso. Queríamos dedicar más tiempo a **entender los
conjuntos** y menos a volver a dibujarlos.

Aquí puedes crear diagramas, seleccionar regiones y explorar las fórmulas
que las representan.

> _Primero comprende los conjuntos. Después resuelve el problema._

### 🌐 [Abrir el editor](https://ucsh-modelador.vercel.app/)

![Editor de diagramas de Venn](https://raw.githubusercontent.com/open-ucsh/.github/main/assets/banner.jpeg)

## 🧭 Cómo usarlo

1. **Crea tus conjuntos** y ajusta sus nombres.
2. **Selecciona regiones** del diagrama para obtener una fórmula.
3. **Escribe una fórmula** para ver las regiones que representa en tiempo real.

Puedes explorar el diagrama desde la selección visual o desde la expresión.
La idea es que ambas te ayuden a entender el mismo problema.

## 🛠️ Desarrollo local

Necesitas **Node.js 24**, **pnpm 11.5.1**, **Bash** y **curl**.
El script de preparación instala Rust y wasm-pack en las versiones del proyecto.

### Preparar e iniciar

Desde la raíz del repositorio:

```bash
pnpm install --frozen-lockfile
bash scripts/setup-rust.sh
pnpm wasm:build
pnpm dev
```

> **Importante:** compila WASM antes del primer inicio y después de modificar
> el motor Rust con `pnpm wasm:build`.

### Verificar el proyecto

Este comando revisa **formato, tipos, lint, pruebas y compilación**:

```bash
pnpm check
```

Para ejecutar las pruebas de navegador, instala Chromium la primera vez
y genera una compilación de producción:

```bash
pnpm exec playwright install chromium
pnpm build
pnpm test:e2e
```

Playwright inicia el servidor de vista previa automáticamente.

## 🤝 Contribuir

Puedes ayudar **reportando errores**, **proponiendo ideas**, **mejorando la
interfaz**, **aportando ejercicios** o **escribiendo código**.

Si algo resulta confuso al usar el editor, también nos sirve saberlo.
Queremos que sea útil para estudiantes, profesores y cualquier persona
que esté empezando.

**[Lee cómo contribuir →](./CONTRIBUTING.md)**

## 🎓 Open UCSH

Este proyecto forma parte de **[Open UCSH](https://github.com/open-ucsh)**,
una iniciativa que está naciendo desde estudiantes de la
**Universidad Católica Silva Henríquez**.

Queremos compartir lo que aprendemos, construir herramientas útiles y
conectar con otras personas a través de nuestros proyectos.
**No necesitas estudiar en la UCSH para participar.**

_Por ahora, la iniciativa no cuenta con respaldo institucional formal de
la universidad._

## 📄 Licencia

Este proyecto se distribuye bajo la **[licencia MIT](./LICENSE)**.
