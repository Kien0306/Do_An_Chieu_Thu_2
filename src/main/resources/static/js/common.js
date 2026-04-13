const API_BASE =
  window.location.port === "5173" || window.location.port === "4173" ?
  "http://localhost:3000" :
  "";

function withApiBase(url) {
  if (!url) return API_BASE;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url}`;
}

const api = {
  async request(url, options = {}) {
    const isFormData = options.body instanceof FormData;
    const response = await fetch(withApiBase(url), {
      credentials: "include",
      headers: isFormData ?
        options.headers || {} :
        {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
      cache: "no-store",
      ...options,
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = text;
    }
    if (!response.ok) {
      const error = new Error(
        (data && data.message) || data || "Có lỗi xảy ra",
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  },
  get(url) {
    return this.request(url);
  },
  post(url, body) {
    return this.request(url, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },
  put(url, body) {
    return this.request(url, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  },
  delete(url) {
    return this.request(url, {
      method: "DELETE"
    });
  },
};

function formatPrice(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + "đ";
}

function showMessage(el, message, isError = false) {
  if (!el) return;
  el.className = "notice" + (isError ? " error" : "");
  el.textContent = message;
  el.classList.remove("hidden");
}

function hideMessage(el) {
  if (!el) return;
  el.classList.add("hidden");
}

async function getCurrentUser() {
  try {
    return await api.get("/api/v1/auth/me");
  } catch {
    return null;
  }
}

function iconSvg(type) {
  if (type === "user") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>';
  }
  if (type === "logout") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
  }
  if (type === "gift") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13"/><path d="M3 12h18"/><path d="M12 8H7.5a2.5 2.5 0 1 1 0-5c3 0 4.5 5 4.5 5Z"/><path d="M12 8h4.5a2.5 2.5 0 1 0 0-5c-3 0-4.5 5-4.5 5Z"/></svg>';
  }
  return "";
}

function renderHeaderUser() {
  const userArea = document.getElementById("userArea");
  const adminLink = document.getElementById("adminLink");
  const ordersLink = document.getElementById("ordersLink");
  if (!userArea) return;

  if (!window.shopState || !window.shopState.currentUser) {
    userArea.innerHTML = `<a class="icon-button" href="/login" title="Đăng nhập" aria-label="Đăng nhập">${iconSvg("user")}</a>`;
    if (adminLink) adminLink.classList.add("hidden");
    if (ordersLink) ordersLink.classList.add("hidden");
    return;
  }

  const currentUser = window.shopState.currentUser;
  const roleName = currentUser.role?.name || "";
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

  const logoutBtn = document.getElementById("logoutBtn");
  const userMenuBtn = document.getElementById("userMenuBtn");
  const userMenuDropdown = document.getElementById("userMenuDropdown");
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
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await api.post("/api/v1/auth/logout", {});
      window.shopState.currentUser = null;
      renderHeaderUser();
      if (typeof toggleProductAdminTools === "function")
        toggleProductAdminTools();
      const cartCount = document.getElementById("cartCount");
      if (cartCount) cartCount.textContent = "0";
      if (location.pathname === "/cart" && typeof loadCartPage === "function")
        await loadCartPage();
      if (
        location.pathname === "/products" &&
        typeof loadProducts === "function"
      )
        await loadProducts();
      if (location.pathname === "/" && typeof loadHomeProducts === "function")
        await loadHomeProducts();
      if (location.pathname === "/orders" || location.pathname === "/rewards")
        window.location.href = "/";
    };
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("không đọc được file ảnh"));
    reader.readAsDataURL(file);
  });
}

function setPreviewImage(imgEl, value) {
  if (!imgEl) return;
  if (!value) {
    imgEl.src = "";
    imgEl.classList.add("hidden");
    return;
  }
  imgEl.src = value;
  imgEl.classList.remove("hidden");
}

const realtimeHandlers = {};
let realtimeSource = null;

function subscribeRealtime(type, handler) {
  if (!type || typeof handler !== "function") return () => {};
  if (!realtimeHandlers[type]) realtimeHandlers[type] = new Set();
  realtimeHandlers[type].add(handler);
  ensureRealtimeConnection();
  return () => realtimeHandlers[type] && realtimeHandlers[type].delete(handler);
}

function dispatchRealtime(payload) {
  const handlers = realtimeHandlers[payload?.type] || realtimeHandlers["*"];
  if (!handlers) return;
  handlers.forEach((fn) => {
    try {
      fn(payload);
    } catch (error) {
      console.error(error);
    }
  });
}

function ensureRealtimeConnection() {
  if (realtimeSource || typeof EventSource === "undefined") return;
  realtimeSource = new EventSource(withApiBase("/api/v1/events/stream"), {
    withCredentials: true,
  });
  realtimeSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data || "{}");
      dispatchRealtime(payload);
    } catch (error) {
      console.error("Realtime parse error", error);
    }
  };
  realtimeSource.onerror = () => {
    if (realtimeSource) realtimeSource.close();
    realtimeSource = null;
    setTimeout(ensureRealtimeConnection, 2000);
  };
}

function isStorefrontPrimaryPage() {
  const path = window.location.pathname || "/";
  return path === "/" || path === "/products";
}

function shouldRenderFloatingSupport() {
  return isStorefrontPrimaryPage();
}

const SUPPORT_CONFIG = {
  phoneDisplay: "0943.545.478",
  phoneLink: "1900272737",
  phoneLabel: "Hotline",
  zaloUrl: "https://zalo.me/0943545478",
};

const SITE_CONTACT_CONFIG = {
  heading: "KINGSPORT lắng nghe bạn!",
  description: "Chúng tôi luôn trân trọng và mong đợi nhận được mọi ý kiến đóng góp để có thể nâng cấp trải nghiệm dịch vụ và sản phẩm tốt hơn nữa.",
  phoneTitle: "Hotline",
  phoneDisplay: "0943.545.478",
  phoneLink: "0943545478",
  emailTitle: "Email",
  emailDisplay: "kien16092013@gmail.com",
  emailLink: "mailto:kien16092013@gmail.com",
  socials: [{
    label: "Facebook",
    href: "https://www.facebook.com/tran.kien.331739/",
    key: "facebook"
  }, {
    label: "Zalo",
    href: "https://zalo.me/0943545478",
    key: "zalo"
  }, {
    label: "TikTok",
    href: "https://www.tiktok.com/@gemini030624?_r=1&_t=ZS-95HH8ezC18n",
    key: "tiktok"
  }, {
    label: "Instagram",
    href: "https://www.instagram.com/_kien0306_?igsh=MWJtbzNpamJxeTZmbg==",
    key: "instagram"
  }, ],
};

function socialIconSvg(key) {
  if (key === "facebook")
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-8h2.7l.5-3h-3.2V8.1c0-.9.4-1.6 1.8-1.6H17V3.8c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.5v3h2.8v8h3.2z"/></svg>';
  if (key === "zalo")
    return '<span class="site-footer-social-text">Zalo</span>';
  if (key === "tiktok")
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14.5 3h2.6c.2 1.4 1 2.6 2.4 3.2v2.7c-1.1 0-2.2-.3-3.1-.9v6.2c0 3-2.4 5.3-5.4 5.3S5.6 17.2 5.6 14.2s2.4-5.4 5.4-5.4h.7v2.8H11c-1.4 0-2.5 1.1-2.5 2.6s1.1 2.5 2.5 2.5 2.6-1.1 2.6-2.5V3z"/></svg>';
  if (key === "instagram")
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
  if (key === "youtube")
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.8 8.2a2.8 2.8 0 0 0-2-2c-1.8-.5-7.8-.5-7.8-.5s-6 0-7.8.5a2.8 2.8 0 0 0-2 2C1.7 10 1.7 12 1.7 12s0 2 .5 3.8a2.8 2.8 0 0 0 2 2c1.8.5 7.8.5 7.8.5s6 0 7.8-.5a2.8 2.8 0 0 0 2-2c.5-1.8.5-3.8.5-3.8s0-2-.5-3.8ZM10 15.3V8.7l5.8 3.3L10 15.3Z"/></svg>';
  return '<span class="site-footer-social-text">' + key + "</span>";
}

function renderSiteFooter() {
  if (!isStorefrontPrimaryPage()) return;
  if (document.getElementById("siteContactFooter")) return;
  const main = document.querySelector("main");
  if (!main) return;
  const footer = document.createElement("section");
  footer.id = "siteContactFooter";
  footer.className = "site-contact-footer";
  footer.innerHTML = `
    <div class="site-contact-card">
      <div class="site-contact-copy">
        <h2>${SITE_CONTACT_CONFIG.heading}</h2>
        <p>${SITE_CONTACT_CONFIG.description}</p>
        <div class="site-contact-socials">
          ${SITE_CONTACT_CONFIG.socials
            .map(
              (item) => `
            <a class="site-footer-social" href="${item.href}" target="_blank" rel="noopener noreferrer" aria-label="${item.label}">
              ${socialIconSvg(item.key)}
            </a>
          `,
            )
            .join("")}
        </div>
      </div>
      <div class="site-contact-meta">
        <a class="site-contact-item" href="tel:${SITE_CONTACT_CONFIG.phoneLink}">
          <span class="site-contact-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.63 2.62a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6.09 6.09l1.46-1.24a2 2 0 0 1 2.11-.45c.84.3 1.72.51 2.62.63A2 2 0 0 1 22 16.92z"></path></svg>
          </span>
          <span class="site-contact-text"><small>${SITE_CONTACT_CONFIG.phoneTitle}</small><strong>${SITE_CONTACT_CONFIG.phoneDisplay}</strong></span>
        </a>
        <a class="site-contact-item" href="${SITE_CONTACT_CONFIG.emailLink}">
          <span class="site-contact-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16v12H4z"></path><path d="m4 7 8 6 8-6"></path></svg>
          </span>
          <span class="site-contact-text"><small>${SITE_CONTACT_CONFIG.emailTitle}</small><strong>${SITE_CONTACT_CONFIG.emailDisplay}</strong></span>
        </a>
      </div>
    </div>
  `;
  main.insertAdjacentElement("afterend", footer);
}

function renderFloatingSupportWidget() {
  if (!shouldRenderFloatingSupport()) return;
  if (document.getElementById("floatingSupportWidget")) return;
  const wrapper = document.createElement("div");
  wrapper.id = "floatingSupportWidget";
  wrapper.innerHTML = `
    <button class="floating-circle back-to-top" id="backToTopBtn" type="button" aria-label="Lên đầu trang">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
    </button>
    <div class="floating-support single-phone-support" id="floatingSupportDock">
      <button class="floating-circle floating-phone-single" id="floatingSupportBubble" type="button" aria-label="Mở hỗ trợ">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.63 2.62a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6.09 6.09l1.46-1.24a2 2 0 0 1 2.11-.45c.84.3 1.72.51 2.62.63A2 2 0 0 1 22 16.92z"></path></svg>
      </button>
      <div class="floating-support-menu" id="floatingSupportMenu">
        <a class="floating-circle floating-mini-action floating-zalo" href="${SUPPORT_CONFIG.zaloUrl}" target="_blank" rel="noopener noreferrer" aria-label="Zalo">Zalo</a>
        <div class="floating-phone-row" id="floatingPhoneRow">
          <div class="floating-support-phone-card hidden" id="floatingSupportPhoneCard"><span class="floating-support-phone-icon">☎</span><span>${SUPPORT_CONFIG.phoneDisplay}</span></div>
          <button class="floating-circle floating-mini-action floating-phone" id="floatingPhoneBtn" type="button" aria-label="Gọi hotline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.63 2.62a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6.09 6.09l1.46-1.24a2 2 0 0 1 2.11-.45c.84.3 1.72.51 2.62.63A2 2 0 0 1 22 16.92z"></path></svg>
          </button>
        </div>
        <button class="floating-circle floating-mini-action floating-close" id="floatingCloseBtn" type="button" aria-label="Đóng hỗ trợ">×</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);

  const backBtn = document.getElementById("backToTopBtn");
  const dock = document.getElementById("floatingSupportDock");
  const bubble = document.getElementById("floatingSupportBubble");
  const closeBtn = document.getElementById("floatingCloseBtn");
  const phoneBtn = document.getElementById("floatingPhoneBtn");
  const phoneCard = document.getElementById("floatingSupportPhoneCard");

  const syncTopBtn = () =>
    backBtn?.classList.toggle("visible", window.scrollY > 180);
  backBtn?.addEventListener("click", () =>
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    }),
  );
  window.addEventListener("scroll", syncTopBtn, {
    passive: true
  });
  syncTopBtn();

  bubble?.addEventListener("click", () => dock?.classList.add("open"));
  closeBtn?.addEventListener("click", () => {
    dock?.classList.remove("open");
    phoneCard?.classList.add("hidden");
  });

  let phoneHoverTimer = null;
  const showPhoneCard = () => {
    if (!phoneCard) return;
    if (phoneHoverTimer) clearTimeout(phoneHoverTimer);
    phoneCard.classList.remove("hidden");
  };
  const hidePhoneCard = () => {
    if (!phoneCard) return;
    if (phoneHoverTimer) clearTimeout(phoneHoverTimer);
    phoneHoverTimer = setTimeout(() => phoneCard.classList.add("hidden"), 120);
  };
  phoneBtn?.addEventListener("mouseenter", showPhoneCard);
  phoneCard?.addEventListener("mouseenter", showPhoneCard);
  phoneBtn?.addEventListener("mouseleave", hidePhoneCard);
  phoneCard?.addEventListener("mouseleave", hidePhoneCard);
  phoneBtn?.addEventListener("focus", showPhoneCard);
  phoneBtn?.addEventListener("blur", hidePhoneCard);
  phoneBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    showPhoneCard();
    window.location.href = `tel:${SUPPORT_CONFIG.phoneLink}`;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    renderFloatingSupportWidget();
    renderSiteFooter();
  });
} else {
  renderFloatingSupportWidget();
  renderSiteFooter();
}


