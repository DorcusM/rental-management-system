/**
 * Reports Controller
 */

const Reports = {
  async load() {
    this.populateYearFilter();
    await Promise.all([this.loadSummary(), this.loadFilteredPayments()]);
  },

  populateYearFilter() {
    const yearSelect = document.getElementById('reportYearFilter');
    if (!yearSelect || yearSelect.options.length > 1) return;

    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '<option value="">All Years</option>';
    for (let y = currentYear; y >= currentYear - 4; y--) {
      yearSelect.innerHTML += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
    }
  },

  async loadSummary() {
    try {
      const data = await API.get('/api/reports/summary');
      if (data && data.success) {
        const s = data.summary;

        // Metric elements
        const rTotalCollected = document.getElementById('reportTotalCollected');
        const rTotalOutstanding = document.getElementById('reportTotalOutstanding');
        const rCollectionRate = document.getElementById('reportCollectionRate');
        const rOccupancyRate = document.getElementById('reportOccupancyRate');
        const rOccupiedRooms = document.getElementById('reportOccupiedRooms');
        const rVacantRooms = document.getElementById('reportVacantRooms');

        if (rTotalCollected) rTotalCollected.textContent = Format.currency(s.totalRentCollected);
        if (rTotalOutstanding) rTotalOutstanding.textContent = Format.currency(s.totalOutstanding);
        if (rCollectionRate) rCollectionRate.textContent = `${s.collectionRate}%`;
        if (rOccupancyRate) rOccupancyRate.textContent = `${s.occupancyRate}%`;
        if (rOccupiedRooms) rOccupiedRooms.textContent = `${s.occupiedRooms} Occupied`;
        if (rVacantRooms) rVacantRooms.textContent = `${s.vacantRooms} Vacant`;
      }
    } catch (err) {
      console.error('Failed to load report summary:', err);
    }
  },

  async loadFilteredPayments() {
    try {
      const year = document.getElementById('reportYearFilter')?.value || '';
      const month = document.getElementById('reportMonthFilter')?.value || '';

      const data = await API.get('/api/reports/payments', { year, month });
      if (data && data.success) {
        const tbody = document.getElementById('reportPaymentsTableBody');
        const totalEl = document.getElementById('reportFilteredTotal');
        const countEl = document.getElementById('reportFilteredCount');

        if (totalEl) totalEl.textContent = Format.currency(data.totalCollected || 0);
        if (countEl) countEl.textContent = `${data.count || 0} Transactions`;

        if (!tbody) return;

        if (!data.payments || !data.payments.length) {
          tbody.innerHTML = `
            <tr>
              <td colspan="6" class="empty-state">
                <p>No payments recorded for the selected period.</p>
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = data.payments.map((p) => {
          return `
            <tr>
              <td>${Format.date(p.paymentDate)}</td>
              <td><strong>${escapeHTML(p.tenantId?.fullName || 'N/A')}</strong></td>
              <td>Room ${escapeHTML(p.roomId?.roomNumber || 'N/A')}</td>
              <td><span class="badge badge-info">${escapeHTML(p.paymentMethod)}</span></td>
              <td><code>${escapeHTML(p.transactionReference || '&mdash;')}</code></td>
              <td><strong style="color:var(--primary);">${Format.currency(p.amountPaid)}</strong></td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('Failed to load payment reports:', err);
      Toast.error('Could not load payment reports.');
    }
  },

  exportCSV() {
    const year = document.getElementById('reportYearFilter')?.value || '';
    const month = document.getElementById('reportMonthFilter')?.value || '';

    const query = new URLSearchParams();
    if (year) query.append('year', year);
    if (month) query.append('month', month);

    const token = API.getToken();
    const url = `/api/reports/export-csv?${query.toString()}`;

    // Download CSV via Fetch with Auth header
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) throw new Error('CSV download failed');
        return res.blob();
      })
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = year
          ? `rent_payments_report_${year}${month ? `_month_${month}` : ''}.csv`
          : `rent_payments_all_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        Toast.success('Payments report exported successfully.');
      })
      .catch((err) => {
        Toast.error('Could not export CSV report: ' + err.message);
      });
  }
};
