"use strict";

// ---------- Configuración de la copia en la nube (Supabase) ----------
// Rellena estos dos valores con los de TU proyecto de Supabase
// (Project Settings → API). Ambos son PÚBLICOS y es seguro publicarlos:
// la seguridad real la dan las políticas RLS de la base de datos y el
// enlace mágico de acceso, no el ocultar estas claves.
//
// Si los dejas vacíos, la app funciona 100% en local igual que siempre
// y la sección "Copia en la nube" ni siquiera aparece.
//
// Guía paso a paso para crear el proyecto: docs/CLOUD_SETUP.md
const SUPABASE_URL = ""; // p. ej. "https://abcdxyz.supabase.co"
const SUPABASE_ANON_KEY = ""; // la clave "anon public" del proyecto
