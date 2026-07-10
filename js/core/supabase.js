(function () {
  'use strict';
  const cfg = window.DYA_CONFIG && window.DYA_CONFIG.supabase || {};
  const enabled = !!(cfg.url && cfg.anonKey);

  function makeClient() {
    if (!enabled) return null;
    return {
      async signUp({ email, password, options }) {
        const res = await fetch(cfg.url + '/auth/v1/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': cfg.anonKey,
            'Authorization': 'Bearer ' + cfg.anonKey,
          },
          body: JSON.stringify({ email, password, options })
        });
        return res.json();
      },
      async signIn({ email, password }) {
        const res = await fetch(cfg.url + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': cfg.anonKey,
            'Authorization': 'Bearer ' + cfg.anonKey,
          },
          body: JSON.stringify({ email, password })
        });
        return res.json();
      },
      async getUser(accessToken) {
        const res = await fetch(cfg.url + '/auth/v1/user', {
          method: 'GET',
          headers: {
            'apikey': cfg.anonKey,
            'Authorization': 'Bearer ' + accessToken,
          }
        });
        return res.json();
      },
    };
  }

  window.DYA_SUPABASE = {
    enabled,
    client: makeClient(),
  };
})();
