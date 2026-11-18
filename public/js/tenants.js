/**
 * Tenant Management Controller
 */

const Tenants = {
  cachedTenants: [],

  async load() {
    try {
      const search = document.getElementById('tenantSearchInput')?.value || '';
      const status = document.getElementById('tenantStatusFilter')?.value || 'all';

      const data = await API.get('/api/tenants', { search, status });
      if (data && data.success) {
        this.cachedTenants = data.tenants || [];
        this.render();
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
      Toast.error('Could not fetch tenants list.');
    }
  },

  render() {
    const tbody = document.getElementById('tenantsTableBody');
    if (!tbody) return;

    if (!this.cachedTenants.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <i data-lucide="users" style="width: 40px; height: 40px;"></i>
            <h3>No tenants found</h3>
            <p>No tenant records match your query.</p>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = this.cachedTenants.map((t) => {
      const roomNum = t.roomId?.roomNumber || 'None';
      const monthlyRent = t.roomId?.monthlyRent ? Format.currency(t.roomId.monthlyRent) : '$0';
      const fin = t.financials || { totalPaid: 0, balance: 0, status: 'Paid' };
      const isPaid = fin.status === 'Paid';
      const isActive = t.active;

      return `
        <tr>
          <td>
            <div class="table-avatar-cell">
              <div class="cell-avatar" style="background-color: var(--primary-light); color: var(--primary);">
                ${t.fullName.charAt(0)}
              </div>
              <div class="cell-info">
                <div class="cell-title">${escapeHTML(t.fullName)}</div>
                <div class="cell-sub">${escapeHTML(t.phone || '')} &bull; ${escapeHTML(t.email || 'No email')}</div>
              </div>
            </div>
          </td>
          <td>
            <strong>Room ${escapeHTML(roomNum)}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${monthlyRent}/mo</div>
          </td>
          <td>${Format.date(t.moveInDate)}</td>
          <td>
            <div>${Format.currency(fin.totalPaid)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${fin.monthsBilled} mo billed</div>
          </td>
          <td>
            <span class="badge ${isPaid ? 'badge-success' : 'badge-danger'}">
              <span class="badge-dot"></span>
              ${isPaid ? 'Paid' : `Due ${Format.currency(fin.outstandingAmount)}`}
            </span>
          </td>
          <td>
            <span class="badge ${isActive ? 'badge-info' : 'badge-neutral'}">
              ${isActive ? 'Active' : 'Vacated'}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn btn-sm btn-secondary" onclick="Tenants.viewStatement('${t._id}')" title="View Statement">
                <i data-lucide="file-text" style="width: 14px; height: 14px;"></i>
              </button>
              <button class="btn btn-sm btn-secondary" onclick="Tenants.openEditModal('${t._id}')" title="Edit Tenant">
                <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
              </button>
              ${
                isActive
                  ? `
                  <button class="btn btn-sm btn-secondary" onclick="Tenants.vacateTenant('${t._id}', '${escapeHTML(t.fullName)}', '${escapeHTML(roomNum)}')" title="Vacate Room">
                    <i data-lucide="log-out" style="width: 14px; height: 14px; color: var(--warning);"></i>
                  </button>
                `
                  : ''
              }
              <button
                class="btn btn-sm btn-secondary btn-icon-only danger"
                onclick="Tenants.deleteTenant('${t._id}', '${escapeHTML(t.fullName)}')"
                title="Delete Record"
              >
                <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--danger);"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  async populateRoomDropdown(selectedRoomId = null, includeCurrentRoom = null) {
    const select = document.getElementById('tenantRoomSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Loading available rooms... --</option>';

    try {
      const data = await API.get('/api/rooms/available');
      let rooms = data.rooms || [];

      // If editing an existing tenant, include their currently allocated room in the dropdown
      if (includeCurrentRoom && !rooms.some((r) => r._id === includeCurrentRoom._id)) {
        rooms.unshift(includeCurrentRoom);
      }

      if (!rooms.length) {
        select.innerHTML = '<option value="">No vacant rooms available</option>';
        return;
      }

      select.innerHTML = '<option value="">-- Select Room --</option>' + rooms.map((r) => {
        const isCurrent = includeCurrentRoom && r._id === includeCurrentRoom._id;
        return `
          <option value="${r._id}" ${selectedRoomId === r._id ? 'selected' : ''}>
            Room ${escapeHTML(r.roomNumber)} - ${Format.currency(r.monthlyRent)}/month ${isCurrent ? '(Current Room)' : ''}
          </option>
        `;
      }).join('');
    } catch (err) {
      select.innerHTML = '<option value="">Failed to load rooms</option>';
    }
  },

  async openAddModal() {
    document.getElementById('tenantModalTitle').textContent = 'Register New Tenant';
    document.getElementById('tenantIdInput').value = '';
    document.getElementById('tenantNameInput').value = '';
    document.getElementById('tenantPhoneInput').value = '';
    document.getElementById('tenantEmailInput').value = '';
    document.getElementById('tenantIdNumberInput').value = '';
    document.getElementById('tenantMoveInInput').value = Format.dateInput(new Date());

    await this.populateRoomDropdown();
    Modal.open('tenantModal');
  },

  async openEditModal(tenantId) {
    try {
      const data = await API.get(`/api/tenants/${tenantId}`);
      if (data && data.success) {
        const t = data.tenant;
        document.getElementById('tenantModalTitle').textContent = `Edit Tenant: ${t.fullName}`;
        document.getElementById('tenantIdInput').value = t._id;
        document.getElementById('tenantNameInput').value = t.fullName;
        document.getElementById('tenantPhoneInput').value = t.phone;
        document.getElementById('tenantEmailInput').value = t.email || '';
        document.getElementById('tenantIdNumberInput').value = t.identificationNumber || '';
        document.getElementById('tenantMoveInInput').value = Format.dateInput(t.moveInDate);

        await this.populateRoomDropdown(t.roomId?._id, t.roomId);
        Modal.open('tenantModal');
      }
    } catch (err) {
      Toast.error('Could not load tenant details.');
    }
  },

  async saveTenant(e) {
    e.preventDefault();
    const id = document.getElementById('tenantIdInput').value;
    const fullName = document.getElementById('tenantNameInput').value.trim();
    const phone = document.getElementById('tenantPhoneInput').value.trim();
    const email = document.getElementById('tenantEmailInput').value.trim();
    const identificationNumber = document.getElementById('tenantIdNumberInput').value.trim();
    const roomId = document.getElementById('tenantRoomSelect').value;
    const moveInDate = document.getElementById('tenantMoveInInput').value;

    if (!fullName || !phone || !roomId) {
      Toast.warning('Please enter Full Name, Phone, and choose an allocated Room.');
      return;
    }

    try {
      if (id) {
        // Update
        const res = await API.put(`/api/tenants/${id}`, {
          fullName,
          phone,
          email,
          identificationNumber,
          roomId,
          moveInDate
        });
        if (res.success) {
          Toast.success(res.message || 'Tenant updated successfully.');
          Modal.close('tenantModal');
          this.load();
          Rooms.load();
          Dashboard.load();
        }
      } else {
        // Register new
        const res = await API.post('/api/tenants', {
          fullName,
          phone,
          email,
          identificationNumber,
          roomId,
          moveInDate
        });
        if (res.success) {
          Toast.success(res.message || 'Tenant registered successfully.');
          Modal.close('tenantModal');
          this.load();
          Rooms.load();
          Dashboard.load();
        }
      }
    } catch (err) {
      Toast.error(err.message || 'Failed to save tenant.');
    }
  },

  async vacateTenant(id, tenantName, roomNumber) {
    if (!confirm(`Are you sure you want to vacate tenant "${tenantName}" from Room ${roomNumber}? The room will immediately become available for new tenants.`)) {
      return;
    }

    try {
      const res = await API.patch(`/api/tenants/${id}/vacate`);
      if (res.success) {
        Toast.success(res.message || `Tenant ${tenantName} vacated. Room ${roomNumber} is now vacant.`);
        this.load();
        Rooms.load();
        Dashboard.load();
      }
    } catch (err) {
      Toast.error(err.message || 'Failed to vacate tenant.');
    }
  },

  async deleteTenant(id, tenantName) {
    if (!confirm(`Are you sure you want to permanently delete tenant "${tenantName}" and all associated payment records? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await API.delete(`/api/tenants/${id}`);
      if (res.success) {
        Toast.success(res.message || `Tenant ${tenantName} removed.`);
        this.load();
        Rooms.load();
        Dashboard.load();
      }
    } catch (err) {
      Toast.error(err.message || 'Failed to delete tenant.');
    }
  },

  async viewStatement(tenantId) {
    try {
      const data = await API.get(`/api/tenants/${tenantId}`);
      if (data && data.success) {
        const t = data.tenant;
        const fin = t.financials;
        const payments = t.payments || [];

        const statementContent = document.getElementById('tenantStatementContent');
        if (!statementContent) return;

        statementContent.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:16px;">
            <div>
              <h3 style="font-size:1.25rem; font-weight:700; color:var(--text-main);">${escapeHTML(t.fullName)}</h3>
              <p style="font-size:0.875rem; color:var(--text-muted); margin-top:2px;">
                Phone: ${escapeHTML(t.phone)} &bull; Email: ${escapeHTML(t.email || 'N/A')}
              </p>
              <p style="font-size:0.8125rem; color:var(--text-muted);">
                National ID / Passport: ${escapeHTML(t.identificationNumber || 'N/A')}
              </p>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.125rem; font-weight:700; color:var(--primary);">
                Room ${escapeHTML(t.roomId?.roomNumber || 'N/A')}
              </div>
              <div style="font-size:0.8125rem; color:var(--text-muted);">
                Monthly Rent: ${Format.currency(fin.monthlyRent)}
              </div>
              <div style="margin-top:6px;">
                <span class="badge ${t.active ? 'badge-success' : 'badge-neutral'}">
                  ${t.active ? 'Active Tenant' : 'Vacated'}
                </span>
              </div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:24px;">
            <div style="background:var(--slate-50); padding:12px; border-radius:var(--radius-md); border:1px solid var(--border);">
              <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Move-in Date</div>
              <div style="font-size:0.9375rem; font-weight:600; margin-top:4px;">${Format.date(t.moveInDate)}</div>
            </div>
            <div style="background:var(--slate-50); padding:12px; border-radius:var(--radius-md); border:1px solid var(--border);">
              <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Months Billed</div>
              <div style="font-size:0.9375rem; font-weight:600; margin-top:4px;">${fin.monthsBilled} Months</div>
            </div>
            <div style="background:var(--slate-50); padding:12px; border-radius:var(--radius-md); border:1px solid var(--border);">
              <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Total Due</div>
              <div style="font-size:0.9375rem; font-weight:600; margin-top:4px;">${Format.currency(fin.totalDue)}</div>
            </div>
            <div style="background:var(--slate-50); padding:12px; border-radius:var(--radius-md); border:1px solid var(--border);">
              <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Current Balance</div>
              <div style="font-size:0.9375rem; font-weight:700; margin-top:4px; color:${fin.status === 'Paid' ? 'var(--success)' : 'var(--danger)'};">
                ${fin.status === 'Paid' ? 'Paid in Full' : Format.currency(fin.outstandingAmount) + ' Due'}
              </div>
            </div>
          </div>

          <h4 style="font-size:0.9375rem; font-weight:700; margin-bottom:10px;">Payment History (${payments.length})</h4>
          <div class="table-responsive">
            <table class="custom-table" style="font-size:0.8125rem;">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${
                  payments.length
                    ? payments.map((p) => `
                    <tr>
                      <td>${Format.date(p.paymentDate)}</td>
                      <td><strong>${Format.currency(p.amountPaid)}</strong></td>
                      <td><span class="badge badge-info">${escapeHTML(p.paymentMethod)}</span></td>
                      <td>${escapeHTML(p.transactionReference || '&mdash;')}</td>
                      <td>${escapeHTML(p.description || '&mdash;')}</td>
                    </tr>
                  `).join('')
                    : `<tr><td colspan="5" class="empty-state" style="padding:16px;"><p>No payment records found.</p></td></tr>`
                }
              </tbody>
            </table>
          </div>
        `;

        Modal.open('tenantStatementModal');
      }
    } catch (err) {
      Toast.error('Could not load tenant statement.');
    }
  }
};
