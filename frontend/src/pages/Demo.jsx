import { useState, useRef, useCallback, useEffect } from "react";
import heic2any from "heic2any";

const WORKER = import.meta.env.VITE_WORKER_URL;
const NAMES  = import.meta.env.VITE_COUPLE_NAMES  || "Ana & Marko";
const DATE   = import.meta.env.VITE_WEDDING_DATE  || "31 veljače 2027";
const MAX    = 10;

const PALETTE = {
  pearl: "#FAF5EF",
  green: "#1A4332",
  gold: "#C5A065",
  white: "#FFFFFF",
  greenDisabled: "#4A6B5D",
  goldLight: "rgba(197, 160, 101, 0.3)"
};

const normalizeFile = async (file) => {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");

  if (!isHeic) return file;

  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.88,
  });

  const blob = Array.isArray(converted) ? converted[0] : converted;
  const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([blob], newName, { type: "image/jpeg" });
};

export default function WeddingApp() {
  const [view, setView]           = useState("home");
  const [files, setFiles]         = useState([]);
  const [progress, setProgress]   = useState({});
  const [done, setDone]           = useState(false);
  const [photos, setPhotos]       = useState([]);
  const [lightbox, setLightbox]   = useState(null);
  const [drag, setDrag]           = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const inputRef = useRef();

  const loadPhotos = async () => {
    setLoadingGallery(true);
    try {
      const res  = await fetch(`${WORKER}/photos`);
      const data = await res.json();
      setPhotos(data.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    if (view === "gallery") loadPhotos();
  }, [view]);

  const handleFiles = (f) => {
    setFiles(Array.from(f).slice(0, MAX));
    setProgress({});
    setDone(false);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const uploadAll = async () => {
    if (!files.length) return;
    const init = {};
    files.forEach((_, i) => (init[i] = 0));
    setProgress(init);

    await Promise.all(
      files.map(async (file, i) => {
        try {
          const normalized = await normalizeFile(file);

          const res = await fetch(`${WORKER}/presign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: normalized.name,
              contentType: normalized.type,
            }),
          });
          const { uploadUrl } = await res.json();

          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                setProgress((p) => ({
                  ...p,
                  [i]: Math.round((e.loaded / e.total) * 100),
                }));
              }
            };
            xhr.onload  = () => (xhr.status < 300 ? resolve() : reject(xhr.status));
            xhr.onerror = reject;
            xhr.open("PUT", uploadUrl);
            xhr.send(normalized);
          });

          setProgress((p) => ({ ...p, [i]: 100 }));
        } catch (e) {
          console.error("Upload error:", e);
          setProgress((p) => ({ ...p, [i]: -1 }));
        }
      })
    );

    setDone(true);
  };

  const totalProgress = files.length
    ? Math.round(
        Object.values(progress)
          .filter((v) => v >= 0)
          .reduce((a, b) => a + b, 0) / files.length
      )
    : 0;

  const isUploading = Object.keys(progress).length > 0 && !done;

  return (
    <div style={{
      minHeight: "100vh",
      background: PALETTE.pearl,
      fontFamily: "'Cormorant Garamond', 'Georgia', serif",
      color: PALETTE.green,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `
          radial-gradient(ellipse at 20% 10%, rgba(212,175,120,0.13) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 80%, rgba(180,140,100,0.10) 0%, transparent 55%)
        `,
      }} />

      <svg style={{ position:"fixed", top:0, left:0, width:120, height:120, opacity:0.18, pointerEvents:"none", zIndex:1 }} viewBox="0 0 120 120">
        <path d="M10,10 Q60,10 10,60" stroke="#b8916a" strokeWidth="1.2" fill="none"/>
        <path d="M10,10 L10,40 M10,10 L40,10" stroke="#b8916a" strokeWidth="1" fill="none"/>
        <circle cx="10" cy="10" r="3" fill="#b8916a"/>
      </svg>
      <svg style={{ position:"fixed", bottom:0, right:0, width:120, height:120, opacity:0.18, pointerEvents:"none", zIndex:1, transform:"rotate(180deg)" }} viewBox="0 0 120 120">
        <path d="M10,10 Q60,10 10,60" stroke="#b8916a" strokeWidth="1.2" fill="none"/>
        <path d="M10,10 L10,40 M10,10 L40,10" stroke="#b8916a" strokeWidth="1" fill="none"/>
        <circle cx="10" cy="10" r="3" fill="#b8916a"/>
      </svg>

      <div style={{ position:"relative", zIndex:2, maxWidth:520, margin:"0 auto", padding:"0 20px 40px" }}>

        {/* ── HOME ── */}
        {view === "home" && (
          <div style={{ textAlign:"center", paddingTop:60 }}>
            <div style={{ fontSize:52, lineHeight:1.1, fontWeight:400, marginBottom:8, fontStyle:"italic" }}>
              {NAMES}
            </div>
            <div style={{ width:60, height:1, background:"#b8916a", margin:"18px auto", opacity:0.6 }} />
            <div style={{ fontSize:15, letterSpacing:"0.15em", color:"#7a6248", marginBottom:8 }}>
              {DATE}
            </div>
            <p style={{ fontSize:16, lineHeight:1.8, color:"#5a4535", margin:"28px auto 40px", maxWidth:360, fontStyle:"italic" }}>
              Cieszymy się, że możemy dzielić ten wyjątkowy dzień razem z Wami. Podzielcie się z nami swoimi zdjęciami!
            </p>

            <div style={{ display:"flex", flexDirection:"column", gap:14, alignItems:"center" }}>
              <button onClick={() => setView("upload")} style={btnStyle("primary")}>
                Dodaj zdjęcia
              </button>
              <button onClick={() => setView("gallery")} style={btnStyle("secondary")}>
                Galeria zdjęć
              </button>
            </div>

            <div style={{ marginTop:60, fontSize:12, letterSpacing:"0.2em", color:"#c4a882", textTransform:"uppercase" }}>
              ✦ &nbsp; Dziękujemy za Waszą obecność &nbsp; ✦
            </div>
          </div>
        )}

        {/* ── UPLOAD ── */}
        {view === "upload" && (
          <div style={{ paddingTop:40 }}>
            <button onClick={() => { setView("home"); setFiles([]); setProgress({}); setDone(false); }} style={backBtn()}>
              ← Powrót
            </button>
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <div style={{ fontSize:13, letterSpacing:"0.3em", color:"#b8916a", textTransform:"uppercase", marginBottom:10 }}>Podziel się chwilą</div>
              <div style={{ fontSize:36, fontStyle:"italic" }}>Dodaj zdjęcia</div>
              <div style={{ width:40, height:1, background:"#b8916a", margin:"14px auto" }} />
              <div style={{ fontSize:20, color:"#8a7060" }}>Jednorazowo możesz dodać {MAX} zdjęć</div>
            </div>

            {!done ? (
              <>
                <div
                  onDragOver={e => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && inputRef.current.click()}
                  style={{
                    border: `2px dashed ${drag ? "#b8916a" : "#d4c4b0"}`,
                    borderRadius: 16,
                    padding: "44px 20px",
                    textAlign: "center",
                    cursor: isUploading ? "default" : "pointer",
                    background: drag ? "rgba(184,145,106,0.07)" : "rgba(255,255,255,0.5)",
                    transition: "all 0.2s",
                    marginBottom: 20,
                  }}
                >
                  <svg width="38" height="34" viewBox="0 0 38 34" fill="none" style={{ marginBottom:12, opacity:0.45 }}>
                    <path d="M14 4L11.5 8H4C2.34 8 1 9.34 1 11V29C1 30.66 2.34 32 4 32H34C35.66 32 37 30.66 37 29V11C37 9.34 35.66 8 34 8H26.5L24 4H14Z" stroke="#b8916a" strokeWidth="1.6" fill="none"/>
                    <circle cx="19" cy="20" r="6" stroke="#b8916a" strokeWidth="1.6" fill="none"/>
                  </svg>
                  <div style={{ fontSize:15, color:"#7a6248", fontStyle:"italic" }}>
                    {files.length
                      ? `Wybrano ${files.length} plik${files.length > 1 ? (files.length < 5 ? "i" : "ów") : ""}`
                      : "Przeciągnij zdjęcia lub kliknij tutaj"}
                  </div>
                  <div style={{ fontSize:12, color:"#a89070", marginTop:6 }}>JPG, PNG, HEIC · maks. {MAX} plików</div>
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*,.heic,.heif"
                    style={{ display:"none" }}
                    onChange={e => handleFiles(e.target.files)}
                  />
                </div>

                {files.length > 0 && (
                  <div style={{ marginBottom:20 }}>
                    {files.map((f, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(184,145,106,0.15)" }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity:0.4, flexShrink:0 }}>
                          <rect x="1" y="1" width="12" height="12" rx="2" stroke="#b8916a" strokeWidth="1.2"/>
                          <circle cx="4.5" cy="4.5" r="1" fill="#b8916a"/>
                          <path d="M1 9.5L4 6.5L6.5 9L9.5 5.5L13 9.5" stroke="#b8916a" strokeWidth="1.1"/>
                        </svg>
                        <span style={{ flex:1, fontSize:13, color:"#5a4535", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</span>
                        <span style={{ fontSize:11, color:"#a89070" }}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                        {progress[i] !== undefined && (
                          <span style={{ fontSize:11, color: progress[i] === -1 ? "#cc4400" : progress[i] === 100 ? "#6aaa6a" : "#b8916a", minWidth:36, textAlign:"right", fontFamily:"monospace" }}>
                            {progress[i] === -1 ? "błąd" : progress[i] === 100 ? "✓" : `${progress[i]}%`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {Object.keys(progress).length > 0 && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#8a7060", marginBottom:6 }}>
                      <span style={{ letterSpacing:"0.05em" }}>Przesyłanie…</span>
                      <span style={{ fontFamily:"monospace" }}>{totalProgress}%</span>
                    </div>
                    <div style={{ height:6, borderRadius:99, background:"#ede4d8", overflow:"hidden" }}>
                      <div style={{
                        height:"100%", borderRadius:99,
                        background:"linear-gradient(90deg, #c4a06a, #a07840)",
                        width:`${totalProgress}%`,
                        transition:"width 0.15s ease",
                      }} />
                    </div>
                  </div>
                )}

                <div style={{ display:"flex", justifyContent:"center" }}>
                  <button
                    onClick={uploadAll}
                    disabled={!files.length || isUploading}
                    style={btnStyle("primary", !files.length || isUploading)}
                  >
                    {isUploading ? `Wysyłanie… ${totalProgress}%` : "Wyślij zdjęcia"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"40px 0" }}>
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ marginBottom:16 }}>
                  <circle cx="26" cy="26" r="24" stroke="#b8916a" strokeWidth="1.4" opacity="0.4"/>
                  <path d="M15 26L22 33L37 18" stroke="#b8916a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div style={{ fontSize:28, fontStyle:"italic", marginBottom:10 }}>Dziękujemy!</div>
                <p style={{ fontSize:15, color:"#7a6248", lineHeight:1.8, marginBottom:32, fontStyle:"italic", maxWidth:300, margin:"0 auto 32px" }}>
                  Wasze zdjęcia zostały dodane do galerii weselnej.
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"center" }}>
                  <button onClick={() => setView("gallery")} style={btnStyle("primary")}>
                    Przejdź do galerii
                  </button>
                  <button onClick={() => { setFiles([]); setProgress({}); setDone(false); }} style={btnStyle("secondary")}>
                    Dodaj więcej zdjęć
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GALLERY ── */}
        {view === "gallery" && (
          <div style={{ paddingTop:40 }}>
            <button onClick={() => setView("home")} style={backBtn()}>← Powrót</button>
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ fontSize:13, letterSpacing:"0.3em", color:"#b8916a", textTransform:"uppercase", marginBottom:10 }}>Wspólne chwile</div>
              <div style={{ fontSize:36, fontStyle:"italic" }}>Galeria</div>
              <div style={{ width:40, height:1, background:"#b8916a", margin:"14px auto" }} />
              <div style={{ fontSize:13, color:"#8a7060" }}>
                {loadingGallery ? "Ładowanie…" : `${photos.length} zdjęć · kliknij aby powiększyć`}
              </div>
            </div>

            {loadingGallery ? (
              <div style={{ textAlign:"center", padding:"60px 0", color:"#b8916a", fontSize:14, letterSpacing:"0.1em" }}>
                Ładowanie galerii…
              </div>
            ) : photos.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 0", color:"#a89070", fontSize:15, fontStyle:"italic" }}>
                Brak zdjęć — bądź pierwszym który doda!
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => { setLightbox(photo); setView("lightbox"); }}
                    style={{ aspectRatio:"1", overflow:"hidden", borderRadius:10, cursor:"pointer" }}
                  >
                    <img
                      src={photo.url}
                      alt=""
                      style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.3s" }}
                      onMouseEnter={e => e.target.style.transform = "scale(1.06)"}
                      onMouseLeave={e => e.target.style.transform = "scale(1)"}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:"flex", justifyContent:"center", marginTop:28 }}>
              <button onClick={() => setView("upload")} style={btnStyle("primary")}>
                Dodaj swoje zdjęcia
              </button>
            </div>
          </div>
        )}

        {/* ── LIGHTBOX ── */}
        {view === "lightbox" && lightbox && (
          <div
            onClick={() => setView("gallery")}
            style={{
              position:"fixed", inset:0, background:"rgba(26,16,8,0.93)", zIndex:100,
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              padding:20, cursor:"pointer",
            }}
          >
            <button
              onClick={() => setView("gallery")}
              style={{
                position:"absolute", top:20, right:20,
                background:"rgba(255,255,255,0.10)",
                border:"1px solid rgba(255,255,255,0.15)",
                color:"rgba(255,255,255,0.7)",
                borderRadius:99, width:40, height:40,
                fontSize:18, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"inherit",
              }}
            >✕</button>
            <img
              src={lightbox.url}
              alt=""
              style={{ maxWidth:"100%", maxHeight:"80vh", borderRadius:12, boxShadow:"0 20px 80px rgba(0,0,0,0.6)" }}
              onClick={e => e.stopPropagation()}
            />
            <div style={{ color:"rgba(255,255,255,0.35)", fontSize:11, marginTop:14, letterSpacing:"0.2em", textTransform:"uppercase" }}>
              {lightbox.key?.split("/").pop()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function btnStyle(type = "primary", disabled = false) {
  const base = {
    width: 320,
    padding: "15px 28px",
    borderRadius: 99,
    fontSize: 14,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    transition: "all 0.2s",
    display: "flex", alignItems: "center", justifyContent: "center",
    opacity: disabled ? 0.5 : 1,
  };
  if (type === "primary") return {
    ...base,
    background: disabled ? PALETTE.greenDisabled : PALETTE.green,
    color: PALETTE.pearl,
    boxShadow: disabled ? "none" : "0 4px 20px rgba(26, 67, 50, 0.2)",
  };
  return {
    ...base,
    background: "transparent",
    color: PALETTE.gold,
    border: `1.5px solid ${PALETTE.gold}`,
  };
}

function backBtn() {
  return {
    background:"none", 
    border:"none", 
    color: PALETTE.green,
    fontSize:13,
    letterSpacing:"0.15em", 
    textTransform:"uppercase", 
    cursor:"pointer",
    padding:"0 0 24px", 
    fontFamily:"inherit",
  };
}
