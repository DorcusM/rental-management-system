/**
 * Room Management Controller
 */

const Rooms = {
  currentView: 'cards', // 'cards' or 'table'
  cachedRooms: [],

  async load() {
    try {
      const search = document.getElementById('roomSearchInput')?.value || '';
      const status = document.getElementById('roomStatusFilter')?.value || '';

      const data = await API.get('/api/rooms', { search, status });
      if (data && data.success) {
        this.cachedRooms = data.rooms || [];
        this.render();
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
      Toast.error('Could not fetch room list.');
    }
  },

  setView(view) {
    this.currentView = view;
    const cardsBtn = document.getElementById('roomViewCardsBtn');
    const tableBtn = document.getElementById('roomViewTableBtn');

    if (cardsBtn && tableBtn) {
      if (view === 'cards') {
        cardsBtn.classList.add('active');
        tableBtn.classList.remove('active');
      } else {
        tableBtn.classList.add('active');
        cardsBtn.classList.remove('active');
      }
    }
    this.render();
  },

  render() {
    const cardsContainer = document.getElementById('roomsCardsContainer');
    const tableContainer = document.getElementById('roomsTableContainer');
    const tbody = document.getElementById('roomsTableBody');

    if (this.currentView === 'cards') {
      if (cardsContainer) cardsContainer.style.display = 'grid';
      if (tableContainer) tableContainer.style.display = 'none';
      this.renderCards();
    } else {
      if (cardsContainer) cardsContainer.style.display = 'none';
      if (tableContainer) tableContainer.style.display = 'block';
      this.renderTable(tbody);
    }

    if (window.lucide) lucide.createIcons();
  },

  renderCards() {
    const container = document.getElementById('roomsCardsContainer');
    if (!container) return;

    if (!this.cachedRooms.length) {
      container.innerHTML = `
        <div class="empty-state form-full" style="grid-column: 1 / -1;">
          <i data-lucide="door-closed" style="width: 48px; height: 48px;"></i>
          <h3>No rooms found</h3>
          <p>No rental rooms match the selected filter criteria.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.cachedRooms.map((room) => {
      const isOccupied = room.status === 'Occupied';
      const tenant = room.currentTenant;

      return `
        <div class="room-card">
          <div>
            <div class="room-card-header">
              <div class="room-number">Room ${escapeHTML(room.roomNumber)}</div>
              <span class="badge ${isOccupied ? 'badge-success' : 'badge-warning'}">
                <span class="badge-dot"></span>
                ${isOccupied ? 'Occupied' : 'Vacant'}
              </span>
            </div>

            <div class="room-price">
              ${Format.currency(room.monthlyRent)} <span>/ month</span>
            </div>

            <p class="room-desc">${escapeHTML(room.description || 'No description provided.')}</p>

            ${
              isOccupied && tenant
                ? `
                <div class="room-tenant-box">
                  <i data-lucide="user" style="width: 16px; height: 16px; color: var(--primary);"></i>
                  <div>
                    <div><strong>${escapeHTML(tenant.fullName)}</strong></div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(tenant.phone || '')}</div>
                  </div>
                </div>
              `
                : `
                <div class="room-tenant-box" style="color: var(--text-muted);">
                  <i data-lucide="check-circle" style="width: 16px; height: 16px; color: var(--warning);"></i>
                  <span>Ready for allocation</span>
                </div>
              `
            }
          </div>

          <div class="room-card-actions">
            <button class="btn btn-sm btn-secondary" onclick="Rooms.openEditModal('${room._id}')">
              <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i> Edit
            </button>
            <button
              class="btn btn-sm btn-secondary ${isOccupied ? '' : 'btn-icon-only danger'}"
              onclick="Rooms.deleteRoom('${room._id}', '${escapeHTML(room.roomNumber)}', ${isOccupied})"
              title="${isOccupied ? 'Cannot delete occupied room' : 'Delete Room'}"
              style="${isOccupied ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
            >
              <i data-lucide="trash-2" style="width: 14px; height: 14px; ${isOccupied ? '' : 'color: var(--danger);'}"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderTable(tbody) {
    if (!tbody) return;

    if (!this.cachedRooms.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <p>No rooms found matching filter criteria.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.cachedRooms.map((room) => {
      const isOccupied = room.status === 'Occupied';
      const tenant = room.currentTenant;

      return `
        <tr>
          <td><strong>Room ${escapeHTML(room.roomNumber)}</strong></td>
          <td><strong>${Format.currency(room.monthlyRent)}</strong> / mo</td>
          <td>
            <span class="badge ${isOccupied ? 'badge-success' : 'badge-warning'}">
              <span class="badge-dot"></span>
              ${isOccupied ? 'Occupied' : 'Vacant'}
            </span>
          </td>
          <td>${isOccupied && tenant ? escapeHTML(tenant.fullName) : '<span style="color:var(--text-muted);">&mdash;</span>'}</td>
          <td><span style="font-size:0.8125rem; color:var(--text-muted);">${escapeHTML(room.description || 'N/A')}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm btn-secondary" onclick="Rooms.openEditModal('${room._id}')">
                <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
              </button>
              <button
                class="btn btn-sm btn-secondary btn-icon-only danger"
                onclick="Rooms.deleteRoom('${room._id}', '${escapeHTML(room.roomNumber)}', ${isOccupied})"
                title="Delete Room"
                style="${isOccupied ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
              >
                <i data-lucide="trash-2" style="width: 14px; height: 14px; color: var(--danger);"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    document.getElementById('roomModalTitle').textContent = 'Add New Rental Room';
    document.getElementById('roomIdInput').value = '';
    document.getElementById('roomNumberInput').value = '';
    document.getElementById('roomRentInput').value = '';
    document.getElementById('roomDescInput').value = '';
    document.getElementById('roomStatusSelect').value = 'Vacant';

    Modal.open('roomModal');
  },

  async openEditModal(roomId) {
    try {
      const data = await API.get(`/api/rooms/${roomId}`);
      if (data && data.success) {
        const room = data.room;
        document.getElementById('roomModalTitle').textContent = `Edit Room ${room.roomNumber}`;
        document.getElementById('roomIdInput').value = room._id;
        document.getElementById('roomNumberInput').value = room.roomNumber;
        document.getElementById('roomRentInput').value = room.monthlyRent;
        document.getElementById('roomDescInput').value = room.description || '';
        document.getElementById('roomStatusSelect').value = room.status || 'Vacant';

        Modal.open('roomModal');
      }
    } catch (err) {
      Toast.error('Could not load room details.');
    }
  },

  async saveRoom(e) {
    e.preventDefault();
    const id = document.getElementById('roomIdInput').value;
    const roomNumber = document.getElementById('roomNumberInput').value.trim();
    const monthlyRent = parseFloat(document.getElementById('roomRentInput').value);
    const description = document.getElementById('roomDescInput').value.trim();
    const status = document.getElementById('roomStatusSelect').value;

    if (!roomNumber) {
      Toast.warning('Please enter a room number.');
      return;
    }
    if (isNaN(monthlyRent) || monthlyRent < 0) {
      Toast.warning('Please enter a valid monthly rent amount.');
      return;
    }

    try {
      if (id) {
        // Update
        const res = await API.put(`/api/rooms/${id}`, {
          roomNumber,
          monthlyRent,
          description,
          status
        });
        if (res.success) {
          Toast.success(res.message || 'Room updated successfully.');
          Modal.close('roomModal');
          this.load();
          Dashboard.load();
        }
      } else {
        // Create
        const res = await API.post('/api/rooms', {
          roomNumber,
          monthlyRent,
          description,
          status
        });
        if (res.success) {
          Toast.success(res.message || 'Room added successfully.');
          Modal.close('roomModal');
          this.load();
          Dashboard.load();
        }
      }
    } catch (err) {
      Toast.error(err.message || 'Failed to save room.');
    }
  },

  async deleteRoom(id, roomNumber, isOccupied) {
    if (isOccupied) {
      Toast.error(`Cannot delete Room ${roomNumber} because it currently has an active tenant. Please vacate or transfer the tenant first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete Room "${roomNumber}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await API.delete(`/api/rooms/${id}`);
      if (res.success) {
        Toast.success(res.message || `Room ${roomNumber} deleted successfully.`);
        this.load();
        Dashboard.load();
      }
    } catch (err) {
      Toast.error(err.message || 'Failed to delete room.');
    }
  }
};