function enableLiveRefresh(options = {}) {
  const selector = options.selector || 'main';
  const interval = Number(options.interval || 4000);
  const onlyPaths = options.onlyPaths || [];
  const skipIfFocused = options.skipIfFocused !== false;
  const path = window.location.pathname || '/';
  if (onlyPaths.length && !onlyPaths.includes(path)) return;
  let busy = false;
  let lastHtml = '';
  async function tick() {
    if (busy || document.hidden) return;
    if (skipIfFocused) {
      const active = document.activeElement;
      const tag = active?.tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    }
    busy = true;
    try {
      const res = await fetch(window.location.href, { headers: { 'X-Requested-With': 'live-refresh' }, cache: 'no-store' });
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const next = doc.querySelector(selector);
      const current = document.querySelector(selector);
      if (next && current) {
        const nextHtml = next.innerHTML;
        if (nextHtml !== lastHtml && nextHtml !== current.innerHTML) {
          current.innerHTML = nextHtml;
          lastHtml = nextHtml;
        }
      }
      const nextCount = doc.getElementById('cartCount');
      const curCount = document.getElementById('cartCount');
      if (nextCount && curCount) curCount.textContent = nextCount.textContent;
    } catch (e) {
      console.debug('live refresh skip', e);
    } finally {
      busy = false;
    }
  }
  setInterval(tick, interval);
}
