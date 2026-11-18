/**
 * Master Application Controller & Navigation
 */

// Helper to sanitize HTML text to prevent XSS
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Modal helper
const Modal = {
  open(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (window.lucide) lucide.createIcons();
    }
  },

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
};

// Navigation controller
const Navigation = {
  currentTab: 'dashboard',

  init() {
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Close sidebar on mobile when navigating
    const backdrop = document.getElementById('sidebarBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.remove('open');
        backdrop.classList.remove('active');
      });
    }

    const menuToggle = document.getElementById('menuToggleBtn');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.toggle('open');
        backdrop?.classList.toggle('active');
      });
    }
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update nav buttons
    document.querySelectorAll('.nav-item[data-tab]').forEach((btn) => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update section visibility
    document.querySelectorAll('.content-section').forEach((sec) => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`${tabName}Section`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update top header title
    const headerTitle = document.getElementById('topHeaderTitle');
    const headerSubtitle = document.getElementById('topHeaderSubtitle');

    const titles = {
      dashboard: { title: 'Dashboard Overview', sub: 'Real-time property and rental metrics' },
      rooms: { title: 'Room Management', sub: 'Manage rental rooms, pricing and occupancy' },
      tenants: { title: 'Tenant Management', sub: 'Registered tenants, room allocations and balances' },
      payments: { title: 'Rent Payments', sub: 'Record transactions, view histories and receipts' },
      reports: { title: 'Reports & Analytics', sub: 'Financial breakdown and occupancy reports' },
      settings: { title: 'System Settings', sub: 'Administrator security and diagnostic info' }
    };

    if (headerTitle && titles[tabName]) {
      headerTitle.textContent = titles[tabName].title;
      headerSubtitle.textContent = titles[tabName].sub;
    }

    // Load data for selected tab
    switch (tabName) {
      case 'dashboard':
        Dashboard.load();
        break;
      case 'rooms':
        Rooms.load();
        break;
      case 'tenants':
        Tenants.load();
        break;
      case 'payments':
        Payments.load();
        break;
      case 'reports':
        Reports.load();
        break;
      case 'settings':
        Settings.load();
        break;
    }

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarBackdrop')?.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) lucide.createIcons();
  }
};

// Settings Module
const Settings = {
  async load() {
    this.loadProfile();
    this.loadSystemDiagnostics();
  },

  async loadProfile() {
    if (Auth.currentUser) {
      const nameInput = document.getElementById('settingsNameInput');
      const emailInput = document.getElementById('settingsEmailInput');
      if (nameInput) nameInput.value = Auth.currentUser.name || '';
      if (emailInput) emailInput.value = Auth.currentUser.email || '';
    }
  },

  async updateProfile(e) {
    e.preventDefault();
    const name = document.getElementById('settingsNameInput').value.trim();
    const email = document.getElementById('settingsEmailInput').value.trim();

    try {
      const res = await API.put('/api/auth/update-profile', { name, email });
      if (res.success) {
        Toast.success(res.message || 'Profile updated successfully.');
        Auth.currentUser = res.user;
        Auth.renderUser();
      }
    } catch (err) {
      Toast.error(err.message || 'Failed to update profile.');
    }
  },

  async changePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('settingsCurrentPassword').value;
    const newPassword = document.getElementById('settingsNewPassword').value;
    const confirmPassword = document.getElementById('settingsConfirmPassword').value;

    if (newPassword !== confirmPassword) {
      Toast.warning('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Toast.warning('New password must be at least 6 characters long.');
      return;
    }

    try {
      const res = await API.put('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (res.success) {
        Toast.success(res.message || 'Password changed successfully.');
        document.getElementById('changePasswordForm').reset();
      }
    } catch (err) {
      Toast.error(err.message || 'Failed to change password.');
    }
  },

  async loadSystemDiagnostics() {
    try {
      const data = await API.get('/api/auth/system-info');
      if (data && data.success) {
        const sys = data.system;
        const dbStatusEl = document.getElementById('sysDbStatus');
        const dbNameEl = document.getElementById('sysDbName');
        const nodeVerEl = document.getElementById('sysNodeVersion');
        const uptimeEl = document.getElementById('sysUptime');

        if (dbStatusEl) dbStatusEl.textContent = sys.dbStatus;
        if (dbNameEl) dbNameEl.textContent = sys.dbName;
        if (nodeVerEl) nodeVerEl.textContent = sys.nodeVersion;
        if (uptimeEl) {
          const mins = Math.floor(sys.uptimeSeconds / 60);
          uptimeEl.textContent = `${mins} min${mins === 1 ? '' : 's'}`;
        }
      }
    } catch (err) {
      console.warn('System info load error:', err);
    }
  }
};

// Global Initialization
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Initialize navigation & auth
  Navigation.init();
  await Auth.init();

  // Load initial dashboard
  Dashboard.load();

  // Setup form event listeners
  document.getElementById('roomForm')?.addEventListener('submit', (e) => Rooms.saveRoom(e));
  document.getElementById('tenantForm')?.addEventListener('submit', (e) => Tenants.saveTenant(e));
  document.getElementById('paymentForm')?.addEventListener('submit', (e) => Payments.savePayment(e));
  document.getElementById('profileForm')?.addEventListener('submit', (e) => Settings.updateProfile(e));
  document.getElementById('changePasswordForm')?.addEventListener('submit', (e) => Settings.changePassword(e));

  // Payment tenant selection auto-fill listener
  document.getElementById('paymentTenantSelect')?.addEventListener('change', (e) => {
    Payments.onTenantSelected(e.target.value);
  });

  // Rooms search & filter listeners
  document.getElementById('roomSearchInput')?.addEventListener('input', () => Rooms.load());
  document.getElementById('roomStatusFilter')?.addEventListener('change', () => Rooms.load());

  // Tenants search & filter listeners
  document.getElementById('tenantSearchInput')?.addEventListener('input', () => Tenants.load());
  document.getElementById('tenantStatusFilter')?.addEventListener('change', () => Tenants.load());

  // Payments search & filter listeners
  document.getElementById('paymentSearchInput')?.addEventListener('input', () => Payments.load());
  document.getElementById('paymentMethodFilter')?.addEventListener('change', () => Payments.load());
  document.getElementById('paymentStartDateFilter')?.addEventListener('change', () => Payments.load());
  document.getElementById('paymentEndDateFilter')?.addEventListener('change', () => Payments.load());

  // Reports filter listeners
  document.getElementById('reportYearFilter')?.addEventListener('change', () => Reports.loadFilteredPayments());
  document.getElementById('reportMonthFilter')?.addEventListener('change', () => Reports.loadFilteredPayments());

  // Logout listener
  document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());

  // Close modals on escape key or clicking backdrop
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach((modal) => {
        Modal.close(modal.id);
      });
    }
  });

  document.querySelectorAll('.modal-overlay').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        Modal.close(modal.id);
      }
    });
  });
});
