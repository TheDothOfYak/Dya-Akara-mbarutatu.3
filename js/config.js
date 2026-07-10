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
    url: '',
    anonKey: '',
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
     lets players go online without editing files or redeploying */
  try {
    const saved = JSON.parse(localStorage.getItem('dyaakara_online_cfg') || 'null');
    if (saved && saved.url && saved.anonKey && !window.DYA_CONFIG.supabase.url) {
      window.DYA_CONFIG.supabase.url = saved.url;
      window.DYA_CONFIG.supabase.anonKey = saved.anonKey;
    }
  } catch (e) { /* ignore malformed overrides */ }
})();
