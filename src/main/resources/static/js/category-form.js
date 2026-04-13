const categoryFormState = {
  currentUser: null,
  mode: "create",
  categoryId: "",
};

function cf(id) {
  return document.getElementById(id);
}

function setCategoryFormValues(item) {
  const imageValue = item?.image || "";
  cf("categoryId").value = item?._id || "";
  cf("categoryName").value = item?.name || "";
  cf("categoryImage").value = imageValue;
}

async function ensureCategoryAdmin() {
  await initCommonPage();
  const user = await getCurrentUser();
  categoryFormState.currentUser = user;
  if (!user || user.role?.name !== "ADMIN") {
    window.location.href = "/login";
    return false;
  }
  return true;
}

async function setupCategoryFormPage() {
  const ok = await ensureCategoryAdmin();
  if (!ok) return;

  const path = window.location.pathname;
  const titleEl = cf("categoryFormTitle");
  const subtitleEl = cf("categoryFormSubtitle");
  const submitBtn = cf("submitCategoryBtn");
  const messageEl = cf("categoryFormMessage");
  const form = cf("categoryForm");

  if (path.startsWith("/categories/edit")) {
    categoryFormState.mode = "edit";
    categoryFormState.categoryId = path.split("/").pop();
    titleEl.textContent = "Sửa danh mục";
    subtitleEl.textContent = "Cập nhật thông tin danh mục trong hệ thống.";
    submitBtn.textContent = "Cập nhật danh mục";
    try {
      const item = await api.get(
        "/api/v1/categories/" + categoryFormState.categoryId,
      );
      setCategoryFormValues(item);
    } catch (error) {
      showMessage(messageEl, error.message, true);
    }
  } else {
    setCategoryFormValues();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage(messageEl);
    const body = {
      name: cf("categoryName").value.trim(),
    };
    try {
      if (categoryFormState.mode === "edit") {
        await api.put(
          "/api/v1/categories/" + categoryFormState.categoryId,
          body,
        );
      } else {
        await api.post("/api/v1/categories", body);
      }
      window.location.href = "/admin";
    } catch (error) {
      showMessage(messageEl, error.message, true);
    }
  });
}

setupCategoryFormPage();
