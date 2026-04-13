function couponEl(id) {
  return document.getElementById(id);
}
const couponGate = couponEl("couponGate");
const couponContent = couponEl("couponContent");
const couponAdminName = couponEl("couponAdminName");
const couponFormNotice = couponEl("couponFormNotice");
const couponFormTitle = couponEl("couponFormTitle");
const couponForm = couponEl("couponForm");

async function ensureCouponAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role?.name !== "ADMIN") {
    couponGate.classList.remove("hidden");
    couponContent.classList.add("hidden");
    throw new Error(
      "Bạn cần đăng nhập tài khoản ADMIN để vào trang mã giảm giá.",
    );
  }
  couponAdminName.textContent = user.fullName || user.username;
  couponGate.classList.add("hidden");
  couponContent.classList.remove("hidden");
}

function getCouponIdFromPath() {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts[0] === "admin" && parts[1] === "coupons" && parts[2] === "edit" ?
    parts[3] :
    "";
}

async function loadCoupon() {
  const id = getCouponIdFromPath();
  if (!id) return;
  const item = await api.get("/api/v1/coupons/" + id);
  if (item.isPointCoupon) {
    throw new Error("Đây là mã đổi điểm. Hãy chỉnh sửa ở phần Mã đổi điểm.");
  }
  couponEl("couponId").value = item._id;
  couponEl("couponCode").value = item.code || "";
  couponEl("couponTitle").value = item.title || "";
  couponEl("couponType").value = item.type || "fixed";
  couponEl("couponValue").value = item.value || 0;
  couponEl("couponMinOrder").value = item.minOrderAmount || 0;
  couponEl("couponMaxDiscount").value = item.maxDiscount || 0;
  couponEl("couponActive").checked = item.isActive !== false;
  couponFormTitle.textContent = "Sửa mã giảm giá";
  document.title = "Sửa mã giảm giá - Sport Store";
}

couponForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    hideMessage(couponFormNotice);
    const id = couponEl("couponId").value;
    const payload = {
      code: couponEl("couponCode").value.trim().toUpperCase(),
      title: couponEl("couponTitle").value.trim(),
      type: couponEl("couponType").value,
      value: Number(couponEl("couponValue").value || 0),
      minOrderAmount: Number(couponEl("couponMinOrder").value || 0),
      maxDiscount: Number(couponEl("couponMaxDiscount").value || 0),
      isActive: couponEl("couponActive").checked,
      isPointCoupon: false,
      pointsCost: 0,
      rewardStock: 0,
    };
    if (id) await api.put("/api/v1/coupons/" + id, payload);
    else await api.post("/api/v1/coupons", payload);
    location.href = "/admin/coupons";
  } catch (error) {
    showMessage(
      couponFormNotice,
      error.message || "Không thể lưu mã giảm giá",
      true,
    );
  }
});

couponEl("logoutCouponAdmin")?.addEventListener("click", async () => {
  await api.post("/api/v1/auth/logout", {});
  location.href = "/";
});

(async function init() {
  try {
    await ensureCouponAdmin();
    await loadCoupon();
  } catch (error) {
    showMessage(
      couponFormNotice,
      error.message || "Không thể tải trang mã giảm giá",
      true,
    );
  }
})();
