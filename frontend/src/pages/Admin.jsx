import React, { useState } from "react";
import "./admin.css";

const events = [
  {
    id: "8F72KX",
    client: "Ana & Ivan Horvat",
    event: "Vjenčanje",
    date: "12.09.2026.",
    time: "18:00",
    location: "Hotel Panorama",
    status: "active",
    photos: 284,
    guests: 96,
    qrActive: true,
  },
  {
    id: "4KD91P",
    client: "Marko Babić",
    event: "40. rođendan",
    date: "19.09.2026.",
    time: "20:00",
    location: "Restoran Galerija",
    status: "active",
    photos: 127,
    guests: 43,
    qrActive: true,
  },
  {
    id: "91LM2Q",
    client: "Petra & Luka",
    event: "Vjenčanje",
    date: "05.09.2026.",
    time: "17:30",
    location: "Villa Green",
    status: "finished",
    photos: 631,
    guests: 174,
    qrActive: false,
  },
  {
    id: "K72PXA",
    client: "Studio Forma",
    event: "Godišnja proslava",
    date: "28.09.2026.",
    time: "19:00",
    location: "Event Hall Zagreb",
    status: "draft",
    photos: 0,
    guests: 0,
    qrActive: false,
  },
];

const recentPhotos = [
  {
    id: 1,
    guest: "Maja",
    event: "Ana & Ivan Horvat",
    time: "prije 2 min",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=500",
  },
  {
    id: 2,
    guest: "Luka",
    event: "Ana & Ivan Horvat",
    time: "prije 8 min",
    image:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=500",
  },
  {
    id: 3,
    guest: "Ivana",
    event: "40. rođendan",
    time: "prije 14 min",
    image:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=500",
  },
  {
    id: 4,
    guest: "Tomislav",
    event: "Ana & Ivan Horvat",
    time: "prije 21 min",
    image:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=500",
  },
];

