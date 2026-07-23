# 📊 Panel Personal

Tu centro de mando diario: **finanzas, tareas, hábitos, calendario y clima** en una sola
app. Mobile-first, instalable como PWA y **100% privada** — tus datos viven solo en tu
navegador (`localStorage`), no hay servidor ni cuentas.

## ✨ Funciones

- **💰 Finanzas Pro** — gastos e ingresos, saldo neto del mes, gráfico por categoría,
  resumen de los últimos 6 meses, **presupuesto mensual con alerta** y **metas de ahorro**.
- **✅ Tareas** — prioridades, tareas que se arrastran al día siguiente, **tareas recurrentes**
  y **temporizador Pomodoro** con aviso.
- **🔥 Hábitos** — seguimiento diario con **racha** y vista de la semana.
- **📅 Calendario** — toca un día para ver gastos, tareas, hábitos y el **clima** de esa fecha.
- **🌤️ Clima en vivo** vía [Open-Meteo](https://open-meteo.com) (sin API key).
- **📱 App instalable** (PWA) que funciona **offline**.
- **💾 Respaldo** — exportar/importar en JSON y exportar gastos a CSV.

## 🚀 Uso

Abre `index.html` en tu navegador, o publícalo con **GitHub Pages**:

1. Sube estos archivos al repositorio.
2. **Settings → Pages** → _Branch_: `main` / carpeta `/ (root)`.
3. Entra a `https://TU-USUARIO.github.io/TU-REPO/` y, en el móvil, usa
   _Añadir a pantalla de inicio_ para instalarla.

## 🗂️ Estructura

| Archivo                | Qué es                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.html`           | Estructura HTML de la app (sin dependencias)                                                                                                                                                                                   |
| `css/style.css`        | Estilos de la app                                                                                                                                                                                                              |
| `js/*.js`              | Lógica de la app, dividida por sección (estado, finanzas, tareas, hábitos, calendario, clima, respaldo, pomodoro, etc.). Se cargan como scripts clásicos (sin build step) para que la app siga abriendo directo con `file://`. |
| `manifest.webmanifest` | Metadatos de la PWA                                                                                                                                                                                                            |
| `sw.js`                | Service worker (cache offline)                                                                                                                                                                                                 |
| `icon.svg`             | Ícono de la app                                                                                                                                                                                                                |

## 🔒 Privacidad

Todo se guarda localmente en tu dispositivo. Los datos **no se sincronizan** entre equipos;
usa Exportar/Importar para moverlos. Lo único que sale a internet es la consulta del clima.
