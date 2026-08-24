import "./App.css";

function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <a href="/" className="logo">
            <span className="logo-mark">✦</span>
            <span>Čestitke</span>
          </a>

          <div className="nav-links">
            <a href="#dizajn">Dizajn</a>
            <a href="#cjenik">Cjenik</a>
            <a href="#kontakt">Kontakt</a>
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
              <div className="card-top">
                <span className="mini-logo">✦</span>
                <span className="mini-dot"></span>
              </div>

              <div className="visual-text">
                <span>CREATE</span>
                <strong>WITHOUT<br />LIMITS.</strong>
              </div>

              <div className="visual-bottom">
                <div></div>
                <span>2026</span>
              </div>
            </div>

            <div className="floating-card floating-one">
              <span>UI/UX</span>
              <strong>98%</strong>
            </div>

            <div className="floating-card floating-two">
              <span>Projects</span>
              <strong>120+</strong>
            </div>
          </div>
        </section>

        <section className="stats">
          <div>
            <strong>120+</strong>
            <span>Projekata</span>
          </div>

          <div>
            <strong>5+</strong>
            <span>Godina iskustva</span>
          </div>

          <div>
            <strong>98%</strong>
            <span>Zadovoljnih klijenata</span>
          </div>

          <div>
            <strong>24/7</strong>
            <span>Podrška</span>
          </div>
        </section>

        <section className="services" id="dizajn">
          <div className="section-heading">
            <span>01 — ŠTO RADIMO</span>
            <h2>
              Sve što trebaš za
              <br />
              <em>bolji digitalni proizvod.</em>
            </h2>
          </div>

          <div className="service-grid">
            <article className="service-card">
              <span className="service-number">01</span>
              <h3>Web dizajn</h3>
              <p>
                Moderne i funkcionalne web stranice napravljene da izgledaju
                odlično na svakom uređaju.
              </p>
              <span className="service-arrow">↗</span>
            </article>

            <article className="service-card featured">
              <span className="service-number">02</span>
              <h3>UI / UX</h3>
              <p>
                Promišljena korisnička iskustva koja spajaju estetiku,
                jednostavnost i funkcionalnost.
              </p>
              <span className="service-arrow">↗</span>
            </article>

            <article className="service-card">
              <span className="service-number">03</span>
              <h3>Branding</h3>
              <p>
                Vizualni identitet koji vašem brendu daje karakter i
                prepoznatljivost.
              </p>
              <span className="service-arrow">↗</span>
            </article>
          </div>
        </section>

        <section className="pricing" id="cjenik">
          <div className="section-heading">
            <span>02 — CJENIK</span>
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

        <section className="contact" id="kontakt">
          <div className="contact-content">
            <span>03 — KONTAKT</span>

            <h2>
              Imaš ideju?
              <br />
              <em>Napravimo je stvarnom.</em>
            </h2>

            <p>
              Ispričaj nam o svom projektu i javit ćemo ti se u najkraćem
              mogućem roku.
            </p>

            <a href="mailto:hello@designly.com" className="contact-button">
              hello@designly.com
              <span>↗</span>
            </a>
          </div>
        </section>
      </main>

      <footer>
        <span>© 2026 Designly</span>
        <span>Made with intention.</span>
      </footer>
    </div>
  );
}

export default App;