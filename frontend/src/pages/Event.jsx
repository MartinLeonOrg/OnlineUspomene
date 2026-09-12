import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import heic2any from 'heic2any';

// -----------------------------------------------------------------------
// pages/Event.jsx
//
// This is the REAL per-event guest page, reached only via a link/QR code
// generated in the Admin panel: /e/:slug
//
// It's the same design as Demo.jsx (which stays fixed on the 'demo' event
// for the marketing page), but here the slug comes from the route, and the
// event's name/date/active-status are fetched from the backend for that
// specific event — every event gets its own unique link and its own data.
// -----------------------------------------------------------------------

const WORKER = import.meta.env.VITE_WORKER_URL;
const MAX = 10;

const PALETTE = {
  pearl: '#FAF5EF',
  green: '#1A4332',
  gold: '#C5A065',
  white: '#FFFFFF',
  greenDisabled: '#4A6B5D',
  goldLight: 'rgba(197, 160, 101, 0.3)',
};

const normalizeFile = async (file) => {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif');

  if (!isHeic) return file;

  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.88,
  });

  const blob = Array.isArray(converted) ? converted[0] : converted;
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([blob], newName, { type: 'image/jpeg' });
};

export default function Event() {
  const { slug: eventSlug } = useParams();

  const [view, setView] = useState('home');
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({});
  const [done, setDone] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [drag, setDrag] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [guestNameInput, setGuestNameInput] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [message, setMessage] = useState('');

  const [eventInfo, setEventInfo] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState('');

  const inputRef = useRef();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${WORKER}/events/${eventSlug}`);
        if (!res.ok) throw new Error('not-found');
        const data = await res.json();
        if (!cancelled) setEventInfo(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setEventError('Ova stranica ne postoji ili više nije dostupna.');
      } finally {
        if (!cancelled) setEventLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventSlug]);

  const displayNames = eventInfo?.name || '';
  const displayDate = eventInfo?.eventDate || '';
  const eventIsActive = eventInfo ? eventInfo.active : false;

  useEffect(() => {
    const savedName = localStorage.getItem(`guest-name-${eventSlug}`);

    if (savedName) {
      setGuestName(savedName);
      setGuestNameInput(savedName);
      return;
    }

    setShowGuestModal(true);
  }, [eventSlug]);

  const saveGuestName = () => {
    const trimmedName = guestNameInput.trim();

    if (!trimmedName) return;

    localStorage.setItem(`guest-name-${eventSlug}`, trimmedName);

    setGuestName(trimmedName);
    setShowGuestModal(false);
  };

  const loadPhotos = async () => {
    setLoadingGallery(true);
    try {
      const res = await fetch(`${WORKER}/events/${eventSlug}/photos`);
      const data = await res.json();
      setPhotos(
        Array.isArray(data) ? data.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded)) : []
      );
    } catch (e) {
      console.error(e);
      setPhotos([]);
    } finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    if (view === 'gallery') loadPhotos();
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
    if (!files.length || !guestName) return;

    const init = {};
    files.forEach((_, i) => {
      init[i] = 0;
    });

    setProgress(init);

    await Promise.all(
      files.map(async (file, i) => {
        try {
          const normalized = await normalizeFile(file);

          const presignResponse = await fetch(`${WORKER}/events/${eventSlug}/presign`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: normalized.name,
              contentType: normalized.type,
            }),
          });

          if (!presignResponse.ok) {
            throw new Error(`Presign failed: ${presignResponse.status}`);
          }

          const { uploadUrl, key } = await presignResponse.json();

          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.onprogress = (event) => {
              if (!event.lengthComputable) return;

              setProgress((current) => ({
                ...current,
                [i]: Math.round((event.loaded / event.total) * 100),
              }));
            };

            xhr.onload = () => {
              if (xhr.status < 300) {
                resolve();
                return;
              }

              reject(new Error(`R2 upload failed: ${xhr.status}`));
            };

            xhr.onerror = () => {
              reject(new Error('R2 upload failed'));
            };

            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', normalized.type);
            xhr.send(normalized);
          });

          const photoResponse = await fetch(`${WORKER}/events/${eventSlug}/photos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              key,
              originalName: normalized.name,
              contentType: normalized.type,
              fileSize: normalized.size,
              guestName,
              message: message.trim() || null,
            }),
          });

          if (!photoResponse.ok) {
            throw new Error(`Saving photo failed: ${photoResponse.status}`);
          }

          setProgress((current) => ({
            ...current,
            [i]: 100,
          }));
        } catch (error) {
          console.error('Upload error:', error);

          setProgress((current) => ({
            ...current,
            [i]: -1,
          }));
        }
      })
    );

    setDone(true);
    setMessage('');
  };

  const totalProgress = files.length
    ? Math.round(
        Object.values(progress)
          .filter((v) => v >= 0)
          .reduce((a, b) => a + b, 0) / files.length
      )
    : 0;

  const isUploading = Object.keys(progress).length > 0 && !done;

  // --- Loading / not found / inactive states --------------------------
  if (eventLoading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: PALETTE.pearl,
          fontFamily: "'Cormorant Garamond', 'Georgia', serif",
          color: PALETTE.green,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          letterSpacing: '0.1em',
        }}
      >
        Učitavanje…
      </div>
    );
  }

  if (eventError) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: PALETTE.pearl,
          fontFamily: "'Cormorant Garamond', 'Georgia', serif",
          color: PALETTE.green,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 20,
        }}
      >
        <div style={{ fontSize: 28, fontStyle: 'italic', marginBottom: 10 }}>
          Stranica nije pronađena
        </div>
        <p style={{ fontSize: 15, color: '#7a6248', maxWidth: 320 }}>{eventError}</p>
      </div>
    );
  }

  if (!eventIsActive) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: PALETTE.pearl,
          fontFamily: "'Cormorant Garamond', 'Georgia', serif",
          color: PALETTE.green,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 20,
        }}
      >
        <div style={{ fontSize: 28, fontStyle: 'italic', marginBottom: 10 }}>{displayNames}</div>
        <p style={{ fontSize: 15, color: '#7a6248', maxWidth: 320 }}>
          Ova stranica trenutno nije aktivna. Provjerite s domaćinima je li QR kod još u upotrebi.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: PALETTE.pearl,
        fontFamily: "'Cormorant Garamond', 'Georgia', serif",
        color: PALETTE.green,
        position: 'relative',

        overflowX: 'hidden',
        overflowY: 'visible',
      }}
    >
      {showGuestModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(26, 16, 8, 0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 400,
              background: PALETTE.pearl,
              borderRadius: 22,
              padding: '36px 28px',
              textAlign: 'center',
              boxShadow: '0 24px 80px rgba(26, 16, 8, 0.25)',
              border: '1px solid rgba(197, 160, 101, 0.25)',
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: PALETTE.gold,
                marginBottom: 12,
              }}
            >
              Dobrodošli
            </div>

            <div
              style={{
                fontSize: 32,
                fontStyle: 'italic',
                marginBottom: 10,
              }}
            >
              Drago nam je što ste ovdje ♡
            </div>

            <p
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                color: '#7a6248',
                marginBottom: 26,
              }}
            >
              Upišite svoje ime ili nadimak kako bismo znali tko je podijelio uspomene.
            </p>
            <input
              type="text"
              value={guestNameInput}
              maxLength={80}
              autoFocus
              placeholder="Vaše ime ili nadimak"
              onChange={(e) => setGuestNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveGuestName();
                }
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid #d4c4b0',
                background: 'rgba(255,255,255,0.7)',
                color: PALETTE.green,
                fontSize: 16,
                fontFamily: 'inherit',
                outline: 'none',
                marginBottom: 18,
              }}
            />

            <button
              type="button"
              onClick={saveGuestName}
              disabled={!guestNameInput.trim()}
              style={{
                ...btnStyle('primary', !guestNameInput.trim()),
                width: '100%',
              }}
            >
              Nastavi
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: `
          radial-gradient(ellipse at 20% 10%, rgba(212,175,120,0.13) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 80%, rgba(180,140,100,0.10) 0%, transparent 55%)
        `,
        }}
      />

      <svg
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 120,
          height: 120,
          opacity: 0.18,
          pointerEvents: 'none',
          zIndex: 1,
        }}
        viewBox="0 0 120 120"
      >
        <path d="M10,10 Q60,10 10,60" stroke="#b8916a" strokeWidth="1.2" fill="none" />
        <path d="M10,10 L10,40 M10,10 L40,10" stroke="#b8916a" strokeWidth="1" fill="none" />
        <circle cx="10" cy="10" r="3" fill="#b8916a" />
      </svg>
      <svg
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: 120,
          height: 120,
          opacity: 0.18,
          pointerEvents: 'none',
          zIndex: 1,
          transform: 'rotate(180deg)',
        }}
        viewBox="0 0 120 120"
      >
        <path d="M10,10 Q60,10 10,60" stroke="#b8916a" strokeWidth="1.2" fill="none" />
        <path d="M10,10 L10,40 M10,10 L40,10" stroke="#b8916a" strokeWidth="1" fill="none" />
        <circle cx="10" cy="10" r="3" fill="#b8916a" />
      </svg>

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 520,
          margin: '0 auto',
          padding: '0 20px calc(80px + env(safe-area-inset-bottom))',
        }}
      >
        {/* ── HOME ── */}
        {view === 'home' && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div
              style={{
                fontSize: 52,
                lineHeight: 1.1,
                fontWeight: 400,
                marginBottom: 8,
                fontStyle: 'italic',
              }}
            >
              {displayNames}
            </div>
            <div
              style={{
                width: 60,
                height: 1,
                background: '#b8916a',
                margin: '18px auto',
                opacity: 0.6,
              }}
            />
            <div
              style={{ fontSize: 15, letterSpacing: '0.15em', color: '#7a6248', marginBottom: 8 }}
            >
              {displayDate}
            </div>
            {guestName && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 15,
                  color: '#8a7060',
                  fontStyle: 'italic',
                }}
              >
                Bok, {guestName} ♡
              </div>
            )}
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.8,
                color: '#5a4535',
                margin: '28px auto 40px',
                maxWidth: 360,
                fontStyle: 'italic',
              }}
            >
              Drago nam je što ovaj poseban dan možemo podijeliti s vama. Podijelite svoje
              fotografije s nama!
            </p>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}
            >
              <button onClick={() => setView('upload')} style={btnStyle('primary')}>
                Dodaj fotografije
              </button>
              <button onClick={() => setView('gallery')} style={btnStyle('secondary')}>
                Galerija fotografija
              </button>
            </div>

            <div
              style={{
                marginTop: 60,
                fontSize: 12,
                letterSpacing: '0.2em',
                color: '#c4a882',
                textTransform: 'uppercase',
              }}
            >
              ✦ &nbsp; Hvala vam što ste s nama u svakom trenutku&nbsp; ✦
            </div>
          </div>
        )}

        {/* ── UPLOAD ── */}
        {view === 'upload' && (
          <div style={{ paddingTop: 40 }}>
            <button
              onClick={() => {
                setView('home');
                setFiles([]);
                setProgress({});
                setMessage('');
                setDone(false);
              }}
              style={backBtn()}
            >
              ← Povratak
            </button>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div
                style={{
                  fontSize: 13,
                  letterSpacing: '0.3em',
                  color: '#b8916a',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Podijeli trenutak
              </div>
              <div style={{ fontSize: 36, fontStyle: 'italic' }}>Dodaj fotografije</div>
              <div style={{ width: 40, height: 1, background: '#b8916a', margin: '14px auto' }} />
              <div style={{ fontSize: 20, color: '#8a7060' }}>
                Odjednom možete dodati najviše {MAX} fotografija
              </div>
            </div>

            {!done ? (
              <>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && inputRef.current.click()}
                  style={{
                    border: `2px dashed ${drag ? '#b8916a' : '#d4c4b0'}`,
                    borderRadius: 16,
                    padding: '44px 20px',
                    textAlign: 'center',
                    cursor: isUploading ? 'default' : 'pointer',
                    background: drag ? 'rgba(184,145,106,0.07)' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.2s',
                    marginBottom: 20,
                  }}
                >
                  <svg
                    width="38"
                    height="34"
                    viewBox="0 0 38 34"
                    fill="none"
                    style={{ marginBottom: 12, opacity: 0.45 }}
                  >
                    <path
                      d="M14 4L11.5 8H4C2.34 8 1 9.34 1 11V29C1 30.66 2.34 32 4 32H34C35.66 32 37 30.66 37 29V11C37 9.34 35.66 8 34 8H26.5L24 4H14Z"
                      stroke="#b8916a"
                      strokeWidth="1.6"
                      fill="none"
                    />
                    <circle cx="19" cy="20" r="6" stroke="#b8916a" strokeWidth="1.6" fill="none" />
                  </svg>
                  <div style={{ fontSize: 15, color: '#7a6248', fontStyle: 'italic' }}>
                    {files.length
                      ? `Odabrano fotografija: ${files.length}`
                      : 'Povucite fotografije ovdje ili kliknite za odabir'}
                  </div>
                  <div style={{ fontSize: 12, color: '#a89070', marginTop: 6 }}>
                    JPG, PNG, HEIC · najviše {MAX} datoteka
                  </div>
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*,.heic,.heif"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </div>

                {files.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    {files.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 0',
                          borderBottom: '1px solid rgba(184,145,106,0.15)',
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          style={{ opacity: 0.4, flexShrink: 0 }}
                        >
                          <rect
                            x="1"
                            y="1"
                            width="12"
                            height="12"
                            rx="2"
                            stroke="#b8916a"
                            strokeWidth="1.2"
                          />
                          <circle cx="4.5" cy="4.5" r="1" fill="#b8916a" />
                          <path
                            d="M1 9.5L4 6.5L6.5 9L9.5 5.5L13 9.5"
                            stroke="#b8916a"
                            strokeWidth="1.1"
                          />
                        </svg>
                        <span
                          style={{
                            flex: 1,
                            fontSize: 13,
                            color: '#5a4535',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {f.name}
                        </span>
                        <span style={{ fontSize: 11, color: '#a89070' }}>
                          {(f.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                        {progress[i] !== undefined && (
                          <span
                            style={{
                              fontSize: 11,
                              color:
                                progress[i] === -1
                                  ? '#cc4400'
                                  : progress[i] === 100
                                    ? '#6aaa6a'
                                    : '#b8916a',
                              minWidth: 36,
                              textAlign: 'right',
                              fontFamily: 'monospace',
                            }}
                          >
                            {progress[i] === -1
                              ? 'greška'
                              : progress[i] === 100
                                ? '✓'
                                : `${progress[i]}%`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {files.length > 0 && !isUploading && (
                  <div
                    style={{
                      marginBottom: 24,
                      padding: 18,
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.45)',
                      border: '1px solid rgba(197, 160, 101, 0.2)',
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: 15,
                        color: '#5a4535',
                        marginBottom: 8,
                      }}
                    >
                      Poruka za domaćine
                    </label>

                    <div
                      style={{
                        fontSize: 12,
                        color: '#a89070',
                        marginBottom: 10,
                        fontStyle: 'italic',
                      }}
                    >
                      Opcionalno — možete ostaviti nekoliko riječi ♡
                    </div>

                    <textarea
                      value={message}
                      maxLength={300}
                      rows={4}
                      placeholder="Želimo vam sve najbolje..."
                      onChange={(e) => setMessage(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        padding: '13px 14px',
                        borderRadius: 12,
                        border: '1px solid #d4c4b0',
                        background: 'rgba(255,255,255,0.7)',
                        color: PALETTE.green,
                        fontSize: 15,
                        lineHeight: 1.5,
                        fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />

                    <div
                      style={{
                        textAlign: 'right',
                        marginTop: 5,
                        fontSize: 11,
                        color: '#a89070',
                      }}
                    >
                      {message.length}/300
                    </div>
                  </div>
                )}
                {Object.keys(progress).length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: '#8a7060',
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ letterSpacing: '0.05em' }}>Učitavanje…</span>
                      <span style={{ fontFamily: 'monospace' }}>{totalProgress}%</span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 99,
                        background: '#ede4d8',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 99,
                          background: 'linear-gradient(90deg, #c4a06a, #a07840)',
                          width: `${totalProgress}%`,
                          transition: 'width 0.15s ease',
                        }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={uploadAll}
                    disabled={!files.length || isUploading}
                    style={btnStyle('primary', !files.length || isUploading)}
                  >
                    {isUploading ? `Slanje… ${totalProgress}%` : 'Pošalji fotografije'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <svg
                  width="52"
                  height="52"
                  viewBox="0 0 52 52"
                  fill="none"
                  style={{ marginBottom: 16 }}
                >
                  <circle cx="26" cy="26" r="24" stroke="#b8916a" strokeWidth="1.4" opacity="0.4" />
                  <path
                    d="M15 26L22 33L37 18"
                    stroke="#b8916a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div style={{ fontSize: 28, fontStyle: 'italic', marginBottom: 10 }}>
                  Hvala vam!
                </div>
                <p
                  style={{
                    fontSize: 15,
                    color: '#7a6248',
                    lineHeight: 1.8,
                    marginBottom: 32,
                    fontStyle: 'italic',
                    maxWidth: 300,
                    margin: '0 auto 32px',
                  }}
                >
                  Vaše fotografije uspješno su dodane u galeriju.
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <button onClick={() => setView('gallery')} style={btnStyle('primary')}>
                    Otvori galeriju
                  </button>
                  <button
                    onClick={() => {
                      setFiles([]);
                      setProgress({});
                      setMessage('');
                      setDone(false);
                    }}
                    style={btnStyle('secondary')}
                  >
                    Dodaj još fotografija
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GALLERY ── */}
        {view === 'gallery' && (
          <div style={{ paddingTop: 40 }}>
            <button onClick={() => setView('home')} style={backBtn()}>
              ← Natrag
            </button>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 13,
                  letterSpacing: '0.3em',
                  color: '#b8916a',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Zajednički trenutci
              </div>
              <div style={{ fontSize: 36, fontStyle: 'italic' }}>Galerija</div>
              <div style={{ width: 40, height: 1, background: '#b8916a', margin: '14px auto' }} />
              <div style={{ fontSize: 13, color: '#8a7060' }}>
                {loadingGallery
                  ? 'Učitavanje…'
                  : `${photos.length} fotografija · kliknite za povećanje`}
              </div>
            </div>

            {loadingGallery ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 0',
                  color: '#b8916a',
                  fontSize: 14,
                  letterSpacing: '0.1em',
                }}
              >
                Učitavanje galerije…
              </div>
            ) : photos.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 0',
                  color: '#a89070',
                  fontSize: 15,
                  fontStyle: 'italic',
                }}
              >
                Još nema fotografija — budite prvi koji će ih dodati!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setLightbox(photo);
                      setView('lightbox');
                    }}
                    style={{
                      aspectRatio: '1',
                      overflow: 'hidden',
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={photo.url}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s',
                      }}
                      onMouseEnter={(e) => (e.target.style.transform = 'scale(1.06)')}
                      onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
              <button onClick={() => setView('upload')} style={btnStyle('primary')}>
                Dodaj svoje fotografije
              </button>
            </div>
          </div>
        )}

        {/* ── LIGHTBOX ── */}
        {view === 'lightbox' && lightbox && (
          <div
            onClick={() => setView('gallery')}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(26,16,8,0.93)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              cursor: 'pointer',
            }}
          >
            <button
              onClick={() => setView('gallery')}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.7)',
                borderRadius: 99,
                width: 40,
                height: 40,
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'inherit',
              }}
            >
              ✕
            </button>
            <img
              src={lightbox.url}
              alt=""
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: 12,
                boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <div
              style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: 11,
                marginTop: 14,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              {lightbox.key?.split('/').pop()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function btnStyle(type = 'primary', disabled = false) {
  const base = {
    width: 320,
    padding: '15px 28px',
    borderRadius: 99,
    fontSize: 14,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
  };
  if (type === 'primary')
    return {
      ...base,
      background: disabled ? PALETTE.greenDisabled : PALETTE.green,
      color: PALETTE.pearl,
      boxShadow: disabled ? 'none' : '0 4px 20px rgba(26, 67, 50, 0.2)',
    };
  return {
    ...base,
    background: 'transparent',
    color: PALETTE.gold,
    border: `1.5px solid ${PALETTE.gold}`,
  };
}

function backBtn() {
  return {
    background: 'none',
    border: 'none',
    color: PALETTE.green,
    fontSize: 13,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    padding: '0 0 24px',
    fontFamily: 'inherit',
  };
}