function Admin() {
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [search, setSearch] = useState("");

  const filteredEvents = events.filter(
    (event) =>
      event.client.toLowerCase().includes(search.toLowerCase()) ||
      event.event.toLowerCase().includes(search.toLowerCase()) ||
      event.location.toLowerCase().includes(search.toLowerCase())
  );

  const guestLink = selectedEvent
    ? `https://tvoja-domena.com/e/${selectedEvent.id}`
    : "";

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <div>
            <strong>Momenti</strong>
            <span>Admin</span>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">GLAVNO</span>

          <button
            className={`sidebar-item ${
              activePage === "dashboard" ? "active" : ""
            }`}
            onClick={() => setActivePage("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={`sidebar-item ${
              activePage === "events" ? "active" : ""
            }`}
            onClick={() => setActivePage("events")}
          >
            <span>◫</span>
            Događaji
          </button>

          <button
            className={`sidebar-item ${
              activePage === "gallery" ? "active" : ""
            }`}
            onClick={() => setActivePage("gallery")}
          >
            <span>▧</span>
            Galerija
          </button>

          <button
            className={`sidebar-item ${
              activePage === "qr" ? "active" : ""
            }`}
            onClick={() => setActivePage("qr")}
          >
            <span>⌗</span>
            QR kodovi
          </button>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">OSTALO</span>

          <button className="sidebar-item">
            <span>⚙</span>
            Postavke
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="storage-box">
            <div className="storage-header">
              <span>R2 Storage</span>
              <strong>42.8 GB / 100 GB</strong>
            </div>

            <div className="storage-progress">
              <div style={{ width: "42.8%" }} />
            </div>

            <small>42.8% iskorišteno</small>
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
              {activePage === "dashboard"
                ? "Dashboard"
                : activePage === "events"
                ? "Događaji"
                : activePage === "gallery"
                ? "Galerija"
                : "QR kodovi"}
            </h1>
          </div>

          <div className="topbar-actions">
            <button className="icon-button">⌕</button>
            <button className="icon-button notification">♢</button>

            <button
              className="new-event-button"
              onClick={() => setActivePage("events")}
            >
              <span>+</span>
              Novi događaj
            </button>
          </div>
        </header>

        {activePage === "dashboard" && (
          <>
            <section className="stats-grid">
              <StatCard
                title="Aktivni događaji"
                value="12"
                change="+3"
                description="u odnosu na prošli mjesec"
                icon="◫"
              />

              <StatCard
                title="Ukupno gostiju"
                value="1.284"
                change="+18.4%"
                description="u odnosu na prošli mjesec"
                icon="♙"
              />

              <StatCard
                title="Uploadane fotografije"
                value="8.642"
                change="+24.7%"
                description="u odnosu na prošli mjesec"
                icon="▧"
              />

              <StatCard
                title="R2 prostor"
                value="42.8 GB"
                change="42.8%"
                description="od ukupno 100 GB"
                icon="☁"
              />
            </section>

            <section className="dashboard-grid">
              <div className="panel recent-panel">
                <div className="panel-header">
                  <div>
                    <h2>Zadnje dodane fotografije</h2>
                    <p>Najnovije fotografije gostiju</p>
                  </div>

                  <button
                    className="text-button"
                    onClick={() => setActivePage("gallery")}
                  >
                    Prikaži sve →
                  </button>
                </div>

                <div className="photo-grid">
                  {recentPhotos.map((photo) => (
                    <div className="photo-card" key={photo.id}>
                      <img src={photo.image} alt="" />

                      <div className="photo-overlay">
                        <strong>{photo.guest}</strong>
                        <span>{photo.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <UpcomingEvents
                events={events}
                onSelect={(event) => {
                  setSelectedEvent(event);
                  setShowQR(true);
                }}
              />
            </section>

            <section className="panel events-panel">
              <div className="panel-header">
                <div>
                  <h2>Najnoviji događaji</h2>
                  <p>Pregled klijenata i aktivnih QR kodova</p>
                </div>

                <button
                  className="text-button"
                  onClick={() => setActivePage("events")}
                >
                  Svi događaji →
                </button>
              </div>

              <EventsTable
                events={events.slice(0, 4)}
                onQR={(event) => {
                  setSelectedEvent(event);
                  setShowQR(true);
                }}
              />
            </section>
          </>
        )}

        {activePage === "events" && (
          <section className="page-section">
            <div className="page-actions">
              <div>
                <h2>Svi događaji</h2>
                <p>Upravljajte klijentima, događajima i QR kodovima.</p>
              </div>

              <button className="new-event-button">
                + Novi događaj
              </button>
            </div>

            <div className="search-row">
              <div className="search-box">
                <span>⌕</span>
                <input
                  placeholder="Pretraži klijente, događaje ili lokacije..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select>
                <option>Svi statusi</option>
                <option>Aktivni</option>
                <option>Draft</option>
                <option>Završeni</option>
              </select>
            </div>

            <section className="panel">
              <EventsTable
                events={filteredEvents}
                onQR={(event) => {
                  setSelectedEvent(event);
                  setShowQR(true);
                }}
              />
            </section>
          </section>
        )}

        {activePage === "gallery" && (
          <section className="page-section">
            <div className="page-actions">
              <div>
                <h2>Galerija</h2>
                <p>Pregled fotografija svih događaja.</p>
              </div>
            </div>

            <div className="gallery-page-grid">
              {[...recentPhotos, ...recentPhotos].map((photo, index) => (
                <div className="gallery-large-card" key={index}>
                  <img src={photo.image} alt="" />
                  <div>
                    <strong>{photo.guest}</strong>
                    <span>{photo.event}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === "qr" && (
          <section className="page-section">
            <div className="page-actions">
              <div>
                <h2>QR kodovi</h2>
                <p>Upravljanje QR pristupom za događaje.</p>
              </div>
            </div>

            <div className="qr-grid">
              {events.map((event) => (
                <div className="qr-event-card" key={event.id}>
                  <div className="qr-preview">
                    <div className="fake-qr">
                      <span>▦</span>
                    </div>
                  </div>

                  <div className="qr-event-info">
                    <div className="status-line">
                      <span
                        className={`status-dot ${
                          event.qrActive ? "green" : "gray"
                        }`}
                      />
                      {event.qrActive ? "QR aktivan" : "QR neaktivan"}
                    </div>

                    <h3>{event.client}</h3>
                    <p>{event.event}</p>

                    <code>/e/{event.id}</code>

                    <div className="qr-actions">
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowQR(true);
                        }}
                      >
                        Otvori QR
                      </button>

                      <button className="secondary">
                        Kopiraj link
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {showQR && selectedEvent && (
        <QRModal
          event={selectedEvent}
          link={guestLink}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, change, description, icon }) {
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
        <strong>{change}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}

function UpcomingEvents({ events, onSelect }) {
  return (
    <div className="panel upcoming-panel">
      <div className="panel-header">
        <div>
          <h2>Uskoro počinju</h2>
          <p>Sljedeći događaji</p>
        </div>
      </div>

      <div className="upcoming-list">
        {events
          .filter((event) => event.status === "active")
          .slice(0, 4)
          .map((event) => (
            <div className="upcoming-item" key={event.id}>
              <div className="date-box">
                <strong>{event.date.slice(0, 2)}</strong>
                <span>SEP</span>
              </div>

              <div className="upcoming-info">
                <strong>{event.client}</strong>
                <span>
                  {event.event} · {event.time}
                </span>
                <small>⌖ {event.location}</small>
              </div>

              <button onClick={() => onSelect(event)}>•••</button>
            </div>
          ))}
      </div>
    </div>
  );
}

function EventsTable({ events, onQR }) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Klijent</th>
            <th>Događaj</th>
            <th>Datum</th>
            <th>Lokacija</th>
            <th>Status</th>
            <th>Fotografije</th>
            <th>QR</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>
                <div className="client-cell">
                  <div className="client-avatar">
                    {event.client.charAt(0)}
                  </div>

                  <div>
                    <strong>{event.client}</strong>
                    <span>{event.guests} gostiju</span>
                  </div>
                </div>
              </td>

              <td>{event.event}</td>

              <td>
                <strong>{event.date}</strong>
                <span className="table-sub">{event.time}</span>
              </td>

              <td>{event.location}</td>

              <td>
                <span className={`status ${event.status}`}>
                  {event.status === "active"
                    ? "Aktivan"
                    : event.status === "draft"
                    ? "Draft"
                    : "Završen"}
                </span>
              </td>

              <td>{event.photos}</td>

              <td>
                <button
                  className={`qr-mini ${
                    !event.qrActive ? "inactive" : ""
                  }`}
                  onClick={() => onQR(event)}
                >
                  <span>⌗</span>
                  {event.qrActive ? "Aktivan" : "Nije aktivan"}
                </button>
              </td>

              <td>
                <button className="more-button">•••</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QRModal({ event, link, onClose }) {
  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="modal-heading">
          <span>QR KOD</span>
          <h2>{event.client}</h2>
          <p>{event.event}</p>
        </div>

        <div className="modal-qr">
          <div className="fake-qr large">
            <span>▦</span>
          </div>
        </div>

        <div className="qr-status">
          <span className="status-dot green" />
          QR kod je aktivan
        </div>

        <div className="link-box">
          <span>{link}</span>
          <button onClick={copyLink}>Kopiraj</button>
        </div>

        <div className="modal-actions">
          <button className="primary">↓ PNG</button>
          <button className="secondary">↓ SVG</button>
          <button className="secondary">♧ Print</button>
        </div>

        <div className="danger-actions">
          <button>Regeneriraj QR</button>
          <button>Deaktiviraj QR</button>
        </div>
      </div>
    </div>
  );
}

export default Admin;