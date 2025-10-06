// shared.js — single source of truth for products + realtime sync
(function () {
  if (window.__TRUESPEED_SHARED__) return; // avoid double-load
  window.__TRUESPEED_SHARED__ = true;

  const STORE_KEY = "acme_garage_products";
  const CHANNEL_NAME = "truespeed-products";

  // Reliable demo images: Picsum always returns an image
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

  function readProducts() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) {
        localStorage.setItem(STORE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
        return [...DEFAULT_PRODUCTS];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) {
        localStorage.setItem(STORE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
        return [...DEFAULT_PRODUCTS];
      }
      return parsed;
    } catch {
      return [...DEFAULT_PRODUCTS];
    }
  }

  function writeProducts(products) {
    localStorage.setItem(STORE_KEY, JSON.stringify(products));
    try { channel.postMessage("updated"); } catch {}
  }

  function onProductsUpdated(cb) {
    window.addEventListener("storage", (e) => {
      if (e.key === STORE_KEY) cb();
    });
    channel.addEventListener("message", (ev) => {
      if (ev?.data === "updated") cb();
    });
  }

  function resetToDefaults() {
    writeProducts(DEFAULT_PRODUCTS);
  }

  // Expose a tidy namespace
  window.Truespeed = {
    STORE_KEY,
    CHANNEL_NAME,
    DEFAULT_PRODUCTS,
    readProducts,
    writeProducts,
    onProductsUpdated,
    resetToDefaults,
    channel
  };
})();
