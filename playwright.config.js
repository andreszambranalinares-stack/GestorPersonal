"use strict";
const { defineConfig, devices } = require("@playwright/test");

// Chromium preinstalado en el entorno (si existe) para no descargar navegadores.
const fs = require("fs");
const PINNED = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = fs.existsSync(PINNED) ? PINNED : undefined;

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "list" : "line",
  use: {
    baseURL: "http://localhost:4173",
    serviceWorkers: "block", // en las pruebas la API mock es del mismo origen; el SW la cachearía
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node tests/serve.js",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
