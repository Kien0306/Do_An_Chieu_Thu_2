function rewardEl(id) {
  return document.getElementById(id);
}
const rewardGate = rewardEl("couponGate");
const rewardContent = rewardEl("couponContent");
const rewardAdminName = rewardEl("couponAdminName");
const rewardFormNotice = rewardEl("couponFormNotice");
const rewardFormTitle = rewardEl("couponFormTitle");
const rewardForm = rewardEl("couponForm");
const rewardTypeHint = rewardEl("rewardTypeHint");

function formatRewardValue(type, value) {
  const numericValue = Number(value || 0);
  return type === "percent" ? `${numericValue}%` : formatPrice(numericValue);
}

function syncRewardTypeHint() {
  if (!rewardTypeHint) return;
  const type = rewardEl("couponType")?.value || "fixed";
  rewardTypeHint.textContent =
    type === "percent" ?
    "Giảm theo % sẽ dùng đúng số phần trăm bạn nhập. Ví dụ nhập 10 là giảm 10%." :
    "Giảm tiền cố định sẽ dùng đúng số tiền bạn nhập.";
}

async function ensureRewardAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role?.name !== "ADMIN") {
    rewardGate.classList.remove("hidden");
    rewardContent.classList.add("hidden");
    throw new Error(
      "Bạn cần đăng nhập tài khoản ADMIN để vào trang mã đổi điểm.",
    );
  }
  rewardAdminName.textContent = user.fullName || user.username;
  rewardGate.classList.add("hidden");
  rewardContent.classList.remove("hidden");
}

function getRewardIdFromPath() {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts[0] === "admin" &&
    parts[1] === "reward-coupons" &&
    parts[2] === "edit" ?
    parts[3] :
    "";
}
async function loadRewardCoupon() {
  const id = getRewardIdFromPath();
  syncRewardTypeHint();
  if (!id) return;
  const item = await api.get("/api/v1/coupons/" + id);
  rewardEl("couponId").value = item._id;
  rewardEl("couponType").value = item.type || "fixed";
  rewardEl("couponValue").value = item.value || 0;
  rewardEl("couponPointsCost").value = item.pointsCost || 0;
  rewardEl("couponMaxDiscount").value = item.maxDiscount || 0;
  rewardEl("couponRewardStock").value = item.rewardStock || 0;
  rewardEl("couponActive").checked = item.isActive !== false;
  rewardFormTitle.textContent = "Sửa mã đổi điểm";
  document.title = "Sửa mã đổi điểm - Sport Store";
  syncRewardTypeHint();
}
rewardEl("couponType")?.addEventListener("change", syncRewardTypeHint);
rewardForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    showMessage(rewardFormNotice, "", false);
    const id = rewardEl("couponId").value;
    const type = rewardEl("couponType").value;
    const value = Number(rewardEl("couponValue").value || 0);
    const payload = {
      type,
      value,
      minOrderAmount: 0,
      maxDiscount: Number(rewardEl("couponMaxDiscount").value || 0),
      isActive: rewardEl("couponActive").checked,
      isPointCoupon: true,
      pointsCost: Number(rewardEl("couponPointsCost").value || 0),
      rewardStock: Number(rewardEl("couponRewardStock").value || 0),
    };
    if (id) await api.put("/api/v1/coupons/" + id, payload);
    else await api.post("/api/v1/coupons", payload);
    location.href = "/admin/reward-coupons";
  } catch (error) {
    showMessage(
      rewardFormNotice,
      error.message || "Không thể lưu mã đổi điểm",
      true,
    );
  }
});
rewardEl("cancelRewardCoupon")?.addEventListener("click", () => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  location.href = "/admin/reward-coupons";
});

rewardEl("logoutCouponAdmin")?.addEventListener("click", async () => {
  await api.post("/api/v1/auth/logout", {});
  location.href = "/";
});
(async function init() {
  try {
    await ensureRewardAdmin();
    await loadRewardCoupon();
  } catch (error) {
    showMessage(
      rewardFormNotice,
      error.message || "Không thể tải trang mã đổi điểm",
      true,
    );
  }
})();
