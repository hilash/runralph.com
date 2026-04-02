/**
 * Ralph i18n Engine
 * Loads JSON translation files, swaps text via data-i18n attributes,
 * handles RTL, persists language choice in localStorage.
 */
(function () {
  'use strict';

  var SUPPORTED = ['en', 'he'];
  var DEFAULT_LANG = 'en';
  var STORAGE_KEY = 'ralph-lang';
  var cache = {};

  /** Resolve a dot-notated key like "hero.title" from a nested object */
  function resolve(obj, key) {
    return key.split('.').reduce(function (o, k) {
      return o && o[k] !== undefined ? o[k] : null;
    }, obj);
  }

  /** Detect preferred language from browser language list */
  function detectLang() {
    // Check all preferred languages (e.g. ["he-IL", "he", "en-US"])
    var langs = navigator.languages || [];
    for (var i = 0; i < langs.length; i++) {
      var short = langs[i].split('-')[0];
      if (SUPPORTED.indexOf(short) !== -1) return short;
    }
    // Fallback to primary language
    var nav = navigator.language || navigator.userLanguage || '';
    var primary = nav.split('-')[0];
    if (SUPPORTED.indexOf(primary) !== -1) return primary;
    return DEFAULT_LANG;
  }

  /** Get the currently selected language */
  function getCurrentLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) { /* localStorage unavailable */ }
    return detectLang();
  }

  /** Load a translation JSON file, with caching */
  function loadTranslations(lang) {
    if (cache[lang]) return Promise.resolve(cache[lang]);
    if (lang === 'en') {
      // English is baked into the HTML; still load JSON for completeness
      return fetch('locales/en.json')
        .then(function (r) { return r.json(); })
        .then(function (data) { cache[lang] = data; return data; })
        .catch(function () { cache[lang] = {}; return {}; });
    }
    return fetch('locales/' + lang + '.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { cache[lang] = data; return data; })
      .catch(function () { cache[lang] = {}; return {}; });
  }

  /** Apply translations to all tagged elements */
  function applyTranslations(lang, translations) {
    // Set document direction and language
    var dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);

    // For English, restore original text from data attributes
    var elements = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var key = el.getAttribute('data-i18n');
      var isHtml = el.hasAttribute('data-i18n-html');
      var attr = el.getAttribute('data-i18n-attr');

      if (lang === 'en') {
        // Restore original English text stored in data-i18n-original
        var original = el.getAttribute('data-i18n-original');
        if (original !== null) {
          if (attr) {
            el.setAttribute(attr, original);
          } else if (isHtml) {
            el.innerHTML = original;
          } else {
            el.textContent = original;
          }
        }
        continue;
      }

      var value = resolve(translations, key);
      if (value === null) continue;

      // Store original text on first translation
      if (!el.hasAttribute('data-i18n-original')) {
        if (attr) {
          el.setAttribute('data-i18n-original', el.getAttribute(attr) || '');
        } else if (isHtml) {
          el.setAttribute('data-i18n-original', el.innerHTML);
        } else {
          el.setAttribute('data-i18n-original', el.textContent);
        }
      }

      if (attr) {
        el.setAttribute(attr, value);
      } else if (isHtml) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    }

    // Update language switcher buttons
    var switchers = document.querySelectorAll('[data-lang-switcher]');
    for (var j = 0; j < switchers.length; j++) {
      switchers[j].textContent = lang === 'he' ? 'English' : 'עברית';
    }
  }

  /** Switch to a language */
  function setLanguage(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* noop */ }

    if (lang === 'en') {
      applyTranslations('en', {});
      return Promise.resolve();
    }

    return loadTranslations(lang).then(function (data) {
      applyTranslations(lang, data);
    });
  }

  /** Toggle between en and he */
  function toggleLanguage() {
    var current = getCurrentLang();
    var next = current === 'he' ? 'en' : 'he';
    return setLanguage(next);
  }

  // Expose API
  window.i18n = {
    setLanguage: setLanguage,
    toggleLanguage: toggleLanguage,
    getCurrentLang: getCurrentLang
  };

  // Auto-initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    var lang = getCurrentLang();
    setLanguage(lang);
  });
})();
