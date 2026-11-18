/**
 * Dashboard Controller
 */

const Dashboard = {
  chartInstance: null,

  async load() {
    try {
      const data = await API.get('/api/dashboard/stats');
      if (data && data.success) {
        this.renderStats(data.stats);
        this.renderRecentPayments(data.recentPayments || []);
        this.renderRecentTenants(data.recentTenants || []);
        this.renderMonthlyChart(data.monthlyCollectionChart || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Toast.error('Could not load dashboard statistics.');
    }
  },

  renderStats(stats) {
    if (!stats) return;

    // 1. Total rooms
    const totalRoomsEl = document.getElementById('statTotalRooms');
    if (totalRoomsEl) totalRoomsEl.textContent = stats.totalRooms || 0;

    // 2. Occupied rooms
    const occupiedRoomsEl = document.getElementById('statOccupiedRooms');
    if (occupiedRoomsEl) occupiedRoomsEl.textContent = stats.occupiedRooms || 0;

    // 3. Vacant rooms
    const vacantRoomsEl = document.getElementById('statVacantRooms');
    if (vacantRoomsEl) vacantRoomsEl.textContent = stats.vacantRooms || 0;

    // 4. Total registered tenants
    const totalTenantsEl = document.getElementById('statTotalTenants');
    if (totalTenantsEl) totalTenantsEl.textContent = stats.totalTenants || 0;

    // 5. Total rent collected
    const totalCollectedEl = document.getElementById('statTotalCollected');
    if (totalCollectedEl) totalCollectedEl.textContent = Format.currency(stats.totalRentCollected || 0);

    // 6. Outstanding rent balances
    const outstandingEl = document.getElementById('statOutstandingRent');
    if (outstandingEl) outstandingEl.textContent = Format.currency(stats.totalOutstandingRent || 0);

    // Occupancy rate badge
    const occupancyRateEl = document.getElementById('statOccupancyRate');
    if (occupancyRateEl) occupancyRateEl.textContent = `${stats.occupancyRate || 0}% Occupancy`;
  },

  renderRecentPayments(payments) {
    const tbody = document.getElementById('recentPaymentsTableBody');
    if (!tbody) return;

    if (!payments.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <p>No rent payments recorded yet.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = payments.map((p) => {
      const tenantName = p.tenantId?.fullName || 'N/A';
      const roomNumber = p.roomId?.roomNumber || 'N/A';
      const amount = Format.currency(p.amountPaid);
      const date = Format.date(p.paymentDate);
      const method = p.paymentMethod || 'Cash';

      return `
        <tr>
          <td>
            <div class="table-avatar-cell">
              <div class="cell-avatar">${tenantName.charAt(0)}</div>
              <div class="cell-info">
                <div class="cell-title">${escapeHTML(tenantName)}</div>
                <div class="cell-sub">Room ${escapeHTML(roomNumber)}</div>
              </div>
            </div>
          </td>
          <td><span class="badge badge-info">${escapeHTML(method)}</span></td>
          <td><strong>${amount}</strong></td>
          <td>${date}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="Payments.viewReceipt('${p._id}')" title="View Receipt">
              <i data-lucide="receipt" style="width: 14px; height: 14px;"></i> Receipt
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  renderRecentTenants(tenants) {
    const tbody = document.getElementById('recentTenantsTableBody');
    if (!tbody) return;

    if (!tenants.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <p>No tenants registered yet.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = tenants.map((t) => {
      const name = t.fullName || 'N/A';
      const roomNum = t.roomId?.roomNumber || 'N/A';
      const rent = t.roomId?.monthlyRent ? Format.currency(t.roomId.monthlyRent) + '/mo' : 'N/A';
      const date = Format.date(t.moveInDate);
      const isActive = t.active;

      return `
        <tr>
          <td>
            <div class="table-avatar-cell">
              <div class="cell-avatar" style="background-color: var(--primary-light); color: var(--primary);">
                ${name.charAt(0)}
              </div>
              <div class="cell-info">
                <div class="cell-title">${escapeHTML(name)}</div>
                <div class="cell-sub">${escapeHTML(t.phone || '')}</div>
              </div>
            </div>
          </td>
          <td><strong>Room ${escapeHTML(roomNum)}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${rent})</span></td>
          <td>${date}</td>
          <td>
            <span class="badge ${isActive ? 'badge-success' : 'badge-neutral'}">
              <span class="badge-dot"></span>
              ${isActive ? 'Active' : 'Vacated'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  renderMonthlyChart(monthlyData) {
    const canvas = document.getElementById('monthlyRentChart');
    if (!canvas) return;

    const labels = monthlyData.map((d) => d.label);
    const dataValues = monthlyData.map((d) => d.total);

    // If Chart.js is loaded from CDN
    if (window.Chart) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const ctx = canvas.getContext('2d');
      this.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Rent Collected ($)',
              data: dataValues,
              backgroundColor: 'rgba(22, 101, 52, 0.85)',
              borderColor: '#166534',
              borderWidth: 1,
              borderRadius: 6,
              hoverBackgroundColor: '#14532d'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return ' Collected: $' + Number(context.raw).toLocaleString('en-US', { minimumFractionDigits: 2 });
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#f1f5f9'
              },
              ticks: {
                callback: function (val) {
                  return '$' + val;
                },
                font: {
                  size: 11
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 11
                }
              }
            }
          }
        }
      });
    } else {
      // Lightweight clean SVG fallback if offline or no Chart.js
      this.renderSvgChart(canvas.parentElement, monthlyData);
    }
  },

  renderSvgChart(container, monthlyData) {
    const maxVal = Math.max(...monthlyData.map((d) => d.total), 100);
    const barsHtml = monthlyData.map((d) => {
      const heightPercent = Math.max(8, Math.round((d.total / maxVal) * 100));
      return `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
          <div style="font-size:0.75rem; font-weight:600; color:var(--primary); margin-bottom:4px;">$${d.total}</div>
          <div style="width:70%; height:${heightPercent}%; background:var(--primary); border-radius:4px 4px 0 0;"></div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">${d.label.split(' ')[0]}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display:flex; align-items:flex-end; height:240px; gap:8px; padding-top:20px; border-bottom:1px solid var(--border);">
        ${barsHtml}
      </div>
    `;
  }
};
