// Enhanced notification manager with PWA support and rich notifications

// Format time for notifications (e.g., "2 min ago", "Just now")
const formatNotificationTime = (timestamp) => {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now - messageTime) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  
  // Format as time for same day, date for older
  return messageTime.toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  // Check if already granted
  if (Notification.permission === "granted") {
    return true;
  }

  // Don't ask if denied
  if (Notification.permission === "denied") {
    return false;
  }

  // Request permission
  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

// Show notification with vibration, sound, and enhanced preview
export const showNotification = (title, options = {}) => {
  if (Notification.permission !== "granted") {
    return null;
  }

  // Vibrate on mobile (if supported)
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }

  // Format timestamp for notification
  const timeText = options.timestamp 
    ? formatNotificationTime(options.timestamp)
    : formatNotificationTime(new Date());

  // Truncate body for preview
  const body = options.body || "";
  const maxBodyLength = 100;
  const truncatedBody = body.length > maxBodyLength 
    ? body.substring(0, maxBodyLength) + "..." 
    : body;

  // Enhanced body with timestamp
  const enhancedBody = `${truncatedBody}\n${timeText}`;

  const defaultOptions = {
    icon: options.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    body: enhancedBody,
    tag: options.tag || "chat-notification",
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    timestamp: options.timestamp || Date.now(),
    data: {
      url: options.url || "/",
      messageId: options.messageId,
      senderId: options.senderId,
      ...options.data,
    },
    actions: [
      {
        action: "open",
        title: "Open",
        icon: "/icons/icon-96x96.png",
      },
      {
        action: "close",
        title: "Dismiss",
        icon: "/icons/icon-96x96.png",
      },
    ],
    ...options,
  };

  try {
    // Try to show notification via service worker first (better for PWA)
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      return navigator.serviceWorker.ready.then((registration) => {
        return registration.showNotification(title, defaultOptions);
      });
    } else {
      // Fallback to regular notification
      const notification = new Notification(title, defaultOptions);

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.onClick) {
          options.onClick();
        }
      };

      // Auto close after 8 seconds
      setTimeout(() => notification.close(), 8000);

      return notification;
    }
  } catch (error) {
    console.error("Error showing notification:", error);
    return null;
  }
};

// Play notification sound
export const playNotificationSound = () => {
  try {
    // Use a simple beep sound or data URL for cross-platform compatibility
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log("Notification sound not available:", error);
  }
};

// Check if notifications are supported
export const areNotificationsSupported = () => {
  return "Notification" in window;
};

// Check if push notifications are supported
export const arePushNotificationsSupported = () => {
  return "serviceWorker" in navigator && "PushManager" in window;
};

// Subscribe to push notifications (for future implementation)
export const subscribeToPushNotifications = async () => {
  if (!arePushNotificationsSupported()) {
    console.log("Push notifications not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push notifications
      // Note: You'll need a VAPID public key from your backend
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: null, // Add your VAPID public key here
      });
    }

    return subscription;
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async () => {
  if (!arePushNotificationsSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error);
    return false;
  }
};

// Check if app is installed (running as PWA)
export const isAppInstalled = () => {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
};

// Check if running on mobile
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// Get battery status (for notification optimization)
export const getBatteryStatus = async () => {
  if ("getBattery" in navigator) {
    try {
      const battery = await navigator.getBattery();
      return {
        level: battery.level,
        charging: battery.charging,
      };
    } catch (error) {
      console.error("Error getting battery status:", error);
      return null;
    }
  }
  return null;
};

// Request persistent storage (for PWA)
export const requestPersistentStorage = async () => {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Persistent storage ${isPersisted ? "granted" : "denied"}`);
    return isPersisted;
  }
  return false;
};
