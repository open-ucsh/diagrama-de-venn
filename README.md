# Diagrama de venn ✨

Un editor visual para crear y explorar diagramas de Venn.

## 🎓 ¿Para qué sirve?

Creado para estudiantes y por estudiantes de Logica y Razonamiento Matemático que están aprendiendo teoría de conjuntos, lógica y razonamiento matemático.

Permite representar conjuntos, elementos y sus relaciones de forma visual para entender mejor operaciones como la unión, intersección, diferencia y complemento.

## 🚀 Objetivo

Construye diagramas claros, organiza sus elementos y descubre qué representa cada región.

> Primero comprende los conjuntos. Después resuelve el problema.
> ![Venn Designer](https://raw.githubusercontent.com/open-ucsh/.github/main/assets/banner.jpeg)

## Versionado y releases

El proyecto usa [Semantic Versioning](https://semver.org/lang/es/):

- **MAJOR**: cambios incompatibles que requieren migración.
- **MINOR**: funcionalidad compatible con versiones anteriores.
- **PATCH**: correcciones compatibles.

Los cambios visibles para usuarios se registran en
[`CHANGELOG.md`](./CHANGELOG.md). Cada release debe tener una sección
para la versión publicada; los cambios incompatibles se documentan en
`### Breaking Changes` junto con sus pasos de migración.

### Flujo automático de publicación

El proyecto usa [Release Please](https://github.com/googleapis/release-please)
para convertir los commits [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/)
en releases:

1. Los commits `fix:` generan versiones **PATCH** y `feat:` versiones
   **MINOR**.
2. Los commits con `!` o `BREAKING CHANGE:` generan versiones **MAJOR** y
   deben incluir instrucciones de migración.
3. Release Please abre un Pull Request con la versión y el changelog
   actualizados.
4. Al hacer merge del Pull Request, crea el tag y el GitHub Release
   automáticamente.

La primera versión estable se configuró como `1.0.0`; hasta que se fusione el
primer Pull Request de release, `package.json` puede permanecer en `0.0.0`.
