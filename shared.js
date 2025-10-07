// shared.js – JSONBin cloud storage version
(function () {
  if (window.__TRUESPEED_SHARED__) return;
  window.__TRUESPEED_SHARED__ = true;

  // JSONBin Configuration
  const JSONBIN_BIN_ID = '68e46c3e43b1c97be95cf9c8';
  const JSONBIN_API_KEY = '$2a$10$YpCLNe0DM5SESw4KuEc01..cqdPPoixm78gX0Qcf27xJ2WziqecwO';
  const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;
  
  // Keep localStorage key for offline backup
  const STORE_KEY = "acme_garage_products";
  const CHANNEL_NAME = "truespeed-products";

  // Default products for initial setup
  const DEFAULT_PRODUCTS = [
    { id:"p1", title:"Custom Cafe Racer", price:8200, category:"Motorcycles",
      description:"Hand-built cafe racer with retro styling and modern performance parts.",
      image:"https://picsum.photos/seed/truespeed-1/1200/900", featured:true },
    { id:"p2", title:"Vintage Bobber", price:9600, category:"Motorcycles",
      description:"Classic bobber style with chopped fenders and a low stance.",
      image:"https://picsum.photos/seed/truespeed-2/1200/900" },
    { id:"p3", title:"Adventure Touring Bike", price:14500, category:"Motorcycles",
      description:"Ready for long-distance travel with panniers, crash bars, and LED lighting.",
      image:"https://picsum.photos/seed/truespeed-3/1200/900", featured:true },
    { id:"p4", title:"Sport Bike 1000cc", price:12500, category:"Motorcycles",
      description:"High-performance sport bike with aggressive design and top-tier handling.",
      image:"https://picsum.photos/seed/truespeed-4/1200/900" },
    { id:"p5", title:"Classic Cruiser", price:11000, category:"Motorcycles",
      description:"Comfortable cruiser with a V-twin engine, perfect for relaxed rides.",
      image:"https://picsum.photos/seed/truespeed-5/1200/900" },
    { id:"p6", title:"Dual-Sport Motorcycle", price:7800, category:"Motorcycles",
      description:"Street-legal dirt bike designed for both off-road adventures and city riding.",
      image:"https://picsum.photos/seed/truespeed-6/1200/900" }
  ];

  const channel = new BroadcastChannel(CHANNEL_NAME);
  
  // Track if we're currently syncing
  let isSyncing = false;
  let syncQueue = [];

  // Show status messages
  function showSyncStatus(message, type = 'info') {
    const existingToast = document.getElementById('sync-status');
    if (existingToast) {
      existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'sync-status';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    if (type !== 'syncing') {
      setTimeout(() => {
        if (document.getElementById('sync-status') === toast) {
          toast.remove();
        }
      }, 3000);
    }
  }

  // Read products from JSONBin (cloud)
  async function readProductsFromCloud() {
    try {
      showSyncStatus('Loading products from cloud...', 'syncing');
      
      const response = await fetch(JSONBIN_URL + '/latest', {
        method: 'GET',
        headers: {
          'X-Master-Key': JSONBIN_API_KEY
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const products = data.record?.products || data.record || [];
      
      // Cache in localStorage for offline access
      localStorage.setItem(STORE_KEY, JSON.stringify(products));
      
      showSyncStatus('✓ Products loaded from cloud', 'success');
      return products;
      
    } catch (error) {
      console.error('Failed to read from JSONBin:', error);
      showSyncStatus('Using local data (cloud unavailable)', 'error');
      
      // Fall back to localStorage
      const local = localStorage.getItem(STORE_KEY);
      if (local) {
        return JSON.parse(local);
      }
      return [...DEFAULT_PRODUCTS];
    }
  }

  // Write products to JSONBin (cloud)
  async function writeProductsToCloud(products) {
    // Always save to localStorage first (instant)
    localStorage.setItem(STORE_KEY, JSON.stringify(products));
    
    // Broadcast local change immediately
    try { 
      channel.postMessage("updated"); 
    } catch {}
    
    // Queue for cloud sync
    syncQueue = products;
    
    if (!isSyncing) {
      isSyncing = true;
      
      try {
        showSyncStatus('Saving to cloud...', 'syncing');
        
        const response = await fetch(JSONBIN_URL, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_API_KEY
          },
          body: JSON.stringify({ products: syncQueue })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        showSyncStatus('✓ Saved to cloud', 'success');
        
        // Broadcast successful cloud sync
        try { 
          channel.postMessage("cloud-synced"); 
        } catch {}
        
      } catch (error) {
        console.error('Failed to save to JSONBin:', error);
        showSyncStatus('⚠️ Cloud save failed (saved locally)', 'error');
      } finally {
        isSyncing = false;
      }
    }
  }

  // Synchronous read for compatibility (reads from cache)
  function readProducts() {
    try {
      const cached = localStorage.getItem(STORE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      // If no cache, return defaults and trigger cloud load
      loadFromCloudInBackground();
      return [...DEFAULT_PRODUCTS];
    } catch {
      return [...DEFAULT_PRODUCTS];
    }
  }

  // Load from cloud in background
  async function loadFromCloudInBackground() {
    const products = await readProductsFromCloud();
    // Trigger UI update if available
    if (window.__refreshProductsFromStore) {
      window.__refreshProductsFromStore();
    }
  }

  // Write products (async but appears synchronous)
  function writeProducts(products) {
    // Save locally immediately
    localStorage.setItem(STORE_KEY, JSON.stringify(products));
    
    // Trigger cloud save in background
    writeProductsToCloud(products);
    
    // Broadcast change
    try { 
      channel.postMessage("updated"); 
    } catch {}
  }

  function onProductsUpdated(cb) {
    // Listen for local storage changes
    window.addEventListener("storage", (e) => {
      if (e.key === STORE_KEY) cb();
    });
    
    // Listen for broadcast messages
    channel.addEventListener("message", (ev) => {
      if (ev?.data === "updated" || ev?.data === "cloud-synced") {
        cb();
      }
    });
  }

  function resetToDefaults() {
    writeProducts(DEFAULT_PRODUCTS);
  }

  // Initial cloud sync on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFromCloudInBackground);
  } else {
    loadFromCloudInBackground();
  }

  // Periodic sync with cloud (every 30 seconds)
  setInterval(loadFromCloudInBackground, 30000);

  // Add styles for status toast
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Expose a tidy namespace
  window.Truespeed = {
    STORE_KEY,
    CHANNEL_NAME,
    DEFAULT_PRODUCTS,
    readProducts,
    writeProducts,
    onProductsUpdated,
    resetToDefaults,
    channel,
    // Expose async versions too
    readProductsFromCloud,
    writeProductsToCloud
  };
})();