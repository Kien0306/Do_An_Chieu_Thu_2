const FILTER_SIZES = [];
const FILTER_COLORS = [];
const FILTER_GENDERS = [{
  value: "",
  label: "Tất cả"
}, {
  value: "nam",
  label: "Nam"
}, {
  value: "nu",
  label: "Nữ"
}, {
  value: "unisex",
  label: "Unisex"
}, ];

const shopState = (window.shopState = {
  categories: [],
  products: [],
  currentUser: null,
  selectedCategory: "",
  selectedGender: "",
  selectedSizes: [],
  selectedColors: [],
  search: "",
  sort: "",
  searchTimer: null,
  heroIndex: 0,
  heroTimer: null,
  allProducts: [],
  homeFeaturedProducts: [],
  homeBestSellingProducts: [],
  homeCollectionMode: "featured",
  catalogMode: "",
  checkoutSubtotal: 0,
  checkoutDiscount: 0,
  appliedCoupon: null,
  currentPage: 1,
  pageSize: 9,
  totalPages: 1,
});

function getEl(id) {
  return document.getElementById(id);
}

function isAdmin() {
  return shopState.currentUser?.role?.name === "ADMIN";
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function genderLabel(value) {
  if (value === "nam") return "Nam";
  if (value === "nu") return "Nữ";
  return "Unisex";
}

function normalizeLabel(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

function getSizePriceEntry(item = {}, size = "") {
  if (!size) return null;
  const prices = Array.isArray(item.sizePrices) ? item.sizePrices : [];
  return (
    prices.find((entry) => String(entry?.size || "") === String(size || "")) ||
    null
  );
}

function getDisplayPrice(item = {}, size = "") {
  const fallbackPrice = Number(item?.price || 0);
  const found = getSizePriceEntry(item, size);
  return Number(found?.price ?? fallbackPrice);
}

function collectAvailableSizes() {
  const map = new Map();
  (shopState.allProducts || []).forEach((product) => {
    (product.sizes || []).forEach((size) => {
      const label = normalizeLabel(size);
      const key = label.toLowerCase();
      if (label && !map.has(key)) map.set(key, label);
    });
  });
  return Array.from(map.values());
}

function collectAvailableColors() {
  const map = new Map();
  (shopState.allProducts || []).forEach((product) => {
    (product.colors || []).forEach((color) => {
      const name = normalizeLabel(color?.name || "");
      const hex = normalizeLabel(color?.hex || "").toLowerCase();
      const key = name.toLowerCase();
      if (name && hex && !map.has(key)) map.set(key, {
        name,
        hex
      });
    });
  });
  return Array.from(map.values());
}

function renderHeaderUser() {
  const userArea = getEl("userArea");
  const adminLink = getEl("adminLink");
  const ordersLink = getEl("ordersLink");
  if (!userArea) return;
  if (!shopState.currentUser) {
    userArea.innerHTML = `<a class="icon-button" href="/login" title="Đăng nhập" aria-label="Đăng nhập">${iconSvg("user")}</a>`;
    if (adminLink) adminLink.classList.add("hidden");
    if (ordersLink) ordersLink.classList.add("hidden");
    return;
  }
  const roleName = shopState.currentUser.role?.name || "";
  if (adminLink) {
    if (roleName === "ADMIN") adminLink.classList.remove("hidden");
    else adminLink.classList.add("hidden");
  }
  if (ordersLink) ordersLink.classList.remove("hidden");
  userArea.innerHTML = `
    <div class="header-icon-stack">
      <div class="user-menu">
        <button class="icon-button" id="userMenuBtn" type="button" title="Tài khoản" aria-label="Tài khoản">${iconSvg("user")}</button>
        <div class="user-menu-dropdown hidden" id="userMenuDropdown">
          <a class="user-menu-item" href="/rewards" title="Đổi quà">${iconSvg("gift")}<span>Đổi quà</span></a>
        </div>
      </div>
      <button class="icon-button" id="logoutBtn" type="button" title="Đăng xuất" aria-label="Đăng xuất">${iconSvg("logout")}</button>
    </div>
  `;
  const userMenuBtn = getEl("userMenuBtn");
  const userMenuDropdown = getEl("userMenuDropdown");
  if (userMenuBtn && userMenuDropdown) {
    userMenuBtn.onclick = (e) => {
      e.stopPropagation();
      userMenuDropdown.classList.toggle("hidden");
    };
    document.addEventListener("click", (e) => {
      if (!userArea.contains(e.target))
        userMenuDropdown.classList.add("hidden");
    });
  }
  const logoutBtn = getEl("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await api.post("/api/v1/auth/logout", {});
      shopState.currentUser = null;
      renderHeaderUser();
      toggleProductAdminTools();
      const cartCount = getEl("cartCount");
      if (cartCount) cartCount.textContent = "0";
      if (location.pathname === "/cart") await loadCartPage();
      if (location.pathname === "/products") await loadProducts();
      if (location.pathname === "/") await loadHomeProducts();
      if (location.pathname === "/orders" || location.pathname === "/rewards")
        window.location.href = "/";
    };
  }
}

async function refreshCartCount() {
  const cartCount = getEl("cartCount");
  if (!cartCount) return;
  try {
    const items = await api.get("/api/v1/carts");
    const totalItems = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
    cartCount.textContent = totalItems;
  } catch {
    cartCount.textContent = "0";
  }
}

function bindSearchForm() {
  const searchInput = getEl("searchInput");
  if (!searchInput) return;
  if (shopState.search) searchInput.value = shopState.search;
  searchInput.addEventListener("input", () => {
    clearTimeout(shopState.searchTimer);
    shopState.searchTimer = setTimeout(async () => {
      shopState.search = searchInput.value.trim();
      if (location.pathname === "/products") {
        shopState.currentPage = 1;
        await loadProducts();
      } else if (location.pathname === "/") {
        await loadHomeProducts();
      }
    }, 120);
  });
}

function renderCategoryFilters() {
  const categoryFilters = getEl("categoryFilters");
  if (!categoryFilters) return;
  categoryFilters.innerHTML = `
    <label class="filter-option"><input type="radio" name="category" value="" ${!shopState.selectedCategory ? "checked" : ""}><span>Tất cả</span></label>
    ${shopState.categories
      .map(
        (item) => `
      <label class="filter-option"><input type="radio" name="category" value="${item._id}" ${shopState.selectedCategory === item._id ? "checked" : ""}><span>${escapeHtml(item.name)}</span></label>
    `,
      )
      .join("")}
  `;
  categoryFilters
    .querySelectorAll('input[name="category"]')
    .forEach((input) => {
      input.addEventListener("change", async (e) => {
        shopState.selectedCategory = e.target.value;
        shopState.currentPage = 1;
        await loadProducts();
      });
    });
}

function renderGenderFilters() {
  const genderFilters = getEl("genderFilters");
  if (!genderFilters) return;
  genderFilters.innerHTML = FILTER_GENDERS.map(
    (item) => `
    <label class="filter-option"><input type="radio" name="gender" value="${item.value}" ${shopState.selectedGender === item.value ? "checked" : ""}><span>${item.label}</span></label>
  `,
  ).join("");
  genderFilters.querySelectorAll('input[name="gender"]').forEach((input) => {
    input.addEventListener("change", async (e) => {
      shopState.selectedGender = e.target.value;
      shopState.currentPage = 1;
      await loadProducts();
    });
  });
}

function renderSizeFilters() {
  const sizeFilters = getEl("sizeFilters");
  if (!sizeFilters) return;
  const selected = new Set(shopState.selectedSizes);
  const sizeOptions = collectAvailableSizes();
  if (!sizeOptions.length) {
    sizeFilters.innerHTML = '<div class="meta">Chưa có size.</div>';
    return;
  }
  sizeFilters.innerHTML = sizeOptions
    .map(
      (item) => `
    <label class="choice-chip ${selected.has(item) ? "active" : ""}">
      <input type="checkbox" name="filterSize" value="${item}" ${selected.has(item) ? "checked" : ""}>
      <span>${item}</span>
    </label>
  `,
    )
    .join("");
  sizeFilters.querySelectorAll('input[name="filterSize"]').forEach((input) => {
    input.addEventListener("change", async () => {
      shopState.selectedSizes = Array.from(
        sizeFilters.querySelectorAll('input[name="filterSize"]:checked'),
      ).map((item) => item.value);
      renderSizeFilters();
      shopState.currentPage = 1;
      await loadProducts();
    });
  });
}

function renderColorFilters() {
  const colorWrap = getEl("colorFilters");
  if (!colorWrap) return;
  const colors = collectAvailableColors();
  colorWrap.innerHTML = `<div class="filter-color-grid">${colors
    .map((color) => {
      const active = shopState.selectedColors.includes(color.name);
      return `
      <label class="filter-color-item ${active ? "active" : ""}">
        <input type="checkbox" value="${escapeHtml(color.name)}" ${active ? "checked" : ""}>
        <span class="filter-color-dot" style="background:${escapeHtml(color.hex)}"></span>
        <span class="filter-color-label">${escapeHtml(color.name)}</span>
      </label>
    `;
    })
    .join("")}</div>`;
  colorWrap.querySelectorAll("label").forEach((label) => {
    const input = label.querySelector("input");
    input.addEventListener("change", async () => {
      const value = input.value;
      if (input.checked)
        shopState.selectedColors = [...shopState.selectedColors, value];
      else
        shopState.selectedColors = shopState.selectedColors.filter(
          (item) => item !== value,
        );
      renderColorFilters();
      shopState.currentPage = 1;
      await loadProducts();
    });
  });
}

function clearAllFilters() {
  shopState.selectedCategory = "";
  shopState.selectedGender = "";
  shopState.selectedSizes = [];
  shopState.selectedColors = [];
  shopState.search = "";
  shopState.sort = "";
  shopState.currentPage = 1;
  const searchInput = getEl("searchInput");
  if (searchInput) searchInput.value = "";
  const sortSelect = getEl("sortSelect");
  if (sortSelect) sortSelect.value = "";
  renderAllFilters();
}

function renderAllFilters() {
  renderCategoryFilters();
  renderGenderFilters();
  renderSizeFilters();
  renderColorFilters();
  const sortSelect = getEl("sortSelect");
  if (sortSelect) sortSelect.value = shopState.sort || "";
}

function buildColorDots(colors = []) {
  if (!colors.length) return "";
  return `
    <div class="product-color-row">
      ${colors.map((item) => `<span class="product-color-dot" title="${escapeHtml(item.name)}" style="background:${escapeHtml(item.hex)}"></span>`).join("")}
    </div>
  `;
}

function buildQuickSizes(sizes = []) {
  if (!sizes.length) return "";
  return `
    <div class="quick-size-overlay">
      <div class="quick-size-title">Kích thước có sẵn</div>
      <div class="quick-size-grid">
        ${sizes.map((item) => `<span class="quick-size-pill">${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function getPreferredCardSize(item = {}) {
  if (!Array.isArray(item.sizes) || !item.sizes.length) return "";
  const stocks = Array.isArray(item.sizeStocks) ? item.sizeStocks : [];
  if (
    Array.isArray(shopState.selectedSizes) &&
    shopState.selectedSizes.length
  ) {
    const matching = shopState.selectedSizes.find(
      (size) =>
      Number(
        stocks.find(
          (entry) => String(entry.size || "") === String(size || ""),
        )?.stock || 0,
      ) > 0,
    );
    if (matching) return matching;
  }
  const found = item.sizes.find(
    (size) =>
    Number(
      stocks.find((entry) => String(entry.size || "") === String(size || ""))
      ?.stock || 0,
    ) > 0,
  );
  return found || String(item.sizes[0] || "");
}

function quickAddProduct(productId, selectedSize = "") {
  addToCart(productId, false, selectedSize ? {
    selectedSize
  } : {});
}
window.quickAddProduct = quickAddProduct;

function productCard(item) {
  const image = item.images?.[0] || "https://placehold.co/1200x800";
  const isSoldOut = Number(item.stock || 0) <= 0;
  const preferredSize = getPreferredCardSize(item);
  const displayPrice = getDisplayPrice(item, preferredSize);
  const addAction = preferredSize ?
    `quickAddProduct('${item._id}','${String(preferredSize).replaceAll("'", "\'")}')` :
    `quickAddProduct('${item._id}')`;
  const adminActions = isAdmin() ?
    `
        <div class="product-admin-actions">
          <a class="product-admin-btn" href="/products/edit/${item._id}" title="Sửa sản phẩm" aria-label="Sửa sản phẩm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </a>
          <button class="product-admin-btn danger" type="button" onclick="deleteProductFromList('${item._id}')" title="Xoá sản phẩm" aria-label="Xoá sản phẩm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      ` :
    "";
  return `
    <div class="product-card ${isSoldOut ? "sold-out-card" : ""}">
      <div class="product-media">
        <a class="product-image-wrap product-link-wrap" href="/products/${item._id}">
          <img src="${image}" alt="${escapeHtml(item.title)}">
          ${item.isFeatured ? '<span class="featured-chip">Nổi bật</span>' : ""}
          ${isSoldOut ? '<span class="sold-out-chip">SOLD OUT</span>' : ""}
          ${buildQuickSizes(item.sizes || [])}
        </a>
        ${adminActions}
      </div>
      <div class="body">
        <div class="row between"><span class="badge">${escapeHtml(item.category?.name || "Khác")}</span><span class="meta">${genderLabel(item.gender)}</span></div>
        ${buildColorDots(item.colors || [])}
        <h3><a class="product-title-link" href="/products/${item._id}">${escapeHtml(item.title)}</a></h3>
        <div class="meta product-card-desc">${escapeHtml(item.description || "")}</div>
        <div class="price">${formatPrice(displayPrice)}</div>
        <div class="row between product-footer-row">
          <span class="meta">&nbsp;</span>
          <button class="btn primary" ${isSoldOut ? "disabled" : ""} onclick="${addAction}">${isSoldOut ? "Hết hàng" : "Thêm giỏ hàng"}</button>
        </div>
      </div>
    </div>
  `;
}

function applyCatalogMode(products) {
  const list = Array.isArray(products) ? [...products] : [];
  if (shopState.catalogMode === "featured")
    return list.filter((item) => item.isFeatured);
  if (shopState.catalogMode === "best-selling") {
    const soldItems = list.filter((item) => Number(item.soldCount || 0) > 0);
    const source = soldItems.length ? soldItems : list;
    return source.sort((a, b) => {
      const soldDiff = Number(b.soldCount || 0) - Number(a.soldCount || 0);
      if (soldDiff !== 0) return soldDiff;
      return Number(b.stock || 0) - Number(a.stock || 0);
    });
  }
  return list;
}

function updateCatalogHeading() {
  const titleEl = getEl("catalogTitle");
  if (!titleEl) return;
  if (shopState.catalogMode === "featured")
    titleEl.textContent = "Sản phẩm nổi bật";
  else if (shopState.catalogMode === "best-selling")
    titleEl.textContent = "Sản phẩm bán chạy";
  else titleEl.textContent = "Sản phẩm";
}

function renderProducts() {
  const productGrid = getEl("productGrid");
  const paginationWrap = getEl("productPagination");
  if (!productGrid) return;
  if (!Array.isArray(shopState.products) || !shopState.products.length) {
    shopState.totalPages = 1;
    productGrid.innerHTML =
      '<div class="panel empty-panel">Không có sản phẩm phù hợp.</div>';
    if (paginationWrap) paginationWrap.innerHTML = "";
    return;
  }
  const pageSize = Number(shopState.pageSize || 9);
  const totalPages = Math.max(
    1,
    Math.ceil(shopState.products.length / pageSize),
  );
  shopState.totalPages = totalPages;
  if (shopState.currentPage > totalPages) shopState.currentPage = totalPages;
  if (shopState.currentPage < 1) shopState.currentPage = 1;
  const startIndex = (shopState.currentPage - 1) * pageSize;
  const visibleItems = shopState.products.slice(
    startIndex,
    startIndex + pageSize,
  );
  productGrid.innerHTML = visibleItems.map(productCard).join("");
  renderProductPagination();
}

function renderProductPagination() {
  const wrap = getEl("productPagination");
  if (!wrap) return;
  const totalPages = Number(shopState.totalPages || 1);
  if (totalPages <= 1) {
    wrap.innerHTML = "";
    return;
  }
  const current = Number(shopState.currentPage || 1);
  const buttons = [];
  buttons.push(
    `<button class="page-btn" type="button" ${current <= 1 ? "disabled" : ""} onclick="changeProductPage(${current - 1})">‹</button>`,
  );
  for (let page = 1; page <= totalPages; page += 1) {
    buttons.push(
      `<button class="page-btn ${page === current ? "active" : ""}" type="button" onclick="changeProductPage(${page})">${page}</button>`,
    );
  }
  buttons.push(
    `<button class="page-btn" type="button" ${current >= totalPages ? "disabled" : ""} onclick="changeProductPage(${current + 1})">›</button>`,
  );
  wrap.innerHTML = buttons.join("");
}

function changeProductPage(page) {
  shopState.currentPage = page;
  renderProducts();
  const panel = document.querySelector(".product-panel");
  panel?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
window.changeProductPage = changeProductPage;

function renderHomeCollectionTabs() {
  const featuredBtn = getEl("homeTabFeatured");
  const bestSellingBtn = getEl("homeTabBestSelling");
  const featuredGrid = getEl("homeFeaturedGrid");
  const bestSellingGrid = getEl("homeBestSellingGrid");
  const moreLink = getEl("homeCollectionMoreLink");
  const mode =
    shopState.homeCollectionMode === "best-selling" ?
    "best-selling" :
    "featured";
  if (featuredBtn) {
    const active = mode === "featured";
    featuredBtn.classList.toggle("active", active);
    featuredBtn.setAttribute("aria-pressed", active ? "true" : "false");
  }
  if (bestSellingBtn) {
    const active = mode === "best-selling";
    bestSellingBtn.classList.toggle("active", active);
    bestSellingBtn.setAttribute("aria-pressed", active ? "true" : "false");
  }
  if (featuredGrid)
    featuredGrid.classList.toggle("hidden", mode !== "featured");
  if (bestSellingGrid)
    bestSellingGrid.classList.toggle("hidden", mode !== "best-selling");
  if (moreLink)
    moreLink.href =
    mode === "featured" ?
    "/products?mode=featured" :
    "/products?mode=best-selling";
}

function bindHomeCollectionTabs() {
  const featuredBtn = getEl("homeTabFeatured");
  const bestSellingBtn = getEl("homeTabBestSelling");
  if (featuredBtn && !featuredBtn.dataset.bound) {
    featuredBtn.dataset.bound = "1";
    featuredBtn.addEventListener("click", () => {
      shopState.homeCollectionMode = "featured";
      renderHomeCollectionTabs();
    });
  }
  if (bestSellingBtn && !bestSellingBtn.dataset.bound) {
    bestSellingBtn.dataset.bound = "1";
    bestSellingBtn.addEventListener("click", () => {
      shopState.homeCollectionMode = "best-selling";
      renderHomeCollectionTabs();
    });
  }
}

function renderHomeProducts() {
  const featuredGrid = getEl("homeFeaturedGrid");
  const bestSellingGrid = getEl("homeBestSellingGrid");
  if (!featuredGrid && !bestSellingGrid) return;
  const featured = Array.isArray(shopState.homeFeaturedProducts) ?
    shopState.homeFeaturedProducts :
    [];
  const bestSelling = Array.isArray(shopState.homeBestSellingProducts) ?
    shopState.homeBestSellingProducts :
    [];
  if (featuredGrid)
    featuredGrid.innerHTML = featured.length ?
    featured.map(productCard).join("") :
    '<div class="panel">Không có sản phẩm nổi bật để hiển thị.</div>';
  if (bestSellingGrid)
    bestSellingGrid.innerHTML = bestSelling.length ?
    bestSelling.map(productCard).join("") :
    '<div class="panel">Chưa có dữ liệu sản phẩm bán chạy.</div>';
  bindHomeCollectionTabs();
  renderHomeCollectionTabs();
}

function toggleProductAdminTools() {
  const openBtn = getEl("openProductFormBtn");
  if (!openBtn) return;
  if (isAdmin()) openBtn.classList.remove("hidden");
  else openBtn.classList.add("hidden");
}

function renderHeroDots(total) {
  const dotWrap = getEl("heroDots");
  if (!dotWrap) return;
  dotWrap.innerHTML = Array.from({
      length: total
    },
    (_, index) => `
    <button class="hero-dot ${index === shopState.heroIndex ? "active" : ""}" type="button" onclick="goToHeroSlide(${index})" aria-label="Chuyển tới banner ${index + 1}"></button>
  `,
  ).join("");
}

function updateHeroSlider() {
  const slides = document.querySelectorAll(".hero-slide");
  if (!slides.length) return;
  slides.forEach((slide, index) => {
    slide.classList.toggle("active", index === shopState.heroIndex);
  });
  renderHeroDots(slides.length);
}

function nextHeroSlide() {
  const slides = document.querySelectorAll(".hero-slide");
  if (!slides.length) return;
  shopState.heroIndex = (shopState.heroIndex + 1) % slides.length;
  updateHeroSlider();
}
window.nextHeroSlide = nextHeroSlide;

function prevHeroSlide() {
  const slides = document.querySelectorAll(".hero-slide");
  if (!slides.length) return;
  shopState.heroIndex =
    (shopState.heroIndex - 1 + slides.length) % slides.length;
  updateHeroSlider();
}
window.prevHeroSlide = prevHeroSlide;

function goToHeroSlide(index) {
  shopState.heroIndex = index;
  updateHeroSlider();
}
window.goToHeroSlide = goToHeroSlide;

function initHeroSlider() {
  const slider = getEl("heroSlider");
  const slides = document.querySelectorAll(".hero-slide");
  if (!slider || !slides.length) return;
  updateHeroSlider();
  clearInterval(shopState.heroTimer);
  shopState.heroTimer = setInterval(nextHeroSlide, 4500);
  slider.addEventListener("mouseenter", () =>
    clearInterval(shopState.heroTimer),
  );
  slider.addEventListener("mouseleave", () => {
    clearInterval(shopState.heroTimer);
    shopState.heroTimer = setInterval(nextHeroSlide, 4500);
  });
}

async function loadCategories() {
  shopState.categories = await api.get("/api/v1/categories");
  shopState.allProducts = await api.get("/api/v1/products");
  renderAllFilters();
}

async function loadProducts() {
  const params = new URLSearchParams();
  if (shopState.search) params.set("title", shopState.search);
  if (shopState.selectedCategory)
    params.set("category", shopState.selectedCategory);
  if (shopState.selectedGender) params.set("gender", shopState.selectedGender);
  if (shopState.selectedSizes.length)
    params.set("size", shopState.selectedSizes.join(","));
  if (shopState.selectedColors.length)
    params.set("color", shopState.selectedColors.join(","));
  if (shopState.sort) params.set("sort", shopState.sort);
  const data = await api.get("/api/v1/products?" + params.toString());
  let nextProducts = applyCatalogMode(data);
  if (shopState.selectedSizes.length) {
    nextProducts = nextProducts.filter((item) => {
      const sizeStocks = Array.isArray(item.sizeStocks) ? item.sizeStocks : [];
      return shopState.selectedSizes.some(
        (size) =>
        Number(
          sizeStocks.find(
            (entry) => String(entry.size || "") === String(size || ""),
          )?.stock || 0,
        ) > 0,
      );
    });
  }
  shopState.products = nextProducts;
  renderProducts();
}

async function loadHomeProducts() {
  const params = new URLSearchParams();
  if (shopState.search) params.set("title", shopState.search);
  const data = await api.get("/api/v1/products?" + params.toString());
  const safeProducts = Array.isArray(data) ? data : [];
  shopState.homeFeaturedProducts = safeProducts
    .filter((item) => item.isFeatured)
    .slice(0, 6);
  shopState.homeBestSellingProducts = safeProducts
    .filter((item) => Number(item.soldCount || 0) > 0)
    .sort((a, b) => {
      const soldDiff = Number(b.soldCount || 0) - Number(a.soldCount || 0);
      if (soldDiff !== 0) return soldDiff;
      return Number(b.stock || 0) - Number(a.stock || 0);
    })
    .slice(0, 6);
  renderHomeProducts();
}

async function addToCart(productId, redirectToCart = false, extra = {}) {
  try {
    await api.post("/api/v1/carts/add", {
      product: productId,
      ...extra
    });
    await refreshCartCount();
    if (redirectToCart) {
      window.location.href = "/cart";
      return;
    }
    if (location.pathname === "/cart") await loadCartPage();
  } catch (error) {
    if (error.status === 401) {
      window.location.href = "/login";
      return;
    }
    alert(error.message || "Không thể thêm vào giỏ hàng");
  }
}
window.addToCart = addToCart;

window.deleteProductFromList = async (id) => {
  try {
    await api.delete("/api/v1/products/" + id);
    await loadProducts();
    if (location.pathname === "/") await loadHomeProducts();
  } catch (error) {
    console.error(error.message);
  }
};

async function increaseCart(productId, selectedSize = "") {
  await api.post("/api/v1/carts/add", {
    product: productId,
    selectedSize
  });
  await loadCartPage();
}
window.increaseCart = increaseCart;

async function decreaseCart(productId, selectedSize = "") {
  await api.post("/api/v1/carts/decrease", {
    product: productId,
    selectedSize,
  });
  await loadCartPage();
}
window.decreaseCart = decreaseCart;

async function removeCart(productId, selectedSize = "") {
  await api.post("/api/v1/carts/remove", {
    product: productId,
    selectedSize
  });
  await loadCartPage();
}
window.removeCart = removeCart;

async function updateCartSize(
  productId,
  oldSelectedSize = "",
  nextSelectedSize = "",
) {
  try {
    await api.post("/api/v1/carts/update-size", {
      product: productId,
      selectedSize: oldSelectedSize,
      nextSelectedSize,
    });
    await loadCartPage();
  } catch (error) {
    alert(error.message || "Không đổi được size");
    await loadCartPage();
  }
}
window.updateCartSize = updateCartSize;

async function loadCartPage() {
  const cartList = getEl("cartList");
  const cartTotal = getEl("cartTotal");
  const cartSummaryTotal = getEl("cartSummaryTotal");
  if (!cartList) return;
  try {
    const items = await api.get("/api/v1/carts");
    let total = 0;
    shopState.checkoutDiscount = 0;
    shopState.appliedCoupon = null;
    if (!items.length) {
      cartList.innerHTML =
        '<div class="empty-state">Giỏ hàng đang trống. Hãy quay lại trang sản phẩm để mua hàng.</div>';
      if (cartTotal) cartTotal.textContent = formatPrice(0);
      if (cartSummaryTotal) cartSummaryTotal.textContent = formatPrice(0);
      await refreshCartCount();
      return;
    }
    cartList.innerHTML = items
      .map((item) => {
        const product = item.product || {};
        const subtotal =
          Number(product.price || 0) * Number(item.quantity || 0);
        total += subtotal;
        return `
        <div class="cart-item">
          <img src="${product.images?.[0] || "https://placehold.co/200"}" alt="${escapeHtml(product.title || "")}">
          <div>
            <strong>${escapeHtml(product.title || "Sản phẩm")}</strong>
            <div class="meta">${escapeHtml(product.category?.name || "")}</div>
${buildCartSizeSelect(product, item)}
            <div>${formatPrice(product.price)} x <span class="cart-qty">${item.quantity}</span></div>
          </div>
          <div>
            <div style="font-weight:700; margin-bottom:10px; text-align:right">${formatPrice(subtotal)}</div>
            <div class="cart-actions">
              <div class="qty-control">
                <button class="qty-btn icon-only" onclick="decreaseCart('${product._id}','${item.selectedSize || ""}')" aria-label="Giảm số lượng">−</button>
                <span class="qty-number">${item.quantity}</span>
                <button class="qty-btn icon-only" onclick="increaseCart('${product._id}','${item.selectedSize || ""}')" aria-label="Tăng số lượng">+</button>
              </div>
              <button class="qty-btn icon-only delete-cart-btn" onclick="removeCart('${product._id}','${item.selectedSize || ""}')" aria-label="Xoá sản phẩm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
    if (cartTotal) cartTotal.textContent = formatPrice(total);
    if (cartSummaryTotal) cartSummaryTotal.textContent = formatPrice(total);
    await refreshCartCount();
  } catch (error) {
    cartList.innerHTML =
      '<div class="empty-state">Bạn cần đăng nhập để xem giỏ hàng.</div>';
    if (cartTotal) cartTotal.textContent = formatPrice(0);
    if (cartSummaryTotal) cartSummaryTotal.textContent = formatPrice(0);
  }
}

function buildCartSizeSelect(product = {}, item = {}) {
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const stocks = Array.isArray(product.sizeStocks) ? product.sizeStocks : [];
  if (!sizes.length) {
    return item.selectedSize ?
      `<div class="meta">Size: ${escapeHtml(item.selectedSize)}</div>` :
      "";
  }
  const quantity = Number(item.quantity || 0);
  const options = sizes
    .map((size) => {
      const sizeInfo = stocks.find(
        (entry) => String(entry.size || "") === String(size || ""),
      );
      const stock = Number(sizeInfo?.stock || 0);
      const isCurrent = String(item.selectedSize || "") === String(size || "");
      const disabled = !isCurrent && stock < Math.max(1, quantity);
      return `<option value="${escapeHtml(size)}" ${isCurrent ? "selected" : ""} ${disabled ? "disabled" : ""}>${escapeHtml(size)}</option>`;
    })
    .join("");
  return `<div class="cart-size-row"><span class="meta">Size:</span><select class="cart-size-select" onchange="updateCartSize('${product._id}','${item.selectedSize || ""}',this.value)">${options}</select></div>`;
}

function updateCheckoutTotals() {
  const subtotalEl = getEl("checkoutSubtotal");
  const discountEl = getEl("checkoutDiscount");
  const totalEl = getEl("checkoutTotal");
  if (subtotalEl)
    subtotalEl.textContent = formatPrice(shopState.checkoutSubtotal || 0);
  if (discountEl)
    discountEl.textContent = "-" + formatPrice(shopState.checkoutDiscount || 0);
  if (totalEl)
    totalEl.textContent = formatPrice(
      Math.max(
        0,
        Number(shopState.checkoutSubtotal || 0) -
        Number(shopState.checkoutDiscount || 0),
      ),
    );
}

async function applyCoupon() {
  const codeInput = getEl("couponCode");
  const messageEl = getEl("couponMessage");
  if (!codeInput) return;
  const code = codeInput.value.trim();
  if (!messageEl) return;
  messageEl.textContent = "";
  shopState.appliedCoupon = null;
  shopState.checkoutDiscount = 0;
  updateCheckoutTotals();
  if (!code) return;
  try {
    const result = await api.post("/api/v1/coupons/validate", {
      code,
      amount: shopState.checkoutSubtotal || 0,
    });
    shopState.appliedCoupon = result;
    shopState.checkoutDiscount = Number(result.discountAmount || 0);
    updateCheckoutTotals();
    messageEl.textContent = `Đã áp dụng ${result.code}: giảm ${formatPrice(result.discountAmount || 0)}`;
    messageEl.style.color = "#166534";
  } catch (error) {
    messageEl.textContent = error.message || "Không áp dụng được mã giảm giá";
    messageEl.style.color = "#b42318";
  }
}
window.applyCoupon = applyCoupon;

async function handleCheckout() {
  const checkoutBtn = getEl("checkoutBtn");
  const messageEl = getEl("checkoutMessage");
  if (checkoutBtn) checkoutBtn.disabled = true;
  if (messageEl) hideMessage(messageEl);
  try {
    const items = await api.get("/api/v1/carts");
    if (!items.length) {
      if (messageEl) showMessage(messageEl, "Giỏ hàng đang trống", true);
      return;
    }
    const payload = {
      fullName: getEl("checkoutFullName")?.value?.trim() || "",
      phone: getEl("checkoutPhone")?.value?.trim() || "",
      address: getEl("checkoutAddress")?.value?.trim() || "",
      paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value ||
        "cod",
      couponCode: shopState.appliedCoupon?.code || "",
    };
    const result = await api.post("/api/v1/carts/checkout", payload);
    await refreshCartCount();
    const methodLabel =
      payload.paymentMethod === "bank" ? "chuyển khoản" : "COD";
    if (messageEl)
      showMessage(
        messageEl,
        `Đặt hàng thành công bằng ${methodLabel}. Bạn nhận được ${Number(result.earnedPoints || 0)} điểm.`,
      );
    setTimeout(() => {
      window.location.href = "/orders";
    }, 1400);
  } catch (error) {
    if (messageEl) showMessage(messageEl, error.message, true);
  } finally {
    if (checkoutBtn) checkoutBtn.disabled = false;
  }
}
window.handleCheckout = handleCheckout;

function syncPaymentMethodUI() {
  const selected =
    document.querySelector('input[name="paymentMethod"]:checked')?.value ||
    "cod";
  document.querySelectorAll(".payment-choice").forEach((label) => {
    const input = label.querySelector("input");
    label.classList.toggle("active", input && input.value === selected);
  });
  const bankTransferBox = getEl("bankTransferBox");
  if (bankTransferBox) {
    bankTransferBox.classList.toggle("hidden", selected !== "bank");
  }
}

function bindPaymentMethodUI() {
  document.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener("change", syncPaymentMethodUI);
  });
  syncPaymentMethodUI();
}

async function loadCheckoutPage() {
  const summary = getEl("checkoutSummary");
  const totalEl = getEl("checkoutTotal");
  if (!summary) return;
  try {
    const items = await api.get("/api/v1/carts");
    let total = 0;
    shopState.checkoutDiscount = 0;
    shopState.appliedCoupon = null;
    if (!items.length) {
      summary.innerHTML =
        '<div class="empty-state">Giỏ hàng đang trống. Hãy thêm sản phẩm trước khi thanh toán.</div>';
      shopState.checkoutSubtotal = 0;
      updateCheckoutTotals();
      return;
    }
    summary.innerHTML = items
      .map((item) => {
        const product = item.product || {};
        const subtotal =
          Number(product.price || 0) * Number(item.quantity || 0);
        total += subtotal;
        return `<div class="checkout-item"><span>${escapeHtml(product.title || "Sản phẩm")}${item.selectedSize ? ` (${escapeHtml(item.selectedSize)})` : ""} x ${item.quantity}</span><strong>${formatPrice(subtotal)}</strong></div>`;
      })
      .join("");
    shopState.checkoutSubtotal = total;
    updateCheckoutTotals();
  } catch (error) {
    summary.innerHTML =
      '<div class="empty-state">Bạn cần đăng nhập để thanh toán.</div>';
    shopState.checkoutSubtotal = 0;
    updateCheckoutTotals();
  }
}

async function initCheckoutPage() {
  await initCommonPage();
  bindPaymentMethodUI();
  const couponCode = getEl("couponCode");
  if (couponCode)
    couponCode.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyCoupon();
      }
    });
  await loadLoyaltySummary();
  await loadCheckoutPage();
}
window.initCheckoutPage = initCheckoutPage;

async function initCommonPage() {
  shopState.currentUser = await getCurrentUser();
  renderHeaderUser();
  bindSearchForm();
  await refreshCartCount();
}

async function initHomePage() {
  await initCommonPage();
  initHeroSlider();
  await loadHomeProducts();
  ["product.updated", "inventory.updated", "category.updated"].forEach(
    (eventName) =>
    subscribeRealtime(eventName, async () => {
      try {
        await loadHomeProducts();
      } catch {}
    }),
  );
}

async function initProductsPage() {
  await initCommonPage();
  const url = new URL(window.location.href);
  shopState.search = url.searchParams.get("q") || "";
  shopState.catalogMode = url.searchParams.get("mode") || "";
  updateCatalogHeading();
  const searchInput = getEl("searchInput");
  if (searchInput && shopState.search) searchInput.value = shopState.search;
  const sortSelect = getEl("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", async (e) => {
      shopState.sort = e.target.value;
      shopState.currentPage = 1;
      await loadProducts();
    });
  }
  try {
    await loadCategories();
    renderAllFilters();
    bindFilterToggles();
    const clearFiltersBtn = getEl("clearFiltersBtn");
    if (clearFiltersBtn && !clearFiltersBtn.dataset.boundClear) {
      clearFiltersBtn.dataset.boundClear = "1";
      clearFiltersBtn.addEventListener("click", async () => {
        clearAllFilters();
        bindFilterToggles();
        await loadProducts();
      });
    }
    toggleProductAdminTools();
    await loadProducts();
    ["product.updated", "inventory.updated", "category.updated"].forEach(
      (eventName) =>
      subscribeRealtime(eventName, async () => {
        try {
          await loadCategories();
          renderAllFilters();
          bindFilterToggles();
          await loadProducts();
        } catch {}
      }),
    );
  } catch (error) {
    const productGrid = getEl("productGrid");
    if (productGrid)
      productGrid.innerHTML = `<div class=\"panel empty-panel\">${escapeHtml(error.message || "Không tải được sản phẩm.")}</div>`;
  }
}

async function initCartPage() {
  await initCommonPage();
  await loadCartPage();
  subscribeRealtime("cart.updated", async () => {
    try {
      await loadCartPage();
      await refreshCartCount();
    } catch {}
  });
}

function renderProductDetail(item) {
  const wrap = getEl("productDetailWrap");
  if (!wrap) return;
  const image = item.images?.[0] || "https://placehold.co/1200x800";
  const initialDetailSize = (item.sizes || [])[0] || "";
  const displayPrice = getDisplayPrice(item, initialDetailSize);
  const sizeButtons = (item.sizes || []).length ?
    item.sizes
    .map((size, index) => {
      const sizeInfo = Array.isArray(item.sizeStocks) ?
        item.sizeStocks.find(
          (entry) => String(entry.size || "") === String(size || ""),
        ) :
        null;
      const sizeStock = Number(sizeInfo?.stock || 0);
      return `
      <button class="choice-chip detail-choice ${index === 0 ? "active" : ""}" type="button" data-detail-size="${escapeHtml(size)}" data-size-stock="${sizeStock}"><span>${escapeHtml(size)}</span></button>
    `;
    })
    .join("") :
    '<div class="meta">Sản phẩm chưa có size.</div>';
  const colorButtons = (item.colors || []).length ?
    item.colors
    .map(
      (color, index) => `
      <button class="color-choice detail-choice ${index === 0 ? "active" : ""}" type="button" data-detail-color="${escapeHtml(color.name)}">
        <span class="color-choice-dot" style="background:${escapeHtml(color.hex)}"></span>
        <span>${escapeHtml(color.name)}</span>
      </button>
    `,
    )
    .join("") :
    '<div class="meta">Sản phẩm chưa có màu.</div>';

  wrap.innerHTML = `
    <div class="product-detail-grid">
      <div class="panel product-detail-gallery">
        <img src="${image}" alt="${escapeHtml(item.title)}">
      </div>
      <div class="panel product-detail-panel">
        <div class="row between">
          <span class="badge">${escapeHtml(item.category?.name || "Khác")}</span>
          <span class="meta">${genderLabel(item.gender)}</span>
        </div>
        <h1 class="product-detail-title">${escapeHtml(item.title)}</h1>
        ${buildColorDots(item.colors || [])}
        <div class="price" id="detailPriceValue">${formatPrice(displayPrice)}</div>
        <p class="product-detail-desc">${escapeHtml(item.description || "Chưa có mô tả sản phẩm.")}</p>
        <div class="detail-block">
          <h3>Chọn kích thước</h3>
          <div class="option-grid">${sizeButtons}</div>
        </div>
        <div class="detail-block">
          <h3>Chọn màu sắc</h3>
          <div class="color-grid">${colorButtons}</div>
        </div>
        <div class="detail-block">
          <h3>Thông tin thêm</h3>
          <div class="detail-meta-list">
            <div><strong>Tồn kho:</strong> <span id="detailStockValue">0</span></div>
            <div><strong>Giới tính:</strong> ${genderLabel(item.gender)}</div>
          </div>
        </div>
        <div class="row product-detail-actions">
          <a class="btn secondary" href="/products">Quay lại</a>
          <button class="btn primary" type="button" id="detailAddToCartBtn">Thêm vào giỏ hàng</button>
        </div>
      </div>
    </div>
  `;

  const stockValueEl = document.getElementById("detailStockValue");
  const priceValueEl = document.getElementById("detailPriceValue");
  const addBtn = document.getElementById("detailAddToCartBtn");
  let selectedSize = "";

  function syncDetailStock() {
    const found = Array.isArray(item.sizeStocks) ?
      item.sizeStocks.find(
        (s) => String(s.size || "") === String(selectedSize || ""),
      ) :
      null;
    const stockValue = selectedSize ?
      Number(found?.stock || 0) :
      Number(item.stock || 0);
    if (stockValueEl) stockValueEl.textContent = String(stockValue);
    if (priceValueEl)
      priceValueEl.textContent = formatPrice(
        getDisplayPrice(item, selectedSize),
      );
    if (addBtn) {
      addBtn.disabled = stockValue <= 0;
      addBtn.textContent = stockValue <= 0 ? "Hết hàng" : "Thêm vào giỏ hàng";
    }
    wrap.querySelectorAll("[data-detail-size]").forEach((btn) => {
      const btnSize = btn.getAttribute("data-detail-size") || "";
      const btnStock = btnSize ?
        Number(
          Array.isArray(item.sizeStocks) ?
          item.sizeStocks.find(
            (entry) => String(entry.size || "") === String(btnSize),
          )?.stock || 0 :
          0,
        ) :
        Number(item.stock || 0);
      btn.classList.toggle("sold-out", btnStock <= 0);
      btn.setAttribute(
        "aria-label",
        btnStock <= 0 ?
        `${btnSize} - Hết hàng` :
        `${btnSize} - Còn ${btnStock} sản phẩm`,
      );
      btn.title = btnStock <= 0 ? "Hết hàng" : `Còn ${btnStock} sản phẩm`;
    });
  }
  wrap.querySelectorAll("[data-detail-size]").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap
        .querySelectorAll("[data-detail-size]")
        .forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
      selectedSize = btn.getAttribute("data-detail-size") || "";
      syncDetailStock();
    });
  });
  selectedSize =
    wrap
    .querySelector("[data-detail-size].active")
    ?.getAttribute("data-detail-size") || "";
  syncDetailStock();
  if (addBtn)
    addBtn.addEventListener("click", () => {
      if (Array.isArray(item.sizes) && item.sizes.length && !selectedSize) {
        alert("Vui lòng chọn kích thước");
        return;
      }
      addToCart(item._id, true, {
        selectedSize
      });
    });
  wrap.querySelectorAll("[data-detail-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap
        .querySelectorAll("[data-detail-color]")
        .forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

async function initProductDetailPage() {
  await initCommonPage();
  const parts = window.location.pathname.split("/").filter(Boolean);
  const productId = parts[1];
  const wrap = getEl("productDetailWrap");
  if (!productId || !wrap) return;
  try {
    const item = await api.get("/api/v1/products/" + productId);
    renderProductDetail(item);
  } catch (error) {
    wrap.innerHTML = '<div class="panel">Không tìm thấy sản phẩm.</div>';
  }
}
window.initProductDetailPage = initProductDetailPage;

function renderLoyaltySummary(data) {
  const pointsEl = getEl("loyaltyPoints");
  const rewardsEl = getEl("loyaltyRewards");
  const couponsEl = getEl("myPointCoupons");
  const checkoutBox = getEl("loyaltyCheckoutBox");

  if (pointsEl)
    pointsEl.textContent = Number(data?.points || 0).toLocaleString("vi-VN");
  if (checkoutBox)
    checkoutBox.innerHTML = `<strong>${Number(data?.points || 0).toLocaleString("vi-VN")} điểm</strong><span class="meta"> • Mỗi 1.000đ trong đơn hàng = 1 điểm</span>`;

  if (rewardsEl) {
    const options = data?.rewardOptions || [];
    if (!options.length) {
      rewardsEl.innerHTML =
        '<div class="meta">Hiện chưa có quà đổi điểm khả dụng.</div>';
    } else {
      rewardsEl.innerHTML = options
        .map(
          (item) => `
        <button class="loyalty-redeem-card" type="button" onclick="redeemReward('${item._id}')">
          <strong>${Number(item.pointsCost || 0).toLocaleString("vi-VN")} điểm</strong>
          <span>${item.type === "percent" ? `Giảm ${Number(item.value || 0)}%` : `Giảm ${formatPrice(item.value || 0)}`}</span>
          <small class="meta">Còn ${Number(item.rewardStock || 0)} mã</small>
        </button>
      `,
        )
        .join("");
    }
  }

  if (couponsEl) {
    const coupons = (data?.coupons || []).filter(
      (item) =>
      item &&
      item.isActive !== false &&
      item.isUsedOnce !== true &&
      item.isDeleted !== true,
    );
    if (!coupons.length) {
      couponsEl.innerHTML = "";
    } else {
      couponsEl.innerHTML = `
        <div class="meta" style="margin-bottom:10px;">Mã giảm giá đã đổi từ điểm</div>
        <div class="coupon-owned-list">${coupons.map((item) => `<div class="owned-coupon"><strong>${escapeHtml(item.code)}</strong><span>${escapeHtml(item.type === "percent" ? `Giảm ${Number(item.value || 0)}%` : item.title || "")}</span></div>`).join("")}</div>
      `;
    }
  }
}

async function loadLoyaltySummary() {
  try {
    const data = await api.get("/api/v1/loyalty/me");
    renderLoyaltySummary(data || {});
  } catch (error) {
    const rewardsEl = getEl("loyaltyRewards");
    const couponsEl = getEl("myPointCoupons");
    const checkoutBox = getEl("loyaltyCheckoutBox");
    if (rewardsEl)
      rewardsEl.innerHTML =
      '<div class="meta">Đăng nhập để sử dụng tích điểm.</div>';
    if (couponsEl) couponsEl.innerHTML = "";
    if (checkoutBox)
      checkoutBox.innerHTML =
      '<span class="meta">Đăng nhập để xem điểm tích lũy.</span>';
  }
}

async function redeemReward(rewardId) {
  try {
    const result = await api.post("/api/v1/loyalty/redeem", {
      rewardId
    });
    const noticeEl = getEl("loyaltyMessage");
    if (noticeEl)
      showMessage(
        noticeEl,
        `Đổi điểm thành công. Mã của bạn: ${result.coupon.code}`,
      );
    await loadLoyaltySummary();
  } catch (error) {
    const noticeEl = getEl("loyaltyMessage");
    if (noticeEl)
      showMessage(noticeEl, error.message || "Không đổi được điểm", true);
  }
}
window.redeemReward = redeemReward;

async function initRewardsPage() {
  await initCommonPage();
  await loadLoyaltySummary();
  subscribeRealtime("loyalty.updated", async () => {
    try {
      await loadLoyaltySummary();
    } catch {}
  });
  subscribeRealtime("coupon.updated", async () => {
    try {
      await loadLoyaltySummary();
    } catch {}
  });
}
window.initRewardsPage = initRewardsPage;

function renderOrdersList(orders) {
  const list = getEl("ordersList");
  if (!list) return;
  const safeOrders = [...(orders || [])].sort((a, b) => {
    const ao = Number(a?.orderNumber || 0);
    const bo = Number(b?.orderNumber || 0);
    if (ao !== bo) return ao - bo;
    return new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0);
  });
  if (!safeOrders.length) {
    list.innerHTML = '<div class="empty-state">Bạn chưa có đơn hàng nào.</div>';
    return;
  }
  list.innerHTML = safeOrders
    .map((order) => {
      const created = order.createdAt ?
        new Date(order.createdAt).toLocaleString("vi-VN") :
        "";
      const statusText =
        order.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán";
      const deliveryText =
        order.deliveryStatus === "delivered" ?
        "Đã giao" :
        order.deliveryStatus === "shipping" ?
        "Đang giao" :
        "Chưa giao";
      const methodText =
        order.paymentMethod === "bank" ? "Chuyển khoản" : "COD";
      const items = (order.products || [])
        .filter((item) => String(item?.title || "").trim())
        .map(
          (item) =>
          `<div class="order-line"><span>${escapeHtml(item.title)} x ${item.quantity}</span><strong>${formatPrice(item.subtotal)}</strong></div>`,
        )
        .join("");
      return `
      <div class="order-card">
        <div class="row between order-card-head">
          <div>
            <strong>Đơn ${Number(order.displayOrderNumber || order.orderNumber || 0) || ""}</strong>
            <div class="meta">${created}</div>
          </div>
          <div class="order-status-wrap">
            <span class="badge">${methodText}</span>
            <span class="order-status ${escapeHtml(order.paymentStatus || "pending")}">${statusText}</span>
            <span class="order-status delivery ${escapeHtml(order.deliveryStatus || "pending")}">${deliveryText}</span>
          </div>
        </div>
        <div class="order-lines">${items}</div>
      </div>
    `;
    })
    .join("");
}

async function initOrdersPage() {
  await initCommonPage();
  const list = getEl("ordersList");
  if (!list) return;
  try {
    await loadLoyaltySummary();
    const orders = await api.get("/api/v1/payments/my-orders");
    renderOrdersList(orders);
    subscribeRealtime("order.created", async () => {
      try {
        renderOrdersList(await api.get("/api/v1/payments/my-orders"));
      } catch {}
    });
    subscribeRealtime("order.updated", async () => {
      try {
        renderOrdersList(await api.get("/api/v1/payments/my-orders"));
      } catch {}
    });
    subscribeRealtime("loyalty.updated", async () => {
      try {
        await loadLoyaltySummary();
      } catch {}
    });
    subscribeRealtime("coupon.updated", async () => {
      try {
        await loadLoyaltySummary();
      } catch {}
    });
  } catch (error) {
    list.innerHTML =
      '<div class="empty-state">Bạn cần đăng nhập để xem đơn hàng của mình.</div>';
  }
}
window.initOrdersPage = initOrdersPage;

function bindFilterToggles() {
  document.querySelectorAll("[data-filter-toggle]").forEach((button) => {
    const group = button.closest(".collapsible");
    const content = group ? group.querySelector(".filter-content") : null;
    if (!group || !content) return;

    const sync = () => {
      const isOpen = group.classList.contains("open");
      content.hidden = !isOpen;
      content.style.display = isOpen ? "" : "none";
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    };

    if (button.dataset.boundToggle === "1") {
      sync();
      return;
    }

    button.dataset.boundToggle = "1";
    sync();
    button.onclick = (event) => {
      event.preventDefault();
      group.classList.toggle("open");
      sync();
    };
  });
}
