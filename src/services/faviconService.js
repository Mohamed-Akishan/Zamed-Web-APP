// src/services/faviconService.js

// Update favicon globally
export const updateFavicon = (faviconUrl) => {
  if (!faviconUrl) {
    console.warn('No favicon URL provided');
    return false;
  }
  
  console.log('🔄 Updating favicon...');
  
  // Use window function if available (from index.html)
  if (window.updateFavicon && typeof window.updateFavicon === 'function') {
    window.updateFavicon(faviconUrl);
    return true;
  }
  
  // Fallback method
  try {
    // Update main favicon
    let faviconLink = document.querySelector('link[rel="icon"]');
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      faviconLink.type = 'image/png';
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = faviconUrl;
    
    // Update apple touch icon
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.sizes = '180x180';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = faviconUrl;
    
    console.log('✅ Favicon updated successfully');
    return true;
  } catch (error) {
    console.error('Failed to update favicon:', error);
    return false;
  }
};

// Load favicon from localStorage
export const loadFavicon = () => {
  try {
    const siteInfo = JSON.parse(localStorage.getItem('site_info') || '{}');
    const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
    const favicon = siteInfo.favicon || siteSettings.favicon;
    
    if (favicon && favicon.startsWith('data:image')) {
      console.log('📦 Loading favicon from storage');
      updateFavicon(favicon);
      return true;
    } else if (favicon && (favicon.startsWith('http') || favicon.startsWith('/'))) {
      console.log('📦 Loading favicon from URL:', favicon);
      updateFavicon(favicon);
      return true;
    }
    
    console.log('ℹ️ No custom favicon found, using default');
    return false;
  } catch (error) {
    console.error('Error loading favicon:', error);
    return false;
  }
};

// Save favicon to storage
export const saveFavicon = (faviconData) => {
  try {
    const siteInfo = JSON.parse(localStorage.getItem('site_info') || '{}');
    siteInfo.favicon = faviconData;
    localStorage.setItem('site_info', JSON.stringify(siteInfo));
    
    const siteSettings = JSON.parse(localStorage.getItem('site_settings') || '{}');
    siteSettings.favicon = faviconData;
    localStorage.setItem('site_settings', JSON.stringify(siteSettings));
    
    // Update immediately
    updateFavicon(faviconData);
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('siteInfoUpdated', { detail: { favicon: faviconData } }));
    window.dispatchEvent(new Event('storage'));
    
    console.log('✅ Favicon saved to storage');
    return true;
  } catch (error) {
    console.error('Error saving favicon:', error);
    return false;
  }
};

// Initialize favicon on page load
export const initFavicon = () => {
  console.log('🎯 Initializing favicon service');
  
  // Load favicon immediately
  loadFavicon();
  
  // Listen for storage events (when settings change in another tab)
  window.addEventListener('storage', (e) => {
    if (e.key === 'site_info' || e.key === 'site_settings') {
      console.log('📡 Storage change detected, reloading favicon');
      setTimeout(() => loadFavicon(), 100);
    }
  });
  
  // Listen for custom events
  window.addEventListener('siteInfoUpdated', (event) => {
    console.log('📡 siteInfoUpdated event detected');
    if (event.detail && event.detail.favicon) {
      updateFavicon(event.detail.favicon);
    } else {
      setTimeout(() => loadFavicon(), 100);
    }
  });
  
  window.addEventListener('settingsSaved', () => {
    console.log('📡 settingsSaved event detected');
    setTimeout(() => loadFavicon(), 100);
  });
  
  // Also check after a short delay for dynamic content
  setTimeout(() => {
    loadFavicon();
  }, 500);
};

export default {
  updateFavicon,
  loadFavicon,
  saveFavicon,
  initFavicon
};