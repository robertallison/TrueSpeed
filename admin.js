// Admin – uses shared store & sync (shared.js)
const { readProducts, writeProducts, resetToDefaults } = window.Truespeed;

// IMMEDIATELY make the receiver function available globally
window.__truespeedReceiveData = function(data) {
  console.log('🎯 RECEIVER CALLED WITH:', data);
  
  // Wait for DOM if needed
  if (document.readyState !== 'complete') {
    console.log('⏳ DOM not ready, waiting...');
    window.addEventListener('DOMContentLoaded', () => {
      window.__truespeedReceiveData(data);
    });
    return;
  }
  
  // Try to fill form
  try {
    const titleEl = document.getElementById("title");
    const categoryEl = document.getElementById("category");
    const priceEl = document.getElementById("price");
    const imageEl = document.getElementById("image");
    const descriptionEl = document.getElementById("description");
    
    if (titleEl) titleEl.value = data.title || '';
    if (categoryEl) categoryEl.value = 'Motorcycles';
    if (priceEl) priceEl.value = data.price || 0;
    if (imageEl) imageEl.value = data.image || '';
    if (descriptionEl) descriptionEl.value = data.description || '';
    
    console.log('✅ Form filled successfully!');
    
    // Show toast if available
    const toast = document.getElementById("toast");
    if (toast) {
      toast.textContent = `🎉 Data scraped from ${data.source || 'website'}!`;
      toast.className = 'toast show success';
      setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }
    
    // Highlight form
    const form = document.getElementById("productForm");
    if (form) {
      const formSection = form.closest('section');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
        formSection.style.boxShadow = '0 0 30px rgba(110, 231, 183, 0.4)';
        setTimeout(() => {
          formSection.style.boxShadow = '';
        }, 2000);
      }
    }
    
    // Auto-save if checkbox is checked
    const autoSave = document.getElementById('autoSaveToggle');
    if (autoSave && autoSave.checked && data.title && data.image) {
      setTimeout(() => {
        const submitBtn = document.querySelector('#productForm button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          console.log('⚡ Auto-saved!');
        }
      }, 1000);
    }
    
  } catch (err) {
    console.error('❌ Error filling form:', err);
  }
};

console.log('✅ Receiver function ready immediately!');

// ENHANCED HASH DETECTION - Check multiple times
function checkForHashData() {
  const hash = window.location.hash;
  if (hash && hash.includes('scraped')) {
    console.log('📦 Found scraped data in URL');
    try {
      // Remove the #scraped= part and decode
      const jsonStr = hash.replace('#scraped=', '');
      const decodedStr = decodeURIComponent(jsonStr);
      const data = JSON.parse(decodedStr);
      
      console.log('📋 Parsed data:', data);
      
      // Call receiver with the data
      window.__truespeedReceiveData(data);
      
      // Clear the hash
      history.replaceState(null, null, ' ');
      
    } catch (e) {
      console.error('Error parsing hash data:', e);
      console.log('Raw hash:', hash);
    }
  }
}

// Check for hash data on various events
window.addEventListener('load', checkForHashData);
window.addEventListener('hashchange', checkForHashData);
window.addEventListener('focus', checkForHashData);

// Also check every second for 5 seconds (catches delayed hash updates)
let hashCheckCount = 0;
const hashChecker = setInterval(() => {
  hashCheckCount++;
  checkForHashData();
  if (hashCheckCount >= 5) {
    clearInterval(hashChecker);
  }
}, 1000);

/* Elements - will be set after DOM loads */
let adminGrid, form, resetBtn, seedBtn, exportBtn, importBtn, importFile, toast;
let idEl, titleEl, categoryEl, priceEl, featuredEl, imageEl, descriptionEl;

let PRODUCTS = readProducts();

/* UI helpers */
function showToast(text, type = ''){
  if (!toast) toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = text;
  toast.className = 'toast show ' + type;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> {
    toast.classList.remove("show");
  }, 2600);
}

function renderAdminGrid(){
  if (!adminGrid) adminGrid = document.getElementById("adminGrid");
  if (!adminGrid) return;
  
  PRODUCTS = readProducts();
  if (!PRODUCTS.length){
    adminGrid.innerHTML = `<p class="hint">No products yet. Click <strong>Reset to Defaults</strong> or scrape some listings!</p>`;
    return;
  }
  adminGrid.innerHTML = PRODUCTS.map(p => `
    <article class="card" data-id="${p.id}">
      <div class="thumb">
        <img
          src="${p.image}"
          alt="${p.title}"
          loading="lazy"
          onerror="this.onerror=null; this.src='https://placehold.co/1200x900?text=Image+unavailable';"
        />
        <span class="badge">${p.category}</span>
      </div>
      <div class="card-body">
        <h4 class="card-title">${p.title}</h4>
        <p class="card-desc">${p.description}</p>
        <div class="card-row">
          <span class="price">$${Number(p.price).toLocaleString()} ${p.featured ? " • ⭐" : ""}</span>
          <div style="display:flex; gap:8px">
            <button class="btn ghost" data-edit="${p.id}">Edit</button>
            <button class="btn btn-delete" data-delete="${p.id}">Delete</button>
          </div>
        </div>
      </div>
    </article>
  `).join("");
}

