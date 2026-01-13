/**
 * Language Loader - Auto initializes language selector on all pages
 * This file should be loaded AFTER translations.js
 */
(function() {
    'use strict';
    
    function initLanguageSelector() {
        // Check if langManager exists (from translations.js)
        if (typeof langManager === 'undefined') {
            console.warn('⚠️ Language manager not loaded');
            return;
        }
        
        // Don't create duplicate selectors
        if (document.getElementById('rs-lang-selector')) {
            return;
        }
        
        // Create container
        const container = document.createElement('div');
        container.id = 'rs-lang-selector';
        
        // Position based on page type
        const isAdmin = document.body.classList.contains('admin-page') || 
                       window.location.pathname.includes('admin') ||
                       window.location.pathname.includes('kkk-999');
        
        container.style.cssText = `
            position: fixed;
            top: 15px;
            ${isAdmin ? 'left: 15px;' : 'left: 15px;'}
            z-index: 99999;
        `;
        
        document.body.appendChild(container);
        
        // Create the selector UI
        langManager.createSelector('rs-lang-selector');
        
        // Apply saved language direction
        const dir = langManager.currentLang === 'en' ? 'ltr' : 'rtl';
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', langManager.currentLang);
        
        // Update all translatable elements
        langManager.updatePage();
        
        console.log('✅ Language selector initialized:', langManager.currentLang);
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLanguageSelector);
    } else {
        // DOM already loaded, run after a small delay to ensure translations.js is loaded
        setTimeout(initLanguageSelector, 100);
    }
})();
