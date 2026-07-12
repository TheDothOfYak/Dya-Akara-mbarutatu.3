(function () {
  'use strict';
  window.DYA_CONFIG = window.DYA_CONFIG || {};
  window.DYA_CONFIG.supabase = Object.assign({
    /* Paste your Supabase project's values here to switch the game online
       for EVERYONE who loads this deployment (Settings → API in the
       Supabase dashboard):
         url:     'https://YOURPROJECT.supabase.co'
         anonKey: 'eyJ…'   (the "anon public" key — never the service key)
       Alternatively, each player can paste them in-game:
       Friends → "Set up online play" (stored in that browser only). */
    url: 'https://pfqokjuztareqjdxaaiw.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcW9ranV6dGFyZXFqZHhhYWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MTI0NDAsImV4cCI6MjA5OTI4ODQ0MH0.yn30h1YFtzETZoQ7Miqh7zZ9lio4NiRt3qYna6YP180',
    /* useAuth: when true, login goes through Supabase email/password
       accounts instead of this device's local accounts. Leave false —
       online friends & matches work fine with local accounts. */
    useAuth: false,
  }, window.DYA_CONFIG.supabase || {});
  window.DYA_CONFIG.firebase = Object.assign({
    projectId: 'dya-akara',
  }, window.DYA_CONFIG.firebase || {});
  window.DYA_CONFIG.storage = window.DYA_CONFIG.storage || 'local';

  /* per-browser override, set from the in-game "Set up online play" panel —
     lets players go online (or point at their own project) without editing
     files or redeploying. An explicitly-saved override wins over the baked-in
     default so the player's choice actually persists across reloads. */
  try {
    const saved = JSON.parse(localStorage.getItem('dyaakara_online_cfg') || 'null');
    if (saved && saved.url && saved.anonKey) {
      window.DYA_CONFIG.supabase.url = saved.url;
      window.DYA_CONFIG.supabase.anonKey = saved.anonKey;
    }
  } catch (e) { /* ignore malformed overrides */ }
})();
