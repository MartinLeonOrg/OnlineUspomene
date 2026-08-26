# Online Uspomene

LINK: https://onlineuspomene.netlify.app/

Online Uspomene je web aplikacija za dijeljenje fotografija s događaja, prvenstveno vjenčanja.

Gosti mogu otvoriti javnu stranicu događaja, dodavati fotografije sa svojih uređaja i pregledavati zajedničku galeriju bez potrebe za instalacijom aplikacije ili kreiranjem korisničkog računa.

Projekt je podijeljen na dva glavna dijela:

- `frontend` — React aplikacija koju koriste gosti i kasnije administratori
- `backend` — Cloudflare Worker API koji obrađuje zahtjeve frontenda i komunicira s Cloudflare servisima

---

## Struktura projekta

```text
OnlineUspomene/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── wrangler.jsonc
│
├── backend/
│   ├── src/
│   │   └── index.js
│   ├── package.json
│   ├── package-lock.json
│   └── wrangler.jsonc
│
├── .gitignore
└── README.md
```
