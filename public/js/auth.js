/**
 * Authentication & Admin User Management
 */

const Auth = {
  currentUser: null,

  async init() {
    const token = API.getToken();
    if (!token) {
      window.location.href = '/login.html';
      return;
    }

    try {
      const data = await API.get('/api/auth/me');
      if (data && data.success) {
        this.currentUser = data.user;
        this.renderUser();
      } else {
        this.logout();
      }
    } catch (err) {
      console.warn('Auth check failed:', err.message);
      this.logout();
    }
  },

  renderUser() {
    if (!this.currentUser) return;

    // Sidebar user details
    const userNameEl = document.getElementById('sidebarUserName');
    const userRoleEl = document.getElementById('sidebarUserRole');
    const userAvatarEl = document.getElementById('sidebarUserAvatar');

    if (userNameEl) userNameEl.textContent = this.currentUser.name || 'Admin';
    if (userRoleEl) userRoleEl.textContent = this.currentUser.email || 'admin@rental.com';
    if (userAvatarEl) {
      const initials = (this.currentUser.name || 'AD')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      userAvatarEl.textContent = initials;
    }

    // Top header user details
    const headerNameEl = document.getElementById('headerAdminName');
    if (headerNameEl) headerNameEl.textContent = this.currentUser.name || 'Administrator';
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    }
    API.setToken(null);
    localStorage.removeItem('adminUser');
    window.location.href = '/login.html';
  }
};
