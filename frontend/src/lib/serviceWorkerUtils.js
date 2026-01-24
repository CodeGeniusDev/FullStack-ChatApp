// Clear Service Worker and Cache Utility
// Add this to your app to help debug and clear issues

export const clearServiceWorkerCache = async () => {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Service Worker unregistered');
      }
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }

    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    console.log('Storage cleared');

    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    console.log('Cookies cleared');

    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

// Function to check if there are service worker issues
export const diagnoseServiceWorker = async () => {
  const issues = [];

  if (!('serviceWorker' in navigator)) {
    issues.push('Service Worker not supported in this browser');
    return issues;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    if (registrations.length === 0) {
      issues.push('No service worker registered');
    } else {
      registrations.forEach((registration, index) => {
        console.log(`Service Worker ${index + 1}:`, {
          scope: registration.scope,
          active: !!registration.active,
          installing: !!registration.installing,
          waiting: !!registration.waiting,
        });
      });
    }

    // Check caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('Active caches:', cacheNames);
    }
  } catch (error) {
    issues.push(`Error diagnosing: ${error.message}`);
  }

  return issues;
};

// Auto-clear on module load errors (development only)
if (import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('Failed to fetch')) {
      console.warn('Module load error detected, consider clearing cache');
    }
  });
}
