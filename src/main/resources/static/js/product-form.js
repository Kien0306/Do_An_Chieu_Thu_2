const productFormState = {
  currentUser: null,
  categories: [],
  mode: "create",
  productId: "",
  genders: [{
    value: "nam",
    label: "Nam"
  }, {
    value: "nu",
    label: "Nữ"
  }, {
    value: "unisex",
    label: "Unisex"
  }, ],
  sizes: [],
  colors: [],
  sizePriceMap: {},
  sizeStockMap: {},
};

function pf(id) {
  return document.getElementById(id);
}

function normalizeText(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function uniqueSizes(values = []) {
  const map = new Map();
  values.forEach((item) => {
    const label = normalizeText(item);
    if (!label) return;
    const key = label.toLowerCase();
    if (!map.has(key)) map.set(key, label);
  });
  return Array.from(map.values());
}

function uniqueColors(values = []) {
  const map = new Map();
  values.forEach((item) => {
    const name = normalizeText(item?.name || "");
    const hex = normalizeText(item?.hex || "").toLowerCase();
    if (!name || !hex) return;
    const key = name.toLowerCase();
    if (!map.has(key)) map.set(key, {
      name,
      hex
    });
  });
  return Array.from(map.values());
}

function buildSizePriceMap(sizePrices = [], fallbackPrice = 0) {
  const map = {};
  (Array.isArray(sizePrices) ? sizePrices : []).forEach((item) => {
    const size = normalizeText(item?.size || "");
    const price = Number(item?.price);
    if (!size || Number.isNaN(price) || price < 0) return;
    map[size] = price;
  });
  return map;
}

function buildSizeStockMap(sizeStocks = []) {
  const map = {};
  (Array.isArray(sizeStocks) ? sizeStocks : []).forEach((item) => {
    const size = normalizeText(item?.size || "");
    const stock = Number(item?.stock);
    if (!size || Number.isNaN(stock) || stock < 0) return;
    map[size] = stock;
  });
  return map;
}

function renderGenderOptions(selected = "unisex") {
  const wrap = pf("productGenderOptions");
  wrap.innerHTML = productFormState.genders
    .map(
      (item) => `
    <label class="choice-chip ${selected === item.value ? "active" : ""}">
      <input type="radio" name="productGender" value="${item.value}" ${selected === item.value ? "checked" : ""}>
      <span>${item.label}</span>
    </label>
  `,
    )
    .join("");
  bindChoiceChipEvents(wrap, "radio");
}

function renderSizeTags() {
  const wrap = pf("productSizeTags");
  wrap.innerHTML = productFormState.sizes.length ?
    productFormState.sizes
    .map(
      (item) => `
      <span class="tag-chip">${escapeHtml(item)}<button type="button" class="tag-remove" data-remove-size="${escapeHtml(item)}">×</button></span>
    `,
    )
    .join("") :
    '<div class="meta">Chưa có kích thước nào.</div>';
  wrap.querySelectorAll("[data-remove-size]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-remove-size");
      productFormState.sizes = productFormState.sizes.filter(
        (item) => item !== value,
      );
      delete productFormState.sizePriceMap[value];
      delete productFormState.sizeStockMap[value];
      renderSizeTags();
      renderSizePriceInputs();
      renderSizeStockInputs();
    });
  });
}

function renderSizePriceInputs() {
  const wrap = pf("productSizePriceWrap");
  if (!wrap) return;
  const fallbackPrice = Number(pf("productPrice")?.value || 0);
  if (!productFormState.sizes.length) {
    wrap.innerHTML =
      '<div class="meta">Thêm kích thước trước để nhập giá riêng cho từng size.</div>';
    return;
  }
  wrap.innerHTML = `
    <div class="meta" style="margin-bottom:12px;">Mỗi size có thể đặt giá riêng. Nếu bỏ trống, hệ thống dùng giá mặc định.</div>
    <div class="form-grid">
      ${productFormState.sizes
        .map((size) => {
          const currentValue = productFormState.sizePriceMap[size];
          const displayValue =
            currentValue !== undefined &&
            currentValue !== null &&
            currentValue !== ""
              ? currentValue
              : fallbackPrice;
          return `
          <div>
            <label>Size ${escapeHtml(size)}</label>
            <input type="number" min="0" data-size-price="${escapeHtml(size)}" value="${displayValue}">
          </div>
        `;
        })
        .join("")}
    </div>
  `;
  wrap.querySelectorAll("[data-size-price]").forEach((input) => {
    input.addEventListener("input", () => {
      const size = input.getAttribute("data-size-price");
      productFormState.sizePriceMap[size] = Number(input.value || 0);
    });
  });
}

