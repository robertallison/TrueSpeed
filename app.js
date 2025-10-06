/* ===== Shop config ===== */
const SELLER_EMAIL = "Tyler@truspeedautosport.com";
const EMAIL_ENDPOINT = ""; // optional API later

/* ===== Helpers from shared.js =====
   window.Truespeed: { readProducts, writeProducts, onProductsUpdated, DEFAULT_PRODUCTS } */
const { readProducts, writeProducts, onProductsUpdated } = window.Truespeed;

/* ===== DOM ===== */
const grid = document.getElementById("productGrid");
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ===== State ===== */
let PRODUCTS = readProducts();

/* ===== Render ===== */
function uniqueCategories(items){ return ["All Categories", ...new Set(items.map(p => p.category))]; }

function renderFilters(){
  if (!categoryFilter) return;
  const cats = uniqueCategories(PRODUCTS);
  categoryFilter.innerHTML = cats.map((c,i)=>`<option value="${i===0?'all':c}">${c}</option>`).join("");
}

function renderProducts(list){
  if (!grid) return;
  grid.innerHTML = list.map(item => `
    <article class="card" data-id="${item.id}">
      <div class="thumb">
        <img
          src="${item.image}"
          alt="${item.title}"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="this.onerror=null; this.src='https://placehold.co/1200x900?text=Image+unavailable';"
        />
        <span class="badge">${item.category}</span>
      </div>
      <div class="card-body">
        <h4 class="card-title">${item.title}</h4>
        <p class="card-desc">${item.description}</p>
        <div class="card-row">
          <span class="price">$${Number(item.price).toLocaleString()}</span>
          <button class="btn cta-stripe" data-interest data-id="${item.id}">I’m interested</button>
        </div>
      </div>
    </article>
  `).join("");
}

function applyFilters(){
  const term = (searchInput?.value||"").trim().toLowerCase();
  const cat = categoryFilter?.value || "all";
  const sort = sortSelect?.value || "featured";

  let result = PRODUCTS.filter(p=>{
    const matchesTerm = `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(term);
    const matchesCat = cat==="all" ? true : p.category===cat;
    return matchesTerm && matchesCat;
  });

  switch (sort){
    case "price-asc": result.sort((a,b)=>a.price-b.price); break;
    case "price-desc": result.sort((a,b)=>b.price-a.price); break;
    case "alpha": result.sort((a,b)=>a.title.localeCompare(b.title)); break;
    default: result.sort((a,b)=> (b.featured===true)-(a.featured===true)); break;
  }
  renderProducts(result);
}

/* Initial render */
renderFilters();
renderProducts(PRODUCTS);

/* Wire filters */
searchInput?.addEventListener("input", applyFilters);
categoryFilter?.addEventListener("change", applyFilters);
sortSelect?.addEventListener("change", applyFilters);

/* ===== Interest modal + email ===== */
const modal = document.getElementById("interestModal");
const interestForm = document.getElementById("interestForm");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const inputItemId = document.getElementById("itemId");
const inputItemTitle = document.getElementById("itemTitle");
const inputItemPrice = document.getElementById("itemPrice");
const toast = document.getElementById("toast");

document.addEventListener("click", (e) => {
  const btn = e.target.closest?.("[data-interest]");
  if (btn){
    const id = btn.getAttribute("data-id");
    openInterest(PRODUCTS.find(p => p.id === id));
  }
  if (e.target.matches?.("[data-close]")) closeInterest();
});

function openInterest(item){
  if (!item || !modal) return;
  inputItemId && (inputItemId.value = item.id);
  inputItemTitle && (inputItemTitle.value = item.title);
  inputItemPrice && (inputItemPrice.value = String(item.price));
  if (modalImage){ modalImage.src = item.image; modalImage.alt = item.title; }
  if (modalTitle) modalTitle.textContent = "I'm Interested";
  if (modalSubtitle) modalSubtitle.textContent = `${item.title} — $${Number(item.price).toLocaleString()}`;
  modal.showModal();
}
function closeInterest(){ modal?.close(); interestForm?.reset(); }

interestForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();
  const itemTitle = inputItemTitle.value;
  const itemPrice = inputItemPrice.value;

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    showToast("Please provide a valid name and email.");
    return;
  }

  const payload = { name, email, message, itemTitle, itemPrice, to: SELLER_EMAIL };
  if (EMAIL_ENDPOINT){
    try{
      const res = await fetch(EMAIL_ENDPOINT, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast("Thanks! Your message has been sent."); closeInterest(); return;
    }catch{/* fall back to mailto */}
  }

  const subject = encodeURIComponent(`Interest in "${itemTitle}"`);
  const body = encodeURIComponent(
    `Hi,\n\nI'm interested in the "${itemTitle}" listed at $${Number(itemPrice).toLocaleString()}.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message || "(none)"}\n\n— Sent from TrueSpeedAutosports`
  );
  window.location.href = `mailto:${SELLER_EMAIL}?subject=${subject}&body=${body}`;
  showToast("Opening your email app to send the message…");
  closeInterest();
});

function showToast(text){
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> toast.classList.remove("show"), 2600);
}
document.addEventListener("keydown", (e)=>{ if (e.key==="Escape" && modal?.open) closeInterest(); });

/* ===== Realtime sync: refresh when admin changes data ===== */
function refreshFromStore(){
  PRODUCTS = readProducts();
  renderFilters();
  applyFilters();
}
onProductsUpdated(refreshFromStore);

/* Also expose manual hook for admin popup use (optional) */
window.__refreshProductsFromStore = refreshFromStore;
