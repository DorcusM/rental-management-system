/**
 * Rent Payment Management Controller
 */

const Payments = {
  cachedPayments: [],
  allTenantsList: [],

  async load() {
    try {
      const search = document.getElementById('paymentSearchInput')?.value || '';
      const paymentMethod = document.getElementById('paymentMethodFilter')?.value || '';
      const startDate = document.getElementById('paymentStartDateFilter')?.value || '';
      const endDate = document.getElementById('paymentEndDateFilter')?.value || '';

      const data = await API.get('/api/payments', {
        search,
        paymentMethod,
        startDate,
        endDate
      });

      if (data && data.success) {
        this.cachedPayments = data.payments || [];
        const totalCollectedEl = document.getElementById('paymentTotalCollectedLabel');
        if (totalCollectedEl) {
          totalCollectedEl.textContent = Format.currency(data.totalCollected || 0);
        }
        this.render();
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
      Toast.error('Could not fetch payment records.');
    }
  },

  render() {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;

    if (!this.cachedPayments.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <i data-lucide="receipt" style="width: 40px; height: 40px;"></i>
            <h3>No payment records found</h3>
            <p>No rent payments match the filter criteria.</p>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = this.cachedPayments.map((p) => {
      const tenantName = p.tenantId?.fullName || 'N/A';
      const tenantPhone = p.tenantId?.phone || '';
      const roomNum = p.roomId?.roomNumber || 'N/A';
      const amount = Format.currency(p.amountPaid);
      const date = Format.date(p.paymentDate);
      const method = p.paymentMethod || 'Cash';
      const ref = p.transactionReference || '&mdash;';
      const desc = p.description || '&mdash;';

      return `
        <tr>
          <td>
            <div class="table-avatar-cell">
              <div class="cell-avatar" style="background-color: var(--primary-light); color: var(--primary);">
                ${tenantName.charAt(0)}
              </div>
              <div class="cell-info">
                <div class="cell-title">${escapeHTML(tenantName)}</div>
                <div class="cell-sub">${escapeHTML(tenantPhone)}</div>
              </div>
            </div>
          </td>
          <td><strong>Room ${escapeHTML(roomNum)}</strong></td>
          <td><strong style="color:var(--primary); font-size:1rem;">${amount}</strong></td>
          <td>${date}</td>
          <td><span class="badge badge-info">${escapeHTML(method)}</span></td>
          <td><code style="font-size:0.8125rem;">${escapeHTML(ref)}</code></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm btn-secondary" onclick="Payments.viewReceipt('${p._id}')" title="Print/View Receipt">
                <i data-lucide="printer" style="width: 14px; height: 14px;"></i> Receipt
              </button>
              <button
                class="btn btn-sm btn-secondary btn-icon-only danger"
                onclick="Payments.deletePayment('${p._id}', '${escapeHTML(tenantName)}', '${amount}')"
                title="Delete Payment"
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

  async openRecordModal() {
    // Reset form
    document.getElementById('paymentTenantSelect').value = '';
    document.getElementById('paymentRoomInfo').textContent = 'Please select a tenant to see their allocated room.';
    document.getElementById('paymentAmountInput').value = '';
    document.getElementById('paymentDateInput').value = Format.dateInput(new Date());
    document.getElementById('paymentMethodSelect').value = 'Cash';
    document.getElementById('paymentReferenceInput').value = '';
    document.getElementById('paymentNotesInput').value = '';

    // Populate active tenants
    try {
      const data = await API.get('/api/tenants', { status: 'active' });
      this.allTenantsList = data.tenants || [];

      const select = document.getElementById('paymentTenantSelect');
      if (!this.allTenantsList.length) {
        select.innerHTML = '<option value="">No active tenants available</option>';
      } else {
        select.innerHTML = '<option value="">-- Choose Tenant --</option>' + this.allTenantsList.map((t) => {
          const roomNum = t.roomId?.roomNumber || 'None';
          const monthlyRent = t.roomId?.monthlyRent ? Format.currency(t.roomId.monthlyRent) : '$0';
          const balance = t.financials?.outstandingAmount > 0
            ? `(Owing: ${Format.currency(t.financials.outstandingAmount)})`
            : '(Up to date)';
          return `
            <option value="${t._id}">
              ${escapeHTML(t.fullName)} &bull; Room ${escapeHTML(roomNum)} ${balance}
            </option>
          `;
        }).join('');
      }

      Modal.open('paymentModal');
    } catch (err) {
      Toast.error('Could not load tenant list.');
    }
  },

  onTenantSelected(tenantId) {
    const roomInfoEl = document.getElementById('paymentRoomInfo');
    const amountInput = document.getElementById('paymentAmountInput');

    if (!tenantId) {
      roomInfoEl.textContent = 'Please select a tenant to see their allocated room.';
      amountInput.value = '';
      return;
    }

    const tenant = this.allTenantsList.find((t) => t._id === tenantId);
    if (tenant && tenant.roomId) {
      const rent = tenant.roomId.monthlyRent || 0;
      const fin = tenant.financials || {};
      const balance = fin.outstandingAmount || 0;

      roomInfoEl.innerHTML = `
        <strong>Allocated Room:</strong> Room ${escapeHTML(tenant.roomId.roomNumber)} &bull;
        <strong>Monthly Rent:</strong> ${Format.currency(rent)} &bull;
        <strong>Balance:</strong> <span style="color: ${balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight:700;">
          ${balance > 0 ? Format.currency(balance) + ' Outstanding' : 'Paid in Full'}
        </span>
      `;

      // Suggest amount: outstanding balance if owing, or standard monthly rent
      amountInput.value = balance > 0 ? balance : rent;
    } else {
      roomInfoEl.textContent = 'Tenant has no allocated room.';
      amountInput.value = '';
    }
  },

  async savePayment(e) {
    e.preventDefault();
    const tenantId = document.getElementById('paymentTenantSelect').value;
    const amountPaid = parseFloat(document.getElementById('paymentAmountInput').value);
    const paymentDate = document.getElementById('paymentDateInput').value;
    const paymentMethod = document.getElementById('paymentMethodSelect').value;
    const transactionReference = document.getElementById('paymentReferenceInput').value.trim();
    const description = document.getElementById('paymentNotesInput').value.trim();

    if (!tenantId) {
      Toast.warning('Please select a tenant.');
      return;
    }
    if (isNaN(amountPaid) || amountPaid <= 0) {
      Toast.warning('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (!paymentDate) {
      Toast.warning('Please choose a payment date.');
      return;
    }

    try {
      const res = await API.post('/api/payments', {
        tenantId,
        amountPaid,
        paymentDate,
        paymentMethod,
        transactionReference,
        description
      });

      if (res.success) {
        Toast.success(res.message || 'Payment recorded successfully.');
        Modal.close('paymentModal');
        this.load();
        Tenants.load();
        Dashboard.load();

        // Optionally show receipt immediately
        if (res.payment?._id) {
          setTimeout(() => {
            Payments.viewReceipt(res.payment._id);
          }, 300);
        }
      }
    } catch (err) {
      Toast.error(err.message || 'Failed to record payment.');
    }
  },

  async viewReceipt(paymentId) {
    try {
      const data = await API.get(`/api/payments/${paymentId}`);
      if (data && data.success) {
        const p = data.payment;
        const fin = data.financials || {};
        const container = document.getElementById('receiptModalContent');
        if (!container) return;

        const receiptNo = 'RCP-' + p._id.toString().slice(-6).toUpperCase();

        container.innerHTML = `
          <div class="receipt-card">
            <div class="receipt-header">
              <h3>RENTAL PAYMENT RECEIPT</h3>
              <p>RentMaster Property Management &bull; Official Tenant Voucher</p>
            </div>

            <div class="receipt-meta">
              <div>
                <div><strong>Receipt No:</strong> <code>${receiptNo}</code></div>
                <div><strong>Payment Date:</strong> ${Format.date(p.paymentDate)}</div>
              </div>
              <div style="text-align:right;">
                <div><strong>Payment Method:</strong> ${escapeHTML(p.paymentMethod)}</div>
                <div><strong>Reference:</strong> ${escapeHTML(p.transactionReference || 'N/A')}</div>
              </div>
            </div>

            <table class="receipt-table">
              <tbody>
                <tr>
                  <td class="label">Received From (Tenant):</td>
                  <td class="value">${escapeHTML(p.tenantId?.fullName || 'N/A')}</td>
                </tr>
                <tr>
                  <td class="label">Tenant Phone:</td>
                  <td class="value">${escapeHTML(p.tenantId?.phone || 'N/A')}</td>
                </tr>
                <tr>
                  <td class="label">National ID / Passport:</td>
                  <td class="value">${escapeHTML(p.tenantId?.identificationNumber || 'N/A')}</td>
                </tr>
                <tr>
                  <td class="label">Allocated Room:</td>
                  <td class="value">Room ${escapeHTML(p.roomId?.roomNumber || 'N/A')}</td>
                </tr>
                <tr>
                  <td class="label">Monthly Rental Rate:</td>
                  <td class="value">${Format.currency(p.roomId?.monthlyRent || 0)} / mo</td>
                </tr>
                <tr>
                  <td class="label">Payment Description:</td>
                  <td class="value">${escapeHTML(p.description || 'Monthly Rent Payment')}</td>
                </tr>
                <tr class="total-row">
                  <td class="label">AMOUNT PAID:</td>
                  <td class="value">${Format.currency(p.amountPaid)}</td>
                </tr>
                ${
                  fin.outstandingAmount !== undefined
                    ? `
                  <tr>
                    <td class="label">Remaining Rent Balance:</td>
                    <td class="value" style="color: ${fin.outstandingAmount > 0 ? 'var(--danger)' : 'var(--success)'}; font-size:1rem;">
                      ${fin.outstandingAmount > 0 ? Format.currency(fin.outstandingAmount) + ' Outstanding' : 'Paid in Full ($0.00)'}
                    </td>
                  </tr>
                `
                    : ''
                }
              </tbody>
            </table>

            <div class="receipt-footer">
              <p>Thank you for your prompt payment! Keep this receipt for your records.</p>
              <p style="margin-top:4px;">Authorized by: Property Administrator &bull; Generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        `;

        Modal.open('receiptModal');
      }
    } catch (err) {
      Toast.error('Could not load payment receipt.');
    }
  },

  async deletePayment(paymentId, tenantName, amount) {
    if (!confirm(`Are you sure you want to delete this payment record of ${amount} for "${tenantName}"? This will update the tenant's outstanding balance.`)) {
      return;
    }

    try {
      const res = await API.delete(`/api/payments/${paymentId}`);
      if (res.success) {
        Toast.success(res.message || 'Payment deleted successfully.');
        this.load();
        Tenants.load();
        Dashboard.load();
      }
    } catch (err) {
      Toast.error(err.message || 'Failed to delete payment.');
    }
  }
};