function renderSizeStockInputs() {
  const wrap = pf("productSizeStockWrap");
  if (!wrap) return;
  if (!productFormState.sizes.length) {
    wrap.innerHTML =
      '<div class="meta">Thêm kích thước trước để nhập tồn kho cho từng size.</div>';
    return;
  }
  wrap.innerHTML = `
    <div class="meta" style="margin-bottom:12px;">Nhập số lượng tồn kho cho từng size. Hệ thống sẽ dùng dữ liệu này cho trang Kho và sản phẩm.</div>
    <div class="form-grid">
      ${productFormState.sizes
        .map((size) => {
          const currentValue = Number(productFormState.sizeStockMap[size] ?? 0);
          return `
          <div>
            <label>Size ${escapeHtml(size)}</label>
            <input type="number" min="0" data-size-stock="${escapeHtml(size)}" value="${currentValue}">
          </div>
        `;
        })
        .join("")}
    </div>
  `;
  wrap.querySelectorAll("[data-size-stock]").forEach((input) => {
    input.addEventListener("input", () => {
      const size = input.getAttribute("data-size-stock");
      productFormState.sizeStockMap[size] = Math.max(
        0,
        Number(input.value || 0),
      );
    });
  });
}

function renderColorTags() {
  const wrap = pf("productColorTags");
  wrap.innerHTML = productFormState.colors.length ?
    productFormState.colors
    .map(
      (item) => `
      <span class="color-tag-chip"><span class="color-choice-dot" style="background:${escapeHtml(item.hex)}"></span><span>${escapeHtml(item.name)}</span><button type="button" class="tag-remove" data-remove-color="${escapeHtml(item.name)}">×</button></span>
    `,
    )
    .join("") :
    '<div class="meta">Chưa có màu sắc nào.</div>';
  wrap.querySelectorAll("[data-remove-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-remove-color");
      productFormState.colors = productFormState.colors.filter(
        (item) => item.name !== value,
      );
      renderColorTags();
    });
  });
}

function bindChoiceChipEvents(wrap, type) {
  wrap.querySelectorAll("label").forEach((label) => {
    const input = label.querySelector("input");
    input.addEventListener("change", () => {
      if (type === "radio") {
        wrap
          .querySelectorAll("label")
          .forEach((item) => item.classList.remove("active"));
        label.classList.add("active");
      } else {
        label.classList.toggle("active", input.checked);
      }
    });
  });
}

function getSelectedGender() {
  return (
    document.querySelector('input[name="productGender"]:checked')?.value ||
    "unisex"
  );
}

function setProductFormValues(item) {
  const imageValue = item?.images?.[0] || "";
  pf("productId").value = item?._id || "";
  pf("productTitle").value = item?.title || "";
  pf("productPrice").value = item?.price || "";
  pf("productImage").value = imageValue;
  pf("productDescription").value = item?.description || "";
  pf("productFeatured").checked = Boolean(item?.isFeatured);
  pf("productCategory").value =
    item?.category?._id || productFormState.categories[0]?._id || "";
  productFormState.sizes = uniqueSizes(item?.sizes || []);
  productFormState.sizePriceMap = buildSizePriceMap(
    item?.sizePrices || [],
    item?.price || 0,
  );
  productFormState.sizeStockMap = buildSizeStockMap(item?.sizeStocks || []);
  productFormState.colors = uniqueColors(item?.colors || []);
  renderGenderOptions(item?.gender || "unisex");
  renderSizeTags();
  renderSizePriceInputs();
  renderSizeStockInputs();
  renderColorTags();
  setPreviewImage(pf("productImagePreview"), imageValue);
}

async function ensureProductAdmin() {
  await initCommonPage();
  const user = await getCurrentUser();
  productFormState.currentUser = user;
  if (!user || user.role?.name !== "ADMIN") {
    window.location.href = "/login";
    return false;
  }
  return true;
}

async function loadProductFormCategories() {
  productFormState.categories = await api.get("/api/v1/categories");
  pf("productCategory").innerHTML = productFormState.categories
    .map((item) => `<option value="${item._id}">${item.name}</option>`)
    .join("");
}

