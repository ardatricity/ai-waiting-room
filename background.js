/**
 * AI Studio Waiting Room - Background Service Worker
 * Monitors AI Studio requests and switches to distraction content during generation
 */

// Configuration
const CONFIG = {
  TARGET_URL_PART: 'GenerateContent',
  SWITCH_DELAY_MS: 500,
  DEBUG: false,
};

// Platform configurations
const PLATFORMS = {
  youtube: {
    urlPattern: 'youtube.com/shorts',
    fullUrl: 'https://www.youtube.com/shorts',
  },
  instagram: {
    urlPattern: 'instagram.com/reels',
    fullUrl: 'https://www.instagram.com/reels/',
  },
  tiktok: {
    urlPattern: 'tiktok.com',
    fullUrl: 'https://www.tiktok.com/',
  },
};

// State
let state = {
  originalTabId: null,
  settings: {
    enabled: true,
    platform: 'youtube',
  },
};

/**
 * Debug logger
 */
function log(message, ...args) {
  if (CONFIG.DEBUG) {
    console.log(`[AI Waiting Room] ${message}`, ...args);
  }
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['enabled', 'platform']);
    if (result.enabled !== undefined) state.settings.enabled = result.enabled;
    if (result.platform !== undefined) state.settings.platform = result.platform;
    log('Settings loaded:', state.settings);
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Get current platform configuration
 */
function getPlatformConfig() {
  return PLATFORMS[state.settings.platform] || PLATFORMS.youtube;
}

/**
 * Find existing tab for a platform
 */
async function findExistingTab(urlPattern) {
  try {
    const tabs = await chrome.tabs.query({});
    return tabs.find(tab => tab.url?.includes(urlPattern));
  } catch (error) {
    console.error('Failed to query tabs:', error);
    return null;
  }
}

/**
 * Switch to distraction platform
 */
async function switchToDistraction() {
  const config = getPlatformConfig();
  log(`Switching to ${state.settings.platform}...`);

  try {
    const existingTab = await findExistingTab(config.urlPattern);

    if (existingTab) {
      await chrome.tabs.update(existingTab.id, { active: true });
      log('Activated existing tab:', existingTab.id);
    } else {
      await chrome.tabs.create({ url: config.fullUrl, active: true });
      log('Created new tab');
    }
  } catch (error) {
    console.error('Failed to switch tabs:', error);
  }
}

/**
 * Pause videos in distraction tab
 */
async function pauseDistraction() {
  const config = getPlatformConfig();

  try {
    const distractionTab = await findExistingTab(config.urlPattern);

    if (distractionTab) {
      await chrome.scripting.executeScript({
        target: { tabId: distractionTab.id },
        func: () => {
          document.querySelectorAll('video').forEach(video => video.pause());
        },
      });
      log('Paused videos in distraction tab');
    }
  } catch (error) {
    // Silently fail - tab might be closed or not accessible
    log('Could not pause videos:', error.message);
  }
}

/**
 * Return to AI Studio tab
 */
async function returnToAIStudio() {
  if (!state.originalTabId) return;

  try {
    await chrome.tabs.update(state.originalTabId, { active: true });
    log('Returned to AI Studio tab:', state.originalTabId);
  } catch (error) {
    // Original tab might be closed
    log('Could not return to original tab:', error.message);
  }
}

/**
 * Handle AI generation start
 */
function handleGenerationStart(details) {
  if (!state.settings.enabled) return;
  if (details.method !== 'POST') return;
  if (!details.url.includes(CONFIG.TARGET_URL_PART)) return;

  log('🚀 AI Generation started!');
  state.originalTabId = details.tabId;

  // Delay switch to prevent network errors
  setTimeout(switchToDistraction, CONFIG.SWITCH_DELAY_MS);
}

/**
 * Handle AI generation completion
 */
async function handleGenerationComplete(details) {
  if (details.method !== 'POST') return;
  if (!details.url.includes(CONFIG.TARGET_URL_PART)) return;

  log('✅ AI Generation completed!');

  await pauseDistraction();
  await returnToAIStudio();
}

// Initialize settings on startup
loadSettings();

// Listen for setting changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    state.settings.enabled = changes.enabled.newValue;
    log('Enabled changed:', state.settings.enabled);
  }
  if (changes.platform) {
    state.settings.platform = changes.platform.newValue;
    log('Platform changed:', state.settings.platform);
  }
});

// Listen for AI generation requests
chrome.webRequest.onBeforeRequest.addListener(
  handleGenerationStart,
  { urls: ['*://*.google.com/*'] }
);

// Listen for request completion
chrome.webRequest.onCompleted.addListener(
  handleGenerationComplete,
  { urls: ['*://*.google.com/*'] }
);

// Listen for request errors (also means completion)
chrome.webRequest.onErrorOccurred.addListener(
  handleGenerationComplete,
  { urls: ['*://*.google.com/*'] }
);