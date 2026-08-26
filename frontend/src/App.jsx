import "./App.css";
import { Routes, Route } from "react-router-dom";
import Demo from "./pages/Demo.jsx";

function Home() {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <a href="/" className="logo">
            <span className="logo-mark">✦</span>
            <span>ReMoment </span>
          </a>

          <div className="nav-links">
            <a href="#dizajn">Dizajn</a>
            <a href="#cjenik">Cjenik</a>
            <a href="#kontakt">Kontakt</a>
            <a href="#demo">Demo</a>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-glow glow-one"></div>
          <div className="hero-glow glow-two"></div>

          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              Uspomene koje traju
            </div>

            <h1>
              Uspomena koja
              <br />
              <span>se pamti.</span>
            </h1>

            <p className="hero-description">
              Kreiramo moderne, pozivnice i digitalne uspomene koje ostavljaju dojam i traju zauvijek.
            </p>

            <div className="hero-buttons">
              <a href="#kontakt" className="btn btn-primary">
                Započni projekt
                <span>→</span>
              </a>

              <a href="#dizajn" className="btn btn-secondary">
                Pogledaj radove
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-card card-main">
              <div className="visual-text">
                <img
                  src="/home2.jpg"
                  alt="Primjer digitalne pozivnice"
                />
              </div>
            </div>

            <div className="floating-card floating-two">
              <span>Već od</span>
              <strong>9,99 €</strong>
            </div>
          </div>
        </section>
        <section className="stats">
          <div>
            <strong>5 GB</strong>
            <span>Prostora</span>
          </div>

          <div>
            <strong>30 dana</strong>
            <span>čuvanja slika</span>
          </div>

          <div>
            <strong>Izvorna</strong>
            <span>kvaliteta slika</span>
          </div>

          <div>
            <strong>24/7</strong>
            <span>Podrška</span>
          </div>
        </section>

        <section className="invitations-section" id="dizajn">
          <div className="section-heading">
            <span>01 — POZIVNICE</span>

            <h2>
              Dizajn koji se
              <br />
              <em>pamti.</em>
            </h2>
          </div>

          <div className="invitation-grid">
            <article className="invitation-card">
              <div className="invitation-preview">
                <img
                  src="/invitation.png"
                  alt="Primjer digitalne pozivnice"
                />
              </div>

              <div className="invitation-info">
                <div>
                  <span>01</span>
                  <h3>Elegant</h3>
                </div>

                <span className="invitation-arrow">↗</span>
              </div>
            </article>

            <article className="invitation-card">
              <div className="invitation-preview">
                <img
                  src="/invitation.png"
                  alt="Primjer digitalne pozivnice"
                />
              </div>

              <div className="invitation-info">
                <div>
                  <span>02</span>
                  <h3>Moments</h3>
                </div>

                <span className="invitation-arrow">↗</span>
              </div>
            </article>

            <article className="invitation-card">
              <div className="invitation-preview">
                <img
                  src="/invitation.png"
                  alt="Primjer digitalne pozivnice"
                />
              </div>

              <div className="invitation-info">
                <div>
                  <span>03</span>
                  <h3>Forever</h3>
                </div>

                <span className="invitation-arrow">↗</span>
              </div>
            </article>
          </div>
        </section>

        <section className="how-it-works" id="kako-radi">
          <div className="section-heading">
            <span>02 — KAKO FUNKCIONIRA</span>

            <h2>
              Svaka fotografija
              <br />
              <em>jedna uspomena.</em>
            </h2>
<div className="section-intro">
            <p className="section-intro-text">
              Postavi QR kod na stolove i dopusti svojim gostima da
              jednostavno podijele trenutke koje su zabilježili.
              Bez aplikacije. Bez kompliciranja.
            </p>
            </div>
          </div>

          <div className="process-grid">

            {/* 01 */}
            <article className="process-card">
              <div className="process-number">01</div>

              <div className="process-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-qr-code-icon lucide-qr-code"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
              </div>

              <h3>Skeniraj</h3>

              <p>
                Gost jednostavno skenira QR kod svojim mobitelom
                i odmah pristupa mjestu gdje dijeli uspomene.
              </p>

              <div className="process-tag">
                Bez aplikacije
              </div>
            </article>

            {/* 02 */}
            <article className="process-card featured-process">
              <div className="process-number">02</div>

              <div className="process-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-share2-icon lucide-share-2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
              </div>

              <h3>Podijeli</h3>

              <p>
                Fotografije i videozapise koje su gosti snimili
                mogu prenijeti direktno sa svog mobitela.
              </p>

              <div className="process-tag">
                Jednostavno učitavanje
              </div>
            </article>

            {/* 03 */}
            <article className="process-card">
              <div className="process-number">03</div>

              <div className="process-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart-icon lucide-heart"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>
              </div>

              <h3>Sačuvaj</h3>

              <p>
                Sve uspomene ostaju na jednom mjestu, u punoj kvaliteti,
                spremne za pregledavanje i preuzimanje.
              </p>

              <div className="process-tag">
                Puna kvaliteta
              </div>
            </article>

          </div>

          <div className="memory-banner">
            <div className="memory-banner-content">
              <span className="memory-label">
                SVE USPOMENE NA JEDNOM MJESTU
              </span>

              <h3>
                Tvoj događaj iz
                <br />
                <em>svih pogleda.</em>
              </h3>

              <p>
                Gosti vide događaj svojim očima. Cherish ti omogućuje
                da vidiš sve te trenutke na jednom mjestu.
              </p>
            </div>

            <div className="memory-stats">
              <div>
                <strong>100%</strong>
                <span>puna kvaliteta</span>
              </div>

              <div>
                <strong>∞</strong>
                <span>uspomena</span>
              </div>

              <div>
                <strong>1</strong>
                <span>galerija</span>
              </div>
            </div>
          </div>
        </section>
        <section className="pricing" id="cjenik">
          <div className="section-heading">
            <span>03 — CJENIK</span>
            <h2>
              Jednostavne cijene.
              <br />
              <em>Bez skrivenih troškova.</em>
            </h2>
          </div>

          <div className="pricing-grid">
            <div className="price-card">
              <span>STARTER</span>
              <h3>€499</h3>
              <p>Za jednostavne projekte i landing stranice.</p>
              <a href="#kontakt">Odaberi paket →</a>
            </div>

            <div className="price-card popular">
              <div className="popular-label">NAJPOPULARNIJE</div>
              <span>BUSINESS</span>
              <h3>€999</h3>
              <p>Kompletno rješenje za ozbiljan digitalni nastup.</p>
              <a href="#kontakt">Odaberi paket →</a>
            </div>

            <div className="price-card">
              <span>PREMIUM</span>
              <h3>€1.999+</h3>
              <p>Potpuno custom rješenje prema vašim potrebama.</p>
              <a href="#kontakt">Kontaktiraj nas →</a>
            </div>
          </div>
        </section>

        <section className="contact-section" id="kontakt">
          <div className="contact-wrapper">
            <div className="contact-info">
              <span className="contact-label">03 — KONTAKT</span>

              <h2>
                Želiš prilagoditi
                <br />
                <em>pozivnicu?</em>
              </h2>

              <p>
                Slobodno nas kontaktiraj kako bi prilagodili pozivnicu tvojim željama. Pošalji nam
                upit i javit ćemo ti se u najkraćem mogućem roku.
              </p>

              <div className="contact-details">
                <div className="contact-detail">
                  <span>Email</span>
                  <a href="mailto:hello@designly.com">
                    hello@designly.com
                  </a>
                </div>

                <div className="contact-detail">
                  <span>Lokacija</span>
                  <strong>Daruvar, Hrvatska</strong>
                </div>
              </div>
            </div>

            <form className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Ime i prezime</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Ivan Horvat"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="ivan@email.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="project">Tvoje želje</label>

                <select id="project" defaultValue="">
                  <option value="" disabled>
                    Odaberi želju
                  </option>
                  <option value="web">Pozivnica</option>
                  <option value="uiux">Pozivnica + Uspomene gostiju</option>
                  <option value="branding">Uspomene gostiju</option>
                  <option value="other">Nešto drugo</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="message">Poruka</label>

                <textarea
                  id="message"
                  rows="5"
                  placeholder="Reci nam nešto više..."
                />
              </div>

              <button type="submit" className="contact-submit">
                Pošalji upit
                <span>↗</span>
              </button>
            </form>
          </div>
        </section>
        <section className="demo-section" id="demo">
          <div className="demo-content">
            <span className="demo-label">ReMoment — DEMO</span>

            <h2>
              Tvoj događaj.
              <br />
              <em>Vaše uspomene.</em>
            </h2>

            <p>
              Pogledaj kako ReMoment pretvara svaki događaj u zajedničku
              kolekciju uspomena koje ostaju zauvijek.
            </p>

            <a href="/demo" className="demo-button">
              Pogledaj demo
              <span>↗</span>
            </a>
          </div>

          <div className="demo-decoration decoration-one"></div>
          <div className="demo-decoration decoration-two"></div>
        </section>
      </main>

      <footer>
        <span>© 2026 Momento</span>
        <span>Made with intention.</span>
      </footer>
    </div>
  );
};
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/demo" element={<Demo />} />
    </Routes>
  );
}
export default App;