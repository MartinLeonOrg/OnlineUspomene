import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import './Admin.css';

const API_URL =
  import.meta.env.VITE_WORKER_URL || 'https://online-uspomene-api.mciko-wedding.workers.dev';
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

// Guest-facing site domain + route pattern for an event's upload page.
// Single source of truth — if the real route isn't "/e/:slug", change it
// only here and every link in the app (QR modal, QR cards, dashboard) updates.
const GUEST_SITE_URL = 'https://onlineuspomene.netlify.app';
function guestEventUrl(slug) {
  return `${GUEST_SITE_URL}/e/${slug}`;
}

// ---------------------------------------------------------------------------
// API HELPER
// ---------------------------------------------------------------------------
async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (ADMIN_KEY) {
    headers['X-Admin-Key'] = ADMIN_KEY;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `API error ${response.status}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// BACKEND CONTRACT (matches the real onlineuspomene-api index.js)
//
// GET  /admin/dashboard
//   -> { stats: { totalEvents, activeEvents, totalPhotos, pendingPhotos,
//                 approvedPhotos, rejectedPhotos, storage: {usedGB,totalGB} },
//        recentPhotos: [{ id, guest, event, eventSlug, status, time, url }] }
//
// GET  /admin/events
//   -> [{ id, slug, name, eventDate, isActive, totalPhotos, pendingPhotos,
//         guestCount, createdAt }]
// POST /admin/events                       { name, eventDate?, slug?, isActive? }
// POST /admin/events/:id                   { name?, eventDate? }
// POST /admin/events/:id/activate
// POST /admin/events/:id/deactivate
// POST /admin/events/:id/regenerate-slug   -> { id, slug, isActive }
// GET  /admin/events/:id/qr-history        -> [{ old_slug, replaced_at }]
// DELETE /admin/events/:id
//
// GET  /admin/photos?status=pending|approved|rejected  (omit = all)
//   -> [{ id, key, url, originalName, guestName, message, status, uploaded,
//         eventId, eventName, eventSlug }]
// GET  /admin/events/:id/photos            -> same shape, one event, all statuses
// POST /admin/photos/:id/approve
// POST /admin/photos/:id/reject
// DELETE /admin/photos/:id
//
// GET  /admin/events/:id/guests
// POST /admin/events/:id/guests            { name, email?, phone?, invited?, notes? }
// POST /admin/guests/:id                   { name?, email?, phone?, invited?, notes? }
// DELETE /admin/guests/:id
// ---------------------------------------------------------------------------

const FALLBACK_STATS = {
  totalEvents: 0,
  activeEvents: 0,
  totalPhotos: 0,
  pendingPhotos: 0,
  approvedPhotos: 0,
  rejectedPhotos: 0,
  storage: { usedGB: 0, totalGB: 100 },
};

function Admin() {
  // --- data state ------------------------------------------------------
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [events, setEvents] = useState([]);
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [allPhotos, setAllPhotos] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- UI state ----------------------------------------------------------
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [guestEventId, setGuestEventId] = useState('');

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');

      const [dashboardData, eventsData] = await Promise.all([
        api('/admin/dashboard'),
        api('/admin/events'),
      ]);

      setStats(dashboardData?.stats || FALLBACK_STATS);
      setRecentPhotos(dashboardData?.recentPhotos || []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setStats(FALLBACK_STATS);
      setRecentPhotos([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAllPhotos() {
    try {
      const data = await api('/admin/photos');
      setAllPhotos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  async function loadGuests(eventId) {
    if (!eventId) {
      setGuests([]);
      return;
    }
    try {
      const data = await api(`/admin/events/${eventId}/guests`);
      setGuests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (activePage === 'photos') loadAllPhotos();
    if (activePage === 'guests' && guestEventId) loadGuests(guestEventId);
  }, [activePage, guestEventId]);

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name?.toLowerCase().includes(search.toLowerCase()) ||
      event.slug?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && event.isActive) ||
      (statusFilter === 'inactive' && !event.isActive);

    return matchesSearch && matchesStatus;
  });

  const guestLink = selectedEvent ? guestEventUrl(selectedEvent.slug) : '';

  // --- actions -------------------------------------------------------------
  async function handleCreateEvent(payload) {
    try {
      await api('/admin/events', { method: 'POST', body: JSON.stringify(payload) });
      setShowNewEvent(false);
      await loadDashboard();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  async function handleUpdateEvent(eventId, payload) {
    try {
      await api(`/admin/events/${eventId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setEditingEvent(null);

      await loadDashboard();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  async function handleDeleteEvent(event) {
    if (!confirm(`Obrisati "${event.name}" i sve njegove fotografije?`)) return;
    try {
      await api(`/admin/events/${event.id}`, { method: 'DELETE' });
      await loadDashboard();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  async function handleToggleActive(event) {
    try {
      await api(`/admin/events/${event.id}/${event.isActive ? 'deactivate' : 'activate'}`, {
        method: 'POST',
      });
      await loadDashboard();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  async function handleRegenerateSlug(event) {
    try {
      const updated = await api(`/admin/events/${event.id}/regenerate-slug`, {
        method: 'POST',
      });
      setSelectedEvent((prev) =>
        prev && prev.id === event.id ? { ...prev, slug: updated.slug, isActive: true } : prev
      );
      await loadDashboard();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  async function handleDeletePhoto(photoId) {
    if (!confirm('Trajno obrisati fotografiju?')) return;
    try {
      await api(`/admin/photos/${photoId}`, { method: 'DELETE' });
      setAllPhotos((prev) => prev.filter((p) => p.id !== photoId));
      loadDashboard();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  async function handleAddGuest(payload) {
    try {
      await api(`/admin/events/${guestEventId}/guests`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await loadGuests(guestEventId);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  async function handleDeleteGuest(guestId) {
    try {
      await api(`/admin/guests/${guestId}`, { method: 'DELETE' });
      setGuests((prev) => prev.filter((g) => g.id !== guestId));
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <div>
            <strong>Online Uspomene</strong>
            <span>Admin</span>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">GLAVNO</span>

          <button
            className={`sidebar-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActivePage('dashboard')}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={`sidebar-item ${activePage === 'events' ? 'active' : ''}`}
            onClick={() => setActivePage('events')}
          >
            <span>◫</span>
            Događaji
          </button>

          <button
            className={`sidebar-item ${activePage === 'photos' ? 'active' : ''}`}
            onClick={() => setActivePage('photos')}
          >
            <span>▧</span>
            Fotografije
          </button>

          <button
            className={`sidebar-item ${activePage === 'guests' ? 'active' : ''}`}
            onClick={() => setActivePage('guests')}
          >
            <span>♙</span>
            Gosti
          </button>

          <button
            className={`sidebar-item ${activePage === 'qr' ? 'active' : ''}`}
            onClick={() => setActivePage('qr')}
          >
            <span>⌗</span>
            QR kodovi
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="storage-box">
            <div className="storage-header">
              <span>R2 Storage</span>
              <strong>
                {stats.storage.usedGB.toFixed(1)} GB / {stats.storage.totalGB} GB
              </strong>
            </div>

            <div className="storage-progress">
              <div
                style={{
                  width: `${Math.min(100, (stats.storage.usedGB / stats.storage.totalGB) * 100)}%`,
                }}
              />
            </div>

            <small>
              {((stats.storage.usedGB / stats.storage.totalGB) * 100).toFixed(1)}% iskorišteno
            </small>
          </div>

          <div className="admin-user">
            <div className="avatar">A</div>
            <div>
              <strong>Admin</strong>
              <span>Administrator</span>
            </div>
            <span className="dots">•••</span>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Admin /</span>
            <h1>
              {activePage === 'dashboard' && 'Dashboard'}
              {activePage === 'events' && 'Događaji'}
              {activePage === 'photos' && 'Fotografije'}
              {activePage === 'guests' && 'Gosti'}
              {activePage === 'qr' && 'QR kodovi'}
            </h1>
          </div>

          <div className="topbar-actions">
            <button className="new-event-button" onClick={() => setShowNewEvent(true)}>
              <span>+</span>
              Novi događaj
            </button>
          </div>
        </header>

        {error && <div className="admin-error-banner">Greška: {error}</div>}

        {loading ? (
          <div className="admin-loading">Učitavanje...</div>
        ) : (
          <>
            {activePage === 'dashboard' && (
              <>
                <section className="stats-grid">
                  <StatCard
                    title="Ukupno događaja"
                    value={stats.totalEvents}
                    description={`${stats.activeEvents} aktivnih`}
                    icon="◫"
                  />
                  <StatCard
                    title="Fotografije"
                    value={stats.totalPhotos}
                    description="vidljivo gostima odmah nakon uploada"
                    icon="▧"
                  />
                  <StatCard
                    title="Gosti"
                    value={events.reduce((sum, e) => sum + (e.guestCount || 0), 0)}
                    description="na listama svih događaja"
                    icon="♙"
                  />
                  <StatCard
                    title="R2 prostor"
                    value={`${stats.storage.usedGB.toFixed(1)} GB`}
                    description={`od ukupno ${stats.storage.totalGB} GB`}
                    icon="☁"
                  />
                </section>

                <section className="panel events-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Zadnje fotografije</h2>
                      <p>Najnoviji uploadi (svi statusi)</p>
                    </div>
                    <button className="text-button" onClick={() => setActivePage('photos')}>
                      Sve fotografije →
                    </button>
                  </div>

                  <div className="photo-grid">
                    {recentPhotos.length === 0 ? (
                      <p className="empty-state">Još nema uploadanih fotografija.</p>
                    ) : (
                      recentPhotos.map((photo) => (
                        <div className="photo-card" key={photo.id}>
                          <img src={photo.url} alt="" />
                          <div className="photo-overlay">
                            <strong>{photo.guest}</strong>
                            <span>
                              {photo.event} ·{' '}
                              <span className={`status-tag ${photo.status}`}>{photo.status}</span>
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="panel events-panel">
                  <div className="panel-header">
                    <div>
                      <h2>Događaji</h2>
                      <p>Pregled svih događaja</p>
                    </div>
                    <button className="text-button" onClick={() => setActivePage('events')}>
                      Svi događaji →
                    </button>
                  </div>

                  <EventsTable
                    events={events.slice(0, 5)}
                    onQR={(event) => {
                      setSelectedEvent(event);
                      setShowQR(true);
                    }}
                    onToggleActive={handleToggleActive}
                    onEdit={(event) => setEditingEvent(event)}
                    onDelete={handleDeleteEvent}
                  />
                </section>
              </>
            )}

            {activePage === 'events' && (
              <section className="page-section">
                <div className="page-actions">
                  <div>
                    <h2>Svi događaji</h2>
                    <p>Upravljajte događajima i QR kodovima.</p>
                  </div>
                  <button className="new-event-button" onClick={() => setShowNewEvent(true)}>
                    + Novi događaj
                  </button>
                </div>

                <div className="search-row">
                  <div className="search-box">
                    <span>⌕</span>
                    <input
                      placeholder="Pretraži po nazivu ili slugu..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">Svi statusi</option>
                    <option value="active">Aktivni</option>
                    <option value="inactive">Neaktivni</option>
                  </select>
                </div>

                <section className="panel">
                  <EventsTable
                    events={filteredEvents}
                    onQR={(event) => {
                      setSelectedEvent(event);
                      setShowQR(true);
                    }}
                    onToggleActive={handleToggleActive}
                    onEdit={(event) => setEditingEvent(event)}
                    onDelete={handleDeleteEvent}
                  />
                </section>
              </section>
            )}

            {activePage === 'photos' && (
              <section className="page-section">
                <div className="page-actions">
                  <div>
                    <h2>Sve fotografije</h2>
                    <p>
                      Fotke su gostima vidljive odmah nakon uploada. Grupirano po događajima —
                      otvori folder za pregled.
                    </p>
                  </div>
                </div>

                {allPhotos.length === 0 ? (
                  <p className="empty-state">Još nema uploadanih fotografija.</p>
                ) : (
                  <PhotoFolders photos={allPhotos} onDelete={handleDeletePhoto} />
                )}
              </section>
            )}

            {activePage === 'guests' && (
              <section className="page-section">
                <div className="page-actions">
                  <div>
                    <h2>Gosti</h2>
                    <p>Popis pozvanih gostiju po događaju.</p>
                  </div>
                </div>

                <div className="search-row">
                  <select value={guestEventId} onChange={(e) => setGuestEventId(e.target.value)}>
                    <option value="">Odaberi događaj...</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </div>

                {guestEventId ? (
                  <GuestsPanel
                    guests={guests}
                    onAdd={handleAddGuest}
                    onDelete={handleDeleteGuest}
                  />
                ) : (
                  <p className="empty-state">Odaberi događaj da vidiš gostiju listu.</p>
                )}
              </section>
            )}

            {activePage === 'qr' && (
              <section className="page-section">
                <div className="page-actions">
                  <div>
                    <h2>QR kodovi</h2>
                    <p>Upravljanje QR pristupom za događaje.</p>
                  </div>
                </div>

                <div className="qr-grid">
                  {events.map((event) => (
                    <QRCard
                      key={event.id}
                      event={event}
                      onOpen={() => {
                        setSelectedEvent(event);
                        setShowQR(true);
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {showQR && selectedEvent && (
        <QRModal
          event={selectedEvent}
          link={guestLink}
          onClose={() => setShowQR(false)}
          onRegenerate={() => handleRegenerateSlug(selectedEvent)}
          onToggleActive={() => handleToggleActive(selectedEvent)}
        />
      )}

      {showNewEvent && (
        <NewEventModal onClose={() => setShowNewEvent(false)} onCreate={handleCreateEvent} />
      )}

      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={handleUpdateEvent}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, description, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div>
          <span>{title}</span>
          <h3>{value}</h3>
        </div>
        <div className="stat-icon">{icon}</div>
      </div>
      <div className="stat-bottom">
        <span>{description}</span>
      </div>
    </div>
  );
}

function EventsTable({ events, onQR, onToggleActive, onEdit, onDelete }) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Naziv</th>
            <th>Slug</th>
            <th>Datum</th>
            <th>Status</th>
            <th>Fotografije</th>
            <th>Gosti</th>
            <th>QR</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>
                <div className="client-cell">
                  <div className="client-avatar">{event.name?.charAt(0)}</div>
                  <strong>{event.name}</strong>
                </div>
              </td>

              <td>
                <code>{event.slug}</code>
              </td>

              <td>{event.eventDate || '—'}</td>

              <td>
                <button
                  className={`status ${event.isActive ? 'active' : 'draft'}`}
                  onClick={() => onToggleActive(event)}
                  title="Klikni za promjenu statusa"
                >
                  {event.isActive ? 'Aktivan' : 'Neaktivan'}
                </button>
              </td>

              <td>{event.totalPhotos}</td>

              <td>{event.guestCount}</td>

              <td>
                <button className="qr-mini" onClick={() => onQR(event)}>
                  <span>⌗</span>
                  Otvori
                </button>
              </td>

              <td>
                <div className="event-actions">
                  <button className="more-button edit" onClick={() => onEdit(event)}>
                    Uredi
                  </button>

                  <button className="more-button danger" onClick={() => onDelete(event)}>
                    Obriši
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GuestsPanel({ guests, onAdd, onDelete }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name, email: email || undefined, phone: phone || undefined });
    setName('');
    setEmail('');
    setPhone('');
  };

  return (
    <section className="panel">
      <form className="search-row" onSubmit={submit}>
        <input placeholder="Ime gosta" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          placeholder="Email (opcionalno)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Telefon (opcionalno)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button className="new-event-button" type="submit">
          + Dodaj gosta
        </button>
      </form>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Ime</th>
              <th>Email</th>
              <th>Telefon</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-state">
                  Nema još gostiju na listi.
                </td>
              </tr>
            ) : (
              guests.map((guest) => (
                <tr key={guest.id}>
                  <td>{guest.name}</td>
                  <td>{guest.email || '—'}</td>
                  <td>{guest.phone || '—'}</td>
                  <td>
                    <button className="more-button danger" onClick={() => onDelete(guest.id)}>
                      Ukloni
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PhotoFolders({ photos, onDelete }) {
  const [expanded, setExpanded] = useState(() => new Set());

  const folders = React.useMemo(() => {
    const map = new Map();
    for (const photo of photos) {
      const key = photo.eventId ?? 'bez-dogadaja';
      if (!map.has(key)) {
        map.set(key, {
          eventId: key,
          eventName: photo.eventName || 'Bez događaja',
          photos: [],
        });
      }
      map.get(key).photos.push(photo);
    }
    return Array.from(map.values()).sort((a, b) => b.photos.length - a.photos.length);
  }, [photos]);

  const toggle = (eventId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  return (
    <div>
      {folders.map((folder) => {
        const isOpen = expanded.has(folder.eventId);
        return (
          <div className="photo-folder" key={folder.eventId}>
            <button className="photo-folder-header" onClick={() => toggle(folder.eventId)}>
              <strong>{folder.eventName}</strong>
              <span className="folder-count">{folder.photos.length} fotografija</span>
              <span className="folder-chevron">{isOpen ? '▾' : '▸'}</span>
            </button>

            {isOpen && (
              <div className="gallery-page-grid">
                {folder.photos.map((photo) => (
                  <div className="gallery-large-card" key={photo.id}>
                    <img src={photo.url} alt="" />
                    <div>
                      <strong>{photo.guestName || 'Gost'}</strong>
                      <span className={`status-tag ${photo.status}`}>{photo.status}</span>
                      {photo.message && <p className="photo-message">"{photo.message}"</p>}
                      <div className="qr-actions">
                        <button className="danger" onClick={() => onDelete(photo.id)}>
                          ✕ Ukloni
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NewEventModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name, eventDate: eventDate || undefined });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="modal-heading">
          <span>NOVI DOGAĐAJ</span>
          <h2>Dodaj događaj</h2>
        </div>

        <form onSubmit={submit} className="new-event-form">
          <label>
            Naziv
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Datum
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </label>
          <small>
            Sigurnosni link se generira automatski nakon spremanja — nije ga moguće ručno postaviti.
          </small>
          <div className="modal-actions">
            <button className="primary" type="submit">
              Spremi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditEventModal({ event, onClose, onSave }) {
  const [name, setName] = useState(event.name || '');
  const [eventDate, setEventDate] = useState(event.eventDate || '');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (!name.trim() || saving) return;

    try {
      setSaving(true);

      await onSave(event.id, {
        name: name.trim(),
        eventDate: eventDate || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="qr-modal edit-event-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}>
          ×
        </button>

        <div className="modal-heading">
          <span>UREDI DOGAĐAJ</span>
          <h2>Postavke događaja</h2>
          <p>Promijenite naziv ili datum događaja.</p>
        </div>

        <form className="new-event-form edit-event-form" onSubmit={submit}>
          <label>
            Naziv događaja
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ana & Marko"
              required
            />
          </label>

          <label>
            Datum
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </label>

          <div className="edit-event-link">
            <div className="edit-event-link-header">
              <span>Link događaja</span>
              <small>QR kod koristi ovaj link</small>
            </div>

            <code>{guestEventUrl(event.slug)}</code>
          </div>

          <div className="edit-event-actions">
            <button
              className="edit-cancel-button"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Odustani
            </button>

            <button className="edit-save-button" type="submit" disabled={!name.trim() || saving}>
              {saving ? 'Spremanje...' : 'Spremi promjene'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QRCard({ event, onOpen }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const link = guestEventUrl(event.slug);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, { margin: 1, width: 160 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => console.error('QR generation failed', err));
    return () => {
      cancelled = true;
    };
  }, [link]);

  return (
    <div className="qr-event-card">
      <div className="qr-preview">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`QR kod za ${event.name}`} />
        ) : (
          <div className="fake-qr">
            <span>▦</span>
          </div>
        )}
      </div>

      <div className="qr-event-info">
        <div className="status-line">
          <span className={`status-dot ${event.isActive ? 'green' : 'gray'}`} />
          {event.isActive ? 'Aktivan' : 'Neaktivan'}
        </div>

        <h3>{event.name}</h3>
        <code>/e/{event.slug}</code>

        <div className="qr-actions">
          <button onClick={onOpen}>Otvori QR</button>
          <button className="secondary" onClick={() => navigator.clipboard.writeText(link)}>
            Kopiraj link
          </button>
        </div>
      </div>
    </div>
  );
}

function QRModal({ event, link, onClose, onRegenerate, onToggleActive }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, { margin: 1, width: 280 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => console.error('QR generation failed', err));
    return () => {
      cancelled = true;
    };
  }, [link]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${event.slug}.png`;
    a.click();
  };

  const downloadSvg = async () => {
    try {
      const svgString = await QRCode.toString(link, { type: 'svg', margin: 1 });
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${event.slug}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('SVG export failed', err);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="modal-heading">
          <span>QR KOD</span>
          <h2>{event.name}</h2>
        </div>

        <div className="modal-qr">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR kod za ${event.name}`} />
          ) : (
            <div className="fake-qr large">
              <span>▦</span>
            </div>
          )}
        </div>

        <div className="qr-status">
          <span className={`status-dot ${event.isActive ? 'green' : 'gray'}`} />
          {event.isActive ? 'Događaj je aktivan — gosti mogu uploadati' : 'Događaj je deaktiviran'}
        </div>

        <div className="link-box">
          <span>{link}</span>
          <button onClick={copyLink}>{copied ? 'Kopirano!' : 'Kopiraj'}</button>
        </div>

        <div className="modal-actions">
          <button className="primary" onClick={downloadPng}>
            ↓ PNG
          </button>
          <button className="secondary" onClick={downloadSvg}>
            ↓ SVG
          </button>
          <button className="secondary" onClick={() => window.print()}>
            ♧ Print
          </button>
        </div>

        <div className="danger-actions">
          <button onClick={onRegenerate}>Regeneriraj QR (rotira link)</button>
          <button onClick={onToggleActive}>{event.isActive ? 'Deaktiviraj' : 'Aktiviraj'}</button>
        </div>
      </div>
    </div>
  );
}

export default Admin;
