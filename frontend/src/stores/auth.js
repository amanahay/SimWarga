import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { authAPI } from "@/services/api";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(null);
  const token = ref(localStorage.getItem("simwarga_token") || null);
  const isDark = ref(false);
  const isLoggingIn = ref(false);
  const loginError = ref("");

  const isAuthenticated = computed(() => !!token.value);
  const isSuperAdmin = computed(
    () =>
      user.value?.role === "SuperAdmin" || user.value?.Role === "SuperAdmin",
  );
  const userName = computed(
    () => user.value?.name || user.value?.NamaLengkap || "User",
  );
  const userRole = computed(() => user.value?.role || user.value?.Role || "");
  const userInitials = computed(() => {
    const name = userName.value;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  });

  async function login(username, password) {
    isLoggingIn.value = true;
    loginError.value = "";
    try {
      const response = await authAPI.login(username, password);
      const { token: jwtToken, user: userData } = response.data;
      token.value = jwtToken;
      user.value = userData;
      localStorage.setItem("simwarga_token", jwtToken);
      localStorage.setItem("simwarga_user", JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (error) {
      const msg = error.response?.data?.error || "Gagal terhubung ke server";
      loginError.value = msg;
      return { success: false, message: msg };
    } finally {
      isLoggingIn.value = false;
    }
  }

  async function fetchMe() {
    if (!token.value) return;
    try {
      const response = await authAPI.me();
      user.value = response.data.user;
      localStorage.setItem("simwarga_user", JSON.stringify(response.data.user));
    } catch (error) {
      if (error.response?.status === 401) logout();
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    loginError.value = "";
    localStorage.removeItem("simwarga_token");
    localStorage.removeItem("simwarga_user");
  }

  function restoreSession() {
    const savedUser = localStorage.getItem("simwarga_user");
    if (token.value && savedUser) {
      try {
        user.value = JSON.parse(savedUser);
      } catch (e) {}
      fetchMe();
    }
  }

  function toggleDark() {
    isDark.value = !isDark.value;
    document.documentElement.setAttribute(
      "data-theme",
      isDark.value ? "dark" : "light",
    );
    // Ensure Tailwind "dark:" utilities also work by toggling the `dark` class
    if (isDark.value) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("simwarga_dark", isDark.value ? "1" : "0");
  }

  function initDark() {
    isDark.value = localStorage.getItem("simwarga_dark") === "1";
    document.documentElement.setAttribute(
      "data-theme",
      isDark.value ? "dark" : "light",
    );
    // Initialize Tailwind dark class as well so components using `dark:` variants respond
    if (isDark.value) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  return {
    user,
    token,
    isDark,
    isLoggingIn,
    loginError,
    isAuthenticated,
    isSuperAdmin,
    userName,
    userRole,
    userInitials,
    login,
    logout,
    restoreSession,
    fetchMe,
    toggleDark,
    initDark,
  };
});
