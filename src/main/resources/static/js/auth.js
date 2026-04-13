const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authMessage = document.getElementById("authMessage");

async function bootstrapAuthPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const redirectPath = currentUser.role?.name === "ADMIN" ? "/admin" : "/";
    window.location.href = redirectPath;
    return;
  }
  const url = new URL(window.location.href);
  if (url.searchParams.get("registered") === "1" && authMessage) {
    showMessage(authMessage, "Đăng ký thành công, mời bạn đăng nhập");
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage(authMessage);
    try {
      const form = new FormData(loginForm);
      const body = Object.fromEntries(form.entries());
      const result = await api.post("/api/v1/auth/login", body);
      const nextUrl = result.user?.role?.name === "ADMIN" ? "/admin" : "/";
      window.location.href = nextUrl;
    } catch (error) {
      showMessage(authMessage, error.message, true);
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage(authMessage);
    try {
      const form = new FormData(registerForm);
      const body = Object.fromEntries(form.entries());
      await api.post("/api/v1/auth/register", body);
      window.location.href = "/login?registered=1";
    } catch (error) {
      showMessage(authMessage, error.message, true);
    }
  });
}

bootstrapAuthPage();
