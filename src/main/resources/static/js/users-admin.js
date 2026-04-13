const usersGate = document.getElementById("usersGate");
const usersContent = document.getElementById("usersContent");
const usersNotice = document.getElementById("usersNotice");
const userTable = document.getElementById("userTable");
const usersAdminName = document.getElementById("usersAdminName");

async function ensureAdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role?.name !== "ADMIN") {
    usersGate.classList.remove("hidden");
    usersContent.classList.add("hidden");
    throw new Error(
      "Bạn cần đăng nhập tài khoản ADMIN để vào trang người dùng.",
    );
  }
  usersAdminName.textContent = user.fullName || user.username;
  usersGate.classList.add("hidden");
  usersContent.classList.remove("hidden");
}

async function loadUsersPage() {
  const users = await api.get("/api/v1/users");
  renderUsers(users || []);
}

function renderUsers(users) {
  if (!users.length) {
    userTable.innerHTML =
      '<tr><td colspan="6" class="meta">Chưa có người dùng nào.</td></tr>';
    return;
  }
  userTable.innerHTML = users
    .map((item) => {
      const isSystemAdmin = item.username === "admin";
      const isActive = item.status === true;
      return `
      <tr>
        <td class="user-cell">${item.username}</td>
        <td class="user-cell">${item.fullName || ""}</td>
        <td class="user-cell">${item.email}</td>
        <td class="user-cell">${item.role?.name || ""}</td>
        <td class="user-cell">${isActive ? "Hoạt động" : "Đã khóa"}</td>
        <td class="user-cell user-action-cell">
          ${
            isSystemAdmin
              ? '<span class="meta">Tài khoản hệ thống</span>'
              : `
            <div class="admin-user-actions">
              <button class="btn secondary" onclick="toggleLockUser('${item._id}')">${isActive ? "Khóa" : "Mở khóa"}</button>
              <button class="btn danger" onclick="deleteUser('${item._id}')">Xoá</button>
            </div>`
          }
        </td>
      </tr>
    `;
    })
    .join("");
}

window.toggleLockUser = async (id) => {
  try {
    await api.post("/api/v1/users/" + id + "/toggle-lock", {});
    showMessage(usersNotice, "Đã cập nhật trạng thái người dùng");
    await loadUsersPage();
  } catch (error) {
    showMessage(usersNotice, error.message, true);
  }
};

window.deleteUser = async (id) => {
  try {
    await api.delete("/api/v1/users/" + id);
    showMessage(usersNotice, "Đã xoá người dùng");
    await loadUsersPage();
  } catch (error) {
    showMessage(usersNotice, error.message, true);
  }
};

document.getElementById("logoutUsersAdmin").onclick = async () => {
  await api.post("/api/v1/auth/logout", {});
  location.href = "/";
};

(async function init() {
  try {
    await ensureAdminPage();
    await loadUsersPage();
    subscribeRealtime("user.updated", async () => {
      try {
        await loadUsersPage();
      } catch {}
    });
  } catch (error) {
    showMessage(usersNotice, error.message, true);
  }
})();