/* Form actions */
function clearForm(){ 
  if (idEl) idEl.value = ""; 
  if (form) form.reset(); 
}

function upsertProduct(e){
  e.preventDefault();
  const id = idEl.value || `p_${Date.now()}`;
  const product = {
    id,
    title: titleEl.value.trim(),
    category: categoryEl.value.trim() || "Motorcycles",
    price: Number(priceEl.value || 0),
    featured: featuredEl.value === "true",
    image: imageEl.value.trim(),
    description: descriptionEl.value.trim()
  };
  if (!product.title || !product.image || !product.description) {
    showToast("Please fill all required fields.", "error"); 
    return;
  }

  let products = readProducts();
  const i = products.findIndex(p => p.id === id);
  if (i >= 0) {
    products[i] = product;
    showToast("✅ Product updated!", "success");
  } else {
    products.push(product);
    showToast("✅ Product added!", "success");
  }
  
  writeProducts(products);
  renderAdminGrid();
  clearForm();
}

function onGridClick(e){
  const del = e.target.closest?.("[data-delete]");
  const edit = e.target.closest?.("[data-edit]");
  if (del){
    const id = del.getAttribute("data-delete");
    if (confirm('Delete this product?')) {
      const products = readProducts().filter(p => p.id !== id);
      writeProducts(products);
      renderAdminGrid();
      showToast("Product deleted.");
    }
  }
  if (edit){
    const id = edit.getAttribute("data-edit");
    const p = readProducts().find(x => x.id === id);
    if (!p) return;
    idEl.value = p.id;
    titleEl.value = p.title;
    categoryEl.value = p.category;
    priceEl.value = p.price;
    featuredEl.value = p.featured ? "true" : "false";
    imageEl.value = p.image;
    descriptionEl.value = p.description;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function seedDefaults(){
  if (!confirm('Reset to default products?')) return;
  resetToDefaults();
  renderAdminGrid();
  showToast("Reset to defaults.");
}

function exportJson(){
  const products = readProducts();
  const data = JSON.stringify(products, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; 
  a.download = "truespeed-products.json";
  document.body.appendChild(a); 
  a.click(); 
  a.remove();
  URL.revokeObjectURL(url);
  showToast("📥 Exported products");
}

// Add auto-save toggle
function addAutoSaveToggle() {
  const scraperSection = document.querySelector('.scraper-section');
  if (scraperSection && !document.getElementById('autoSaveToggle')) {
    const toggleHTML = `
      <div style="margin-top: 16px; padding: 12px; background: var(--bg); border-radius: 12px; border: 1px solid var(--stroke);">
        <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
          <input type="checkbox" id="autoSaveToggle" style="width: 20px; height: 20px; cursor: pointer;">
          <div>
            <strong style="color: var(--text);">⚡ Auto-Save Scraped Products</strong>
            <span class="hint" style="display: block; margin-top: 2px;">Automatically save products after scraping</span>
          </div>
        </label>
      </div>
    `;
    scraperSection.insertAdjacentHTML('beforeend', toggleHTML);
  }
}

/* Initialize when DOM is ready */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM Ready - Initializing admin panel');
  
  // Get all elements
  adminGrid = document.getElementById("adminGrid");
  form = document.getElementById("productForm");
  resetBtn = document.getElementById("resetForm");
  seedBtn = document.getElementById("seedDefaults");
  exportBtn = document.getElementById("exportJson");
  importBtn = document.getElementById("importJsonBtn");
  importFile = document.getElementById("importFile");
  toast = document.getElementById("toast");
  
  idEl = document.getElementById("id");
  titleEl = document.getElementById("title");
  categoryEl = document.getElementById("category");
  priceEl = document.getElementById("price");
  featuredEl = document.getElementById("featured");
  imageEl = document.getElementById("image");
  descriptionEl = document.getElementById("description");
  
  // Wire up events
  if (form) form.addEventListener("submit", upsertProduct);
  if (resetBtn) resetBtn.addEventListener("click", () => { clearForm(); showToast("Form cleared"); });
  if (adminGrid) adminGrid.addEventListener("click", onGridClick);
  if (seedBtn) seedBtn.addEventListener("click", seedDefaults);
  if (exportBtn) exportBtn.addEventListener("click", exportJson);
  if (importBtn) importBtn.addEventListener("click", () => { importFile.click(); });
  
  if (importFile) {
    importFile.addEventListener("change", async () => {
      const file = importFile.files[0]; 
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        writeProducts(parsed);
        renderAdminGrid();
        showToast("📤 Imported!");
      } catch {
        showToast("Import failed", "error");
      }
      importFile.value = "";
    });
  }
  
  // Initial render
  renderAdminGrid();
  addAutoSaveToggle();
  
  // Check for scraped data in URL
  checkForHashData();
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .toast.success { border-left: 3px solid #6ee7b7; }
    .toast.error { border-left: 3px solid #ef4444; }
    .btn-delete { background: linear-gradient(135deg, #ef4444, #dc2626) !important; }
  `;
  document.head.appendChild(style);
});

// Log that script loaded
console.log('✅ Admin.js loaded successfully');

// ============ SIMPLE BULK IMPORT - Add to END of admin.js ============

// Check for bulk data every time page loads or gets focus
function checkAndImportBulk() {
  const bulkData = localStorage.getItem('truespeed_bulk_import');
  if (bulkData) {
    try {
      const listings = JSON.parse(bulkData);
      if (listings && listings.length > 0) {
        // Auto-import the data
        let products = readProducts();
        let added = 0;
        
        listings.forEach(item => {
          // Simple duplicate check by title
          if (!products.some(p => p.title === item.title)) {
            products.push(item);
            added++;
          }
        });
        
        writeProducts(products);
        renderAdminGrid();
        showToast(`✅ Imported ${added} motorcycles!`);
        
        // Clear the data
        localStorage.removeItem('truespeed_bulk_import');
      }
    } catch (e) {
      console.error('Bulk import error:', e);
    }
  }
}

// Run check on page load and focus
window.addEventListener('load', checkAndImportBulk);
window.addEventListener('focus', checkAndImportBulk);

// ============ URL-BASED BULK IMPORT ============
function checkUrlImport() {
  const hash = window.location.hash;
  
  // Check for bulk data in URL
  if (hash.includes('#bulk=')) {
    console.log('Found bulk data in URL');
    
    try {
      let data;
      
      if (hash.includes('#bulk=localStorage')) {
        // Large data stored in localStorage
        const compressed = localStorage.getItem('bulk_transfer');
        if (compressed) {
          data = JSON.parse(decodeURIComponent(atob(compressed)));
          localStorage.removeItem('bulk_transfer');
        }
      } else {
        // Data in URL
        const compressed = hash.replace('#bulk=', '');
        data = JSON.parse(decodeURIComponent(atob(compressed)));
      }
      
      if (data && data.length > 0) {
        console.log(`Importing ${data.length} items from URL...`);
        
        const products = readProducts();
        let added = 0;
        
        data.forEach(item => {
          if (!products.some(p => p.title === item.title)) {
            products.push(item);
            added++;
          }
        });
        
        writeProducts(products);
        renderAdminGrid();
        
        // Clear URL
        history.replaceState(null, null, ' ');
        
        // Show success
        if (typeof showToast === 'function') {
          showToast(`✅ Imported ${added} items!`);
        } else {
          alert(`✅ Imported ${added} items!`);
        }
      }
    } catch (e) {
      console.error('Failed to import from URL:', e);
    }
  }
}

// Check on load
document.addEventListener('DOMContentLoaded', checkUrlImport);
window.addEventListener('hashchange', checkUrlImport);

// Also check after a delay
setTimeout(checkUrlImport, 1000);


// This handles bulk import from bookmarklets via URL

// URL-based import for bookmarklets
function checkUrlImport() {
  const hash = window.location.hash;
  
  // Check for single scraped item
  if (hash.includes('#scraped=')) {
    console.log('Found scraped data in URL');
    try {
      const jsonStr = decodeURIComponent(hash.replace('#scraped=', ''));
      const data = JSON.parse(jsonStr);
      
      if (window.__truespeedReceiveData) {
        window.__truespeedReceiveData(data);
      }
      
      // Clear hash
      history.replaceState(null, null, ' ');
    } catch (e) {
      console.error('Failed to parse scraped data:', e);
    }
  }
  
  // Check for bulk data in URL
  if (hash.includes('#bulk=')) {
    console.log('Found bulk data in URL');
    try {
      const compressed = hash.replace('#bulk=', '');
      const data = JSON.parse(decodeURIComponent(atob(compressed)));
      
      if (data && data.length > 0) {
        console.log(`Importing ${data.length} items from URL...`);
        
        const products = readProducts();
        let added = 0;
        
        data.forEach(item => {
          if (!products.some(p => p.title === item.title)) {
            products.push(item);
            added++;
          }
        });
        
        writeProducts(products);
        renderAdminGrid();
        
        // Clear URL
        history.replaceState(null, null, ' ');
        
        // Show success
        if (typeof showToast === 'function') {
          showToast(`✅ Imported ${added} items from bookmarklet!`);
        }
      }
    } catch (e) {
      console.error('Failed to import from URL:', e);
    }
  }
}

// Check on various events
document.addEventListener('DOMContentLoaded', checkUrlImport);
window.addEventListener('hashchange', checkUrlImport);
window.addEventListener('focus', checkUrlImport);

// Auto-refresh when cloud data changes
window.__refreshProductsFromStore = function() {
  console.log('Cloud data changed, refreshing...');
  renderAdminGrid();
};

// Check for cloud updates periodically
setInterval(() => {
  if (window.Truespeed && window.Truespeed.readProductsFromCloud) {
    window.Truespeed.readProductsFromCloud().then(() => {
      renderAdminGrid();
    });
  }
}, 30000); // Every 30 seconds

console.log('✅ JSONBin cloud sync enabled');