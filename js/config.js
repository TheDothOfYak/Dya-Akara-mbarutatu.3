(function () {
  'use strict';
  window.DYA_CONFIG = window.DYA_CONFIG || {};
  window.DYA_CONFIG.supabase = Object.assign({
    url: '',
    anonKey: '',
  }, window.DYA_CONFIG.supabase || {});
  window.DYA_CONFIG.firebase = Object.assign({
    projectId: 'dya-akara',
  }, window.DYA_CONFIG.firebase || {});
  window.DYA_CONFIG.storage = window.DYA_CONFIG.storage || 'local';
})();
