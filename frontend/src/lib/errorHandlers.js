/**
 * Global Error Handler Utilities
 * Handles various types of errors gracefully
 */

// Suppress browser extension errors
export const suppressExtensionErrors = () => {
  const originalError = console.error;
  console.error = (...args) => {
    const errorStr = args[0]?.toString() || '';
    
    // Ignore browser extension errors
    if (
      errorStr.includes('Extension context invalidated') ||
      errorStr.includes('content.js') ||
      errorStr.includes('chrome-extension://') ||
      errorStr.includes('moz-extension://')
    ) {
      return; // Silently ignore
    }
    
    // Log other errors normally
    originalError.apply(console, args);
  };
};

// Global error event handler
export const setupGlobalErrorHandlers = () => {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const errorMessage = event.error?.message || event.message || '';
    
    // Ignore extension errors
    if (
      errorMessage.includes('Extension context invalidated') ||
      errorMessage.includes('content.js') ||
      event.filename?.includes('chrome-extension://') ||
      event.filename?.includes('moz-extension://')
    ) {
      event.preventDefault();
      return false;
    }
    
    console.error('Global error:', event.error || event.message);
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason || '';
    
    // Ignore extension errors
    if (
      reason.includes('Extension context invalidated') ||
      reason.includes('content.js')
    ) {
      event.preventDefault();
      return false;
    }
    
    console.error('Unhandled promise rejection:', event.reason);
  });

  // Suppress extension errors
  suppressExtensionErrors();
};

// Safe async wrapper
export const safeAsync = async (fn, fallback = null) => {
  try {
    return await fn();
  } catch (error) {
    console.error('Async error:', error);
    return fallback;
  }
};

// Safe DOM operation wrapper
export const safeDOMOperation = (fn, fallback = null) => {
  try {
    return fn();
  } catch (error) {
    if (
      !error.message?.includes('Extension context invalidated') &&
      !error.message?.includes('content.js')
    ) {
      console.error('DOM operation error:', error);
    }
    return fallback;
  }
};

// Debounce helper
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle helper
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Safe localStorage wrapper
export const safeLocalStorage = {
  getItem: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('localStorage getItem error:', error);
      return defaultValue;
    }
  },
  
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('localStorage setItem error:', error);
      return false;
    }
  },
  
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('localStorage removeItem error:', error);
      return false;
    }
  }
};

// Retry helper for failed operations
export const retryOperation = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`Retry attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

export default {
  setupGlobalErrorHandlers,
  suppressExtensionErrors,
  safeAsync,
  safeDOMOperation,
  debounce,
  throttle,
  safeLocalStorage,
  retryOperation
};