async function handleProductImageChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const dataUrl = await readFileAsDataUrl(file);
  try {
    const uploaded = await api.request("/api/v1/uploads", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "image/*",
        data: dataUrl,
      }),
    });
    const storedData = uploaded?.file?.data || dataUrl;
    pf("productImage").value = storedData;
    setPreviewImage(pf("productImagePreview"), storedData);
  } catch (error) {
    pf("productImage").value = dataUrl;
    setPreviewImage(pf("productImagePreview"), dataUrl);
  }
}

function setupSizeInput() {
  const input = pf("productSizeInput");
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const value = normalizeText(input.value);
    if (!value) return;
    productFormState.sizes = uniqueSizes([...productFormState.sizes, value]);
    if (productFormState.sizePriceMap[value] === undefined)
      productFormState.sizePriceMap[value] = Number(
        pf("productPrice")?.value || 0,
      );
    if (productFormState.sizeStockMap[value] === undefined)
      productFormState.sizeStockMap[value] = 0;
    input.value = "";
    renderSizeTags();
    renderSizePriceInputs();
    renderSizeStockInputs();
  });
}

function setupColorInput() {
  const nameInput = pf("productColorNameInput");
  const hexInput = pf("productColorHexInput");
  nameInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const name = normalizeText(nameInput.value);
    const hex = normalizeText(hexInput.value || "#2563eb");
    if (!name) return;
    productFormState.colors = uniqueColors([
      ...productFormState.colors, {
        name,
        hex
      },
    ]);
    nameInput.value = "";
    renderColorTags();
  });
}

async function setupProductFormPage() {
  const ok = await ensureProductAdmin();
  if (!ok) return;

  await loadProductFormCategories();
  pf("productImageFile").addEventListener("change", handleProductImageChange);
  setupSizeInput();
  setupColorInput();
  pf("productPrice").addEventListener("input", renderSizePriceInputs);

  const path = window.location.pathname;
  const titleEl = pf("productFormTitle");
  const subtitleEl = pf("productFormSubtitle");
  const submitBtn = pf("submitProductBtn");
  const messageEl = pf("productFormMessage");
  const form = pf("productForm");

  if (path.startsWith("/products/edit")) {
    productFormState.mode = "edit";
    productFormState.productId = path.split("/").pop();
    titleEl.textContent = "Sửa sản phẩm";
    subtitleEl.textContent = "Cập nhật thông tin sản phẩm trong hệ thống.";
    submitBtn.textContent = "Cập nhật sản phẩm";
    try {
      const item = await api.get(
        "/api/v1/products/" + productFormState.productId,
      );
      setProductFormValues(item);
    } catch (error) {
      showMessage(messageEl, error.message, true);
    }
  } else {
    setProductFormValues();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage(messageEl);
    const imageValue = pf("productImage").value.trim();
    if (!imageValue) {
      showMessage(messageEl, "Vui lòng chọn ảnh sản phẩm", true);
      return;
    }
    if (!productFormState.sizes.length) {
      showMessage(
        messageEl,
        "Vui lòng nhập ít nhất 1 kích thước rồi nhấn Enter",
        true,
      );
      return;
    }
    if (!productFormState.colors.length) {
      showMessage(
        messageEl,
        "Vui lòng nhập ít nhất 1 màu sắc rồi nhấn Enter",
        true,
      );
      return;
    }
    const body = {
      title: pf("productTitle").value.trim(),
      price: Number(pf("productPrice").value),
      sizePrices: productFormState.sizes.map((size) => ({
        size,
        price: Number(
          productFormState.sizePriceMap[size] ?? pf("productPrice").value ?? 0,
        ),
      })),
      sizeStocks: productFormState.sizes.map((size) => ({
        size,
        stock: Math.max(0, Number(productFormState.sizeStockMap[size] || 0)),
      })),
      images: [imageValue],
      description: pf("productDescription").value.trim(),
      category: pf("productCategory").value,
      gender: getSelectedGender(),
      sizes: productFormState.sizes,
      colors: productFormState.colors,
      isFeatured: pf("productFeatured").checked,
    };
    try {
      if (productFormState.mode === "edit") {
        await api.put("/api/v1/products/" + productFormState.productId, body);
      } else {
        await api.post("/api/v1/products", body);
      }
      window.location.href = "/products";
    } catch (error) {
      showMessage(messageEl, error.message, true);
    }
  });
}

setupProductFormPage();
