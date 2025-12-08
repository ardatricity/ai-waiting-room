/**
 * AI Studio Waiting Room - Popup Controller
 * Handles settings management and UI state
 */

// DOM Elements
const elements = {
  toggle: document.getElementById('toggleExtension'),
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  platformGrid: document.getElementById('platformGrid'),
  savedToast: document.getElementById('savedToast'),
};

// Platform options
const platformOptions = document.querySelectorAll('.platform-option');

/**
 * Initialize the popup with saved settings
 */
async function initialize() {
  try {
    const result = await chrome.storage.local.get(['enabled', 'platform']);

    // Set toggle state (default to true)
    const isEnabled = result.enabled !== undefined ? result.enabled : true;
    elements.toggle.checked = isEnabled;
    updateStatusUI(isEnabled);

    // Set platform selection (default to youtube)
    const platform = result.platform || 'youtube';
    selectPlatform(platform);

  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Update the status indicator UI
 */
function updateStatusUI(isEnabled) {
  elements.statusDot.classList.toggle('active', isEnabled);
  elements.statusText.textContent = isEnabled ? 'Active' : 'Disabled';
}

/**
 * Select a platform and update UI
 */
function selectPlatform(platform) {
  platformOptions.forEach(option => {
    const isSelected = option.dataset.platform === platform;
    option.classList.toggle('selected', isSelected);
    option.querySelector('input').checked = isSelected;
  });
}

/**
 * Show save confirmation toast
 */
function showSavedToast() {
  elements.savedToast.classList.add('show');
  setTimeout(() => {
    elements.savedToast.classList.remove('show');
  }, 1500);
}

/**
 * Save setting to storage with feedback
 */
async function saveSetting(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
    showSavedToast();
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
}

// Event Listeners

// Toggle change
elements.toggle.addEventListener('change', () => {
  const isEnabled = elements.toggle.checked;
  updateStatusUI(isEnabled);
  saveSetting('enabled', isEnabled);
});

// Platform selection
platformOptions.forEach(option => {
  option.addEventListener('click', () => {
    const platform = option.dataset.platform;
    selectPlatform(platform);
    saveSetting('platform', platform);
  });
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initialize);