import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  { ignores: ["node_modules/**"] },
  js.configs.recommended,
  {
    // Los archivos de js/ se cargan como scripts clásicos (sin módulos ni build step)
    // y comparten un único scope global en el navegador, tal como en el index.html
    // original de un solo archivo. Cada función/constante de nivel superior es en la
    // práctica una "exportación" usada por otros archivos, así que:
    // - se declaran aquí como globals compartidos para que no-undef no marque falsos positivos
    // - no-unused-vars solo revisa variables locales (dentro de funciones), no las de nivel superior
    files: ["js/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        // compartidos entre archivos (solo lectura)
        $: "readonly",
        DEFAULT_CATEGORIES: "readonly",
        CAT_COLOR: "readonly",
        catColor: "readonly",
        PRIOS: "readonly",
        REPEATS: "readonly",
        THEMES: "readonly",
        WCODE: "readonly",
        closeDrawer: "readonly",
        curMonth: "readonly",
        defaultState: "readonly",
        esc: "readonly",
        exportBackup: "readonly",
        checkBackupReminder: "readonly",
        fetchedMonths: "readonly",
        fetchHistoryForMonth: "readonly",
        initValues: "readonly",
        loadWeather: "readonly",
        money: "readonly",
        moneyShort: "readonly",
        pad: "readonly",
        pomoRender: "readonly",
        renderAll: "readonly",
        renderBalance: "readonly",
        renderCalendar: "readonly",
        renderCatSelects: "readonly",
        renderCategories: "readonly",
        renderChrome: "readonly",
        renderConfig: "readonly",
        renderFinance: "readonly",
        renderFixedExpenses: "readonly",
        renderFocus: "readonly",
        renderGoals: "readonly",
        renderHabits: "readonly",
        renderHome: "readonly",
        renderMonthlySummary: "readonly",
        renderRoutines: "readonly",
        renderTasks: "readonly",
        rolloverTasks: "readonly",
        rolloverFixedExpenses: "readonly",
        startEditTx: "readonly",
        startEditTask: "readonly",
        save: "readonly",
        shiftMonth: "readonly",
        streakOf: "readonly",
        switchView: "readonly",
        toast: "readonly",
        todayStr: "readonly",
        uid: "readonly",
        ymd: "readonly",
        // compartidos entre archivos (reasignados)
        state: "writable",
        stateLoadError: "writable",
        calMonth: "writable",
        finSearch: "writable",
        finFilterCat: "writable",
        finFilterType: "writable",
        editingTx: "writable",
        editingTask: "writable",
      },
    },
    rules: {
      "no-unused-vars": ["error", { vars: "local" }],
      // cada global de la lista de arriba se declara "de verdad" (function/const) en
      // exactamente uno de estos archivos; eso es la declaración real, no una redeclaración
      "no-redeclare": "off",
    },
  },
  {
    files: ["sw.js"],
    languageOptions: {
      sourceType: "script",
      globals: globals.serviceworker,
    },
  },
  {
    files: ["eslint.config.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: globals.node,
    },
  },
  eslintConfigPrettier,
];
