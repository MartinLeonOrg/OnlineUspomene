import { AwsClient } from "aws4fetch";

const BUCKET_NAME = "wedding-photos";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://onlineuspomene.netlify.app",
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: getCorsHeaders(request),
      });
    }

    try {
      // -----------------------------------------------------------------
      // ADMIN API — everything under /admin/* requires X-Admin-Key
      // -----------------------------------------------------------------
      if (url.pathname.startsWith("/admin/")) {
        if (!isAuthorizedAdmin(request, env)) {
          return jsonResponse(request, { error: "Neautoriziran pristup." }, 401);
        }

        const adminEventActivateMatch = url.pathname.match(
          /^\/admin\/events\/([^/]+)\/activate$/,
        );
        const adminEventDeactivateMatch = url.pathname.match(
          /^\/admin\/events\/([^/]+)\/deactivate$/,
        );
        const adminEventRegenSlugMatch = url.pathname.match(
          /^\/admin\/events\/([^/]+)\/regenerate-slug$/,
        );
        const adminEventQrHistoryMatch = url.pathname.match(
          /^\/admin\/events\/([^/]+)\/qr-history$/,
        );
        const adminEventPhotosMatch = url.pathname.match(
          /^\/admin\/events\/([^/]+)\/photos$/,
        );
        const adminEventGuestsMatch = url.pathname.match(
          /^\/admin\/events\/([^/]+)\/guests$/,
        );
        const adminPhotoApproveMatch = url.pathname.match(
          /^\/admin\/photos\/([^/]+)\/approve$/,
        );
        const adminPhotoRejectMatch = url.pathname.match(
          /^\/admin\/photos\/([^/]+)\/reject$/,
        );
        const adminPhotoMatch = url.pathname.match(/^\/admin\/photos\/([^/]+)$/);
        const adminPhotosListMatch = url.pathname === "/admin/photos";
        const adminGuestMatch = url.pathname.match(/^\/admin\/guests\/([^/]+)$/);
        // NOTE: this generic match must be checked AFTER all the more specific
        // /admin/events/:id/... patterns above, or it would swallow them.
        const adminEventMatch = url.pathname.match(/^\/admin\/events\/([^/]+)$/);

        if (url.pathname === "/admin/dashboard" && request.method === "GET") {
          return await adminGetDashboard(request, env);
        }

        if (url.pathname === "/admin/events" && request.method === "GET") {
          return await adminListEvents(request, env);
        }

        if (url.pathname === "/admin/events" && request.method === "POST") {
          return await adminCreateEvent(request, env);
        }

        if (adminEventActivateMatch && request.method === "POST") {
          return await adminSetEventActive(
            request,
            env,
            adminEventActivateMatch[1],
            true,
          );
        }

        if (adminEventDeactivateMatch && request.method === "POST") {
          return await adminSetEventActive(
            request,
            env,
            adminEventDeactivateMatch[1],
            false,
          );
        }

        if (adminEventRegenSlugMatch && request.method === "POST") {
          return await adminRegenerateSlug(request, env, adminEventRegenSlugMatch[1]);
        }

        if (adminEventQrHistoryMatch && request.method === "GET") {
          return await adminGetQrHistory(request, env, adminEventQrHistoryMatch[1]);
        }

        if (adminEventPhotosMatch && request.method === "GET") {
          return await adminGetEventPhotos(request, env, adminEventPhotosMatch[1]);
        }

        // GET /admin/photos?status=pending|approved|rejected  (omit status for all)
        // Cross-event moderation queue — without this the admin has no way to
        // see "everything waiting for review" without opening every event.
        if (adminPhotosListMatch && request.method === "GET") {
          return await adminListPhotos(request, env, url);
        }

        if (adminEventGuestsMatch && request.method === "GET") {
          return await adminListGuests(request, env, adminEventGuestsMatch[1]);
        }

        if (adminEventGuestsMatch && request.method === "POST") {
          return await adminCreateGuest(request, env, adminEventGuestsMatch[1]);
        }

        if (adminPhotoApproveMatch && request.method === "POST") {
          return await adminSetPhotoStatus(
            request,
            env,
            adminPhotoApproveMatch[1],
            "approved",
          );
        }

        if (adminPhotoRejectMatch && request.method === "POST") {
          return await adminSetPhotoStatus(
            request,
            env,
            adminPhotoRejectMatch[1],
            "rejected",
          );
        }

        if (adminPhotoMatch && request.method === "DELETE") {
          return await adminDeletePhoto(request, env, adminPhotoMatch[1]);
        }

        if (adminGuestMatch && request.method === "POST") {
          return await adminUpdateGuest(request, env, adminGuestMatch[1]);
        }

        if (adminGuestMatch && request.method === "DELETE") {
          return await adminDeleteGuest(request, env, adminGuestMatch[1]);
        }

        if (adminEventMatch && request.method === "POST") {
          return await adminUpdateEvent(request, env, adminEventMatch[1]);
        }

        if (adminEventMatch && request.method === "DELETE") {
          return await adminDeleteEvent(request, env, adminEventMatch[1]);
        }

        return jsonResponse(request, { error: "Ruta nije pronađena." }, 404);
      }

      // -----------------------------------------------------------------
      // PUBLIC / GUEST API — unchanged routes
      // -----------------------------------------------------------------
      const eventMatch = url.pathname.match(/^\/events\/([^/]+)$/);

      const presignMatch = url.pathname.match(/^\/events\/([^/]+)\/presign$/);

      const photosMatch = url.pathname.match(/^\/events\/([^/]+)\/photos$/);

      // GET /events/:slug
      if (request.method === "GET" && eventMatch) {
        const slug = decodeURIComponent(eventMatch[1]);

        return await getEvent(request, env, slug);
      }

      // POST /events/:slug/presign
      if (request.method === "POST" && presignMatch) {
        const slug = decodeURIComponent(presignMatch[1]);

        return await presignEventUpload(request, env, slug);
      }

      if (request.method === "GET" && photosMatch) {
        const slug = decodeURIComponent(photosMatch[1]);

        return await getEventPhotos(request, env, slug);
      }

      if (request.method === "POST" && photosMatch) {
        const slug = decodeURIComponent(photosMatch[1]);

        return await createPhoto(request, env, slug);
      }

      // STARI API - privremeno ostavljamo zbog postojećeg frontenda
      if (request.method === "POST" && url.pathname === "/presign") {
        return await presignUpload(request, env);
      }

      if (request.method === "GET" && url.pathname === "/photos") {
        return await getPhotos(request, env);
      }

      return jsonResponse(
        request,
        {
          error: "Ruta nije pronađena.",
        },
        404,
      );
    } catch (error) {
      console.error(error);

      return jsonResponse(
        request,
        {
          error: "Dogodila se greška na poslužitelju.",
        },
        500,
      );
    }
  },
};

// =============================================================================
// GUEST-FACING HANDLERS (unchanged except getEventPhotos, noted below)
// =============================================================================

async function presignEventUpload(request, env, slug) {
  const event = await env.online_uspomene_db
    .prepare(
      `
      SELECT id, slug, is_active
      FROM events
      WHERE slug = ?
      LIMIT 1
    `,
    )
    .bind(slug)
    .first();

  if (!event) {
    return jsonResponse(request, { error: "Događaj nije pronađen." }, 404);
  }

  if (event.is_active !== 1) {
    return jsonResponse(
      request,
      { error: "Događaj trenutno nije aktivan." },
      403,
    );
  }

  const body = await request.json();

  const filename = body.filename;
  const contentType = body.contentType;

  if (!filename || !contentType) {
    return jsonResponse(
      request,
      {
        error: "Nedostaje naziv datoteke ili tip sadržaja.",
      },
      400,
    );
  }

  if (!contentType.startsWith("image/")) {
    return jsonResponse(request, { error: "Dozvoljene su samo slike." }, 400);
  }

  const extension = getExtension(filename);

  const key = `events/${event.id}/photos/${crypto.randomUUID()}${extension}`;

  const endpoint = `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const client = getR2Client(env);

  const objectUrl = `${endpoint}/${BUCKET_NAME}/${key}`;

  const signedRequest = await client.sign(objectUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    aws: {
      signQuery: true,
    },
  });

  return jsonResponse(request, {
    uploadUrl: signedRequest.url,
    key,
  });
}

async function getEventPhotos(request, env, slug) {
  const event = await env.online_uspomene_db
    .prepare(
      `
      SELECT id, is_active
      FROM events
      WHERE slug = ?
      LIMIT 1
    `,
    )
    .bind(slug)
    .first();

  if (!event) {
    return jsonResponse(request, { error: "Događaj nije pronađen." }, 404);
  }

  // Photos are visible to guests immediately after upload — no admin
  // approval required. `status` still exists on each row (admin can flag
  // pending/approved/rejected for their own bookkeeping via /admin/photos),
  // but it no longer gates what shows up here.
  const result = await env.online_uspomene_db
    .prepare(
      `
      SELECT
        id,
        r2_key,
        original_name,
        content_type,
        file_size,
        guest_name,
        message,
        status,
        created_at
      FROM photos
      WHERE event_id = ?
      ORDER BY created_at DESC
    `,
    )
    .bind(event.id)
    .all();

  const photos = result.results.map((photo) => ({
    id: photo.id,
    key: photo.r2_key,
    url: `${env.BUCKET_PUBLIC_URL}/${photo.r2_key}`,
    originalName: photo.original_name,
    contentType: photo.content_type,
    fileSize: photo.file_size,
    guestName: photo.guest_name,
    message: photo.message,
    status: photo.status,
    uploaded: photo.created_at,
  }));

  return jsonResponse(request, photos);
}

async function createPhoto(request, env, slug) {
  const event = await env.online_uspomene_db
    .prepare(
      `
      SELECT id, is_active
      FROM events
      WHERE slug = ?
      LIMIT 1
    `,
    )
    .bind(slug)
    .first();

  if (!event) {
    return jsonResponse(request, { error: "Događaj nije pronađen." }, 404);
  }

  if (event.is_active !== 1) {
    return jsonResponse(
      request,
      { error: "Događaj trenutno nije aktivan." },
      403,
    );
  }

  const body = await request.json();

  const { key, originalName, contentType, fileSize, guestName, message } = body;

  if (!key || !contentType) {
    return jsonResponse(
      request,
      { error: "Nedostaju podaci o fotografiji." },
      400,
    );
  }

  const expectedPrefix = `events/${event.id}/photos/`;

  if (!key.startsWith(expectedPrefix)) {
    return jsonResponse(
      request,
      { error: "Neispravna putanja fotografije." },
      400,
    );
  }

  const result = await env.online_uspomene_db
    .prepare(
      `
      INSERT INTO photos (
        event_id,
        r2_key,
        original_name,
        content_type,
        file_size,
        guest_name,
        message
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      event.id,
      key,
      originalName ?? null,
      contentType,
      fileSize ?? null,
      guestName ?? null,
      message ?? null,
    )
    .run();

  return jsonResponse(
    request,
    {
      id: result.meta.last_row_id,
      key,
      status: "pending",
    },
    201,
  );
}

async function getEvent(request, env, slug) {
  if (!slug) {
    return jsonResponse(request, { error: "Nedostaje oznaka događaja." }, 400);
  }

  const event = await env.online_uspomene_db
    .prepare(
      `
      SELECT
        id,
        slug,
        name,
        event_date,
        is_active
      FROM events
      WHERE slug = ?
      LIMIT 1
    `,
    )
    .bind(slug)
    .first();

  if (!event) {
    return jsonResponse(request, { error: "Događaj nije pronađen." }, 404);
  }

  return jsonResponse(request, {
    id: event.id,
    slug: event.slug,
    name: event.name,
    eventDate: event.event_date,
    active: event.is_active === 1,
  });
}

async function presignUpload(request, env) {
  const body = await request.json();

  const filename = body.filename;
  const contentType = body.contentType;

  if (!filename || !contentType) {
    return jsonResponse(
      request,
      {
        error: "Nedostaje naziv datoteke ili tip sadržaja.",
      },
      400,
    );
  }

  if (!contentType.startsWith("image/")) {
    return jsonResponse(
      request,
      {
        error: "Dozvoljene su samo slike.",
      },
      400,
    );
  }

  const extension = getExtension(filename);

  const key = `photos/${crypto.randomUUID()}${extension}`;

  const endpoint = `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const client = getR2Client(env);

  const objectUrl = `${endpoint}/${BUCKET_NAME}/${key}`;

  const signedRequest = await client.sign(objectUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    aws: {
      signQuery: true,
    },
  });

  return jsonResponse(request, {
    uploadUrl: signedRequest.url,
    key,
  });
}

async function getPhotos(request, env) {
  const endpoint = `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const client = getR2Client(env);

  const listUrl = `${endpoint}/${BUCKET_NAME}?list-type=2&prefix=photos/`;

  const response = await client.fetch(listUrl);

  if (!response.ok) {
    throw new Error(`R2 list error: ${response.status}`);
  }

  const xml = await response.text();

  const objects = parseObjects(xml);

  const photos = objects.map((object) => ({
    key: object.key,
    url: `${env.BUCKET_PUBLIC_URL}/${object.key}`,
    uploaded: object.uploaded,
  }));

  photos.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

  return jsonResponse(request, photos);
}

// =============================================================================
// ADMIN HANDLERS (new) — all require X-Admin-Key, checked in fetch() above
// =============================================================================

async function adminGetDashboard(request, env) {
  const [totalEventsRow, activeEventsRow, photoCounts] = await Promise.all([
    env.online_uspomene_db.prepare(`SELECT COUNT(*) AS n FROM events`).first(),
    env.online_uspomene_db
      .prepare(`SELECT COUNT(*) AS n FROM events WHERE is_active = 1`)
      .first(),
    env.online_uspomene_db
      .prepare(
        `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
        FROM photos
      `,
      )
      .first(),
  ]);

  const recentPhotosResult = await env.online_uspomene_db
    .prepare(
      `
      SELECT p.id, p.r2_key, p.guest_name, p.status, p.created_at,
             e.name AS event_name, e.slug AS event_slug
      FROM photos p
      JOIN events e ON e.id = p.event_id
      ORDER BY p.created_at DESC
      LIMIT 8
    `,
    )
    .all();

  // R2 (S3-compatible API) has no single "bucket size" endpoint, so this
  // sums every object's size via paginated ListObjectsV2. Fine at MVP scale;
  // if the bucket gets large, move this behind a cron trigger that caches
  // the total instead of recomputing it on every dashboard load.
  let usedBytes = 0;
  try {
    usedBytes = await listAllObjectSizes(env);
  } catch (err) {
    console.error("R2 usage calculation failed:", err);
  }

  const recentPhotos = recentPhotosResult.results.map((p) => ({
    id: p.id,
    guest: p.guest_name || "Gost",
    event: p.event_name,
    eventSlug: p.event_slug,
    status: p.status,
    time: p.created_at,
    url: `${env.BUCKET_PUBLIC_URL}/${p.r2_key}`,
  }));

  return jsonResponse(request, {
    stats: {
      totalEvents: totalEventsRow.n,
      activeEvents: activeEventsRow.n,
      totalPhotos: photoCounts.total || 0,
      pendingPhotos: photoCounts.pending || 0,
      approvedPhotos: photoCounts.approved || 0,
      rejectedPhotos: photoCounts.rejected || 0,
      storage: {
        usedGB: usedBytes / 1024 ** 3,
        totalGB: 100, // adjust to your actual R2 plan/quota
      },
    },
    recentPhotos,
  });
}

async function adminListEvents(request, env) {
  const result = await env.online_uspomene_db
    .prepare(
      `
      SELECT
        e.*,
        (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id) AS total_photos,
        (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id AND p.status = 'pending') AS pending_photos,
        (SELECT COUNT(*) FROM guests g WHERE g.event_id = e.id) AS guest_count
      FROM events e
      ORDER BY e.created_at DESC
    `,
    )
    .all();

  return jsonResponse(request, result.results.map(mapEventRow));
}

async function adminCreateEvent(request, env) {
  const body = await request.json().catch(() => null);

  if (!body || !body.name) {
    return jsonResponse(request, { error: "Nedostaje naziv događaja." }, 400);
  }

  const slug = body.slug ? slugify(body.slug) : generateSlug();

  const existing = await env.online_uspomene_db
    .prepare(`SELECT id FROM events WHERE slug = ?`)
    .bind(slug)
    .first();

  if (existing) {
    return jsonResponse(request, { error: "Slug je već zauzet." }, 409);
  }

  const result = await env.online_uspomene_db
    .prepare(
      `INSERT INTO events (slug, name, event_date, is_active) VALUES (?, ?, ?, ?)`,
    )
    .bind(slug, body.name, body.eventDate || null, body.isActive === false ? 0 : 1)
    .run();

  const row = await env.online_uspomene_db
    .prepare(`SELECT * FROM events WHERE id = ?`)
    .bind(result.meta.last_row_id)
    .first();

  return jsonResponse(
    request,
    mapEventRow({ ...row, total_photos: 0, pending_photos: 0, guest_count: 0 }),
    201,
  );
}

async function adminUpdateEvent(request, env, id) {
  const body = await request.json().catch(() => ({}));
  const fields = [];
  const values = [];

  if (body.name !== undefined) {
    fields.push("name = ?");
    values.push(body.name);
  }
  if (body.eventDate !== undefined) {
    fields.push("event_date = ?");
    values.push(body.eventDate);
  }

  if (fields.length === 0) {
    return jsonResponse(request, { error: "Nema polja za ažuriranje." }, 400);
  }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const result = await env.online_uspomene_db
    .prepare(`UPDATE events SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  if (result.meta.changes === 0) {
    return jsonResponse(request, { error: "Događaj nije pronađen." }, 404);
  }

  const row = await env.online_uspomene_db
    .prepare(
      `
      SELECT e.*,
        (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id) AS total_photos,
        (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id AND p.status = 'pending') AS pending_photos,
        (SELECT COUNT(*) FROM guests g WHERE g.event_id = e.id) AS guest_count
      FROM events e WHERE e.id = ?
    `,
    )
    .bind(id)
    .first();

  return jsonResponse(request, mapEventRow(row));
}

async function adminSetEventActive(request, env, id, isActive) {
  const result = await env.online_uspomene_db
    .prepare(
      `UPDATE events SET is_active = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(isActive ? 1 : 0, id)
    .run();

  if (result.meta.changes === 0) {
    return jsonResponse(request, { error: "Događaj nije pronađen." }, 404);
  }

  return jsonResponse(request, { id, isActive });
}

// Rotates the slug (= the QR code target). The old slug is logged in
// qr_code_history so the admin can see what was invalidated and when.
async function adminRegenerateSlug(request, env, id) {
  const event = await env.online_uspomene_db
    .prepare(`SELECT slug FROM events WHERE id = ?`)
    .bind(id)
    .first();

  if (!event) {
    return jsonResponse(request, { error: "Događaj nije pronađen." }, 404);
  }

  const newSlug = generateSlug();

  await env.online_uspomene_db.batch([
    env.online_uspomene_db
      .prepare(`INSERT INTO qr_code_history (event_id, old_slug) VALUES (?, ?)`)
      .bind(id, event.slug),
    env.online_uspomene_db
      .prepare(
        `UPDATE events SET slug = ?, is_active = 1, updated_at = datetime('now') WHERE id = ?`,
      )
      .bind(newSlug, id),
  ]);

  return jsonResponse(request, { id, slug: newSlug, isActive: true });
}

async function adminGetQrHistory(request, env, id) {
  const result = await env.online_uspomene_db
    .prepare(
      `SELECT old_slug, replaced_at FROM qr_code_history WHERE event_id = ? ORDER BY replaced_at DESC`,
    )
    .bind(id)
    .all();

  return jsonResponse(request, result.results);
}

async function adminDeleteEvent(request, env, id) {
  const photosResult = await env.online_uspomene_db
    .prepare(`SELECT r2_key FROM photos WHERE event_id = ?`)
    .bind(id)
    .all();

  const client = getR2Client(env);

  for (const row of photosResult.results) {
    await deleteR2Object(client, env, row.r2_key);
  }

  const result = await env.online_uspomene_db
    .prepare(`DELETE FROM events WHERE id = ?`)
    .bind(id)
    .run();

  if (result.meta.changes === 0) {
    return jsonResponse(request, { error: "Događaj nije pronađen." }, 404);
  }

  return jsonResponse(request, { ok: true });
}

// Unlike the public /events/:slug/photos route, this returns ALL statuses
// (pending/approved/rejected) so the admin has something to moderate.
async function adminGetEventPhotos(request, env, id) {
  const result = await env.online_uspomene_db
    .prepare(
      `
      SELECT id, r2_key, original_name, content_type, file_size, guest_name, message, status, created_at
      FROM photos WHERE event_id = ? ORDER BY created_at DESC
    `,
    )
    .bind(id)
    .all();

  const photos = result.results.map((p) => ({
    id: p.id,
    key: p.r2_key,
    url: `${env.BUCKET_PUBLIC_URL}/${p.r2_key}`,
    originalName: p.original_name,
    contentType: p.content_type,
    fileSize: p.file_size,
    guestName: p.guest_name,
    message: p.message,
    status: p.status,
    uploaded: p.created_at,
  }));

  return jsonResponse(request, photos);
}

async function adminListPhotos(request, env, url) {
  const status = url.searchParams.get("status");
  const validStatuses = ["pending", "approved", "rejected"];

  let query = `
    SELECT p.id, p.r2_key, p.original_name, p.content_type, p.file_size,
           p.guest_name, p.message, p.status, p.created_at,
           e.id AS event_id, e.name AS event_name, e.slug AS event_slug
    FROM photos p
    JOIN events e ON e.id = p.event_id
  `;

  const bindings = [];
  if (status && validStatuses.includes(status)) {
    query += ` WHERE p.status = ?`;
    bindings.push(status);
  }
  query += ` ORDER BY p.created_at DESC`;

  const stmt = env.online_uspomene_db.prepare(query);
  const result = bindings.length ? await stmt.bind(...bindings).all() : await stmt.all();

  const photos = result.results.map((p) => ({
    id: p.id,
    key: p.r2_key,
    url: `${env.BUCKET_PUBLIC_URL}/${p.r2_key}`,
    originalName: p.original_name,
    contentType: p.content_type,
    fileSize: p.file_size,
    guestName: p.guest_name,
    message: p.message,
    status: p.status,
    uploaded: p.created_at,
    eventId: p.event_id,
    eventName: p.event_name,
    eventSlug: p.event_slug,
  }));

  return jsonResponse(request, photos);
}

async function adminSetPhotoStatus(request, env, id, status) {
  const result = await env.online_uspomene_db
    .prepare(`UPDATE photos SET status = ? WHERE id = ?`)
    .bind(status, id)
    .run();

  if (result.meta.changes === 0) {
    return jsonResponse(request, { error: "Fotografija nije pronađena." }, 404);
  }

  return jsonResponse(request, { id, status });
}

async function adminDeletePhoto(request, env, id) {
  const photo = await env.online_uspomene_db
    .prepare(`SELECT r2_key FROM photos WHERE id = ?`)
    .bind(id)
    .first();

  if (!photo) {
    return jsonResponse(request, { error: "Fotografija nije pronađena." }, 404);
  }

  const client = getR2Client(env);
  await deleteR2Object(client, env, photo.r2_key);

  await env.online_uspomene_db.prepare(`DELETE FROM photos WHERE id = ?`).bind(id).run();

  return jsonResponse(request, { ok: true });
}

async function adminListGuests(request, env, eventId) {
  const result = await env.online_uspomene_db
    .prepare(`SELECT * FROM guests WHERE event_id = ? ORDER BY name ASC`)
    .bind(eventId)
    .all();

  return jsonResponse(request, result.results.map(mapGuestRow));
}

async function adminCreateGuest(request, env, eventId) {
  const body = await request.json().catch(() => null);

  if (!body || !body.name) {
    return jsonResponse(request, { error: "Nedostaje ime gosta." }, 400);
  }

  const event = await env.online_uspomene_db
    .prepare(`SELECT id FROM events WHERE id = ?`)
    .bind(eventId)
    .first();

  if (!event) {
    return jsonResponse(request, { error: "Događaj nije pronađen." }, 404);
  }

  const result = await env.online_uspomene_db
    .prepare(
      `
      INSERT INTO guests (event_id, name, email, phone, invited, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    )
    .bind(
      eventId,
      body.name,
      body.email || null,
      body.phone || null,
      body.invited === false ? 0 : 1,
      body.notes || null,
    )
    .run();

  const row = await env.online_uspomene_db
    .prepare(`SELECT * FROM guests WHERE id = ?`)
    .bind(result.meta.last_row_id)
    .first();

  return jsonResponse(request, mapGuestRow(row), 201);
}

async function adminUpdateGuest(request, env, id) {
  const body = await request.json().catch(() => ({}));
  const fields = [];
  const values = [];

  for (const key of ["name", "email", "phone", "notes"]) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (body.invited !== undefined) {
    fields.push("invited = ?");
    values.push(body.invited ? 1 : 0);
  }

  if (fields.length === 0) {
    return jsonResponse(request, { error: "Nema polja za ažuriranje." }, 400);
  }

  values.push(id);

  const result = await env.online_uspomene_db
    .prepare(`UPDATE guests SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  if (result.meta.changes === 0) {
    return jsonResponse(request, { error: "Gost nije pronađen." }, 404);
  }

  const row = await env.online_uspomene_db
    .prepare(`SELECT * FROM guests WHERE id = ?`)
    .bind(id)
    .first();

  return jsonResponse(request, mapGuestRow(row));
}

async function adminDeleteGuest(request, env, id) {
  const result = await env.online_uspomene_db
    .prepare(`DELETE FROM guests WHERE id = ?`)
    .bind(id)
    .run();

  if (result.meta.changes === 0) {
    return jsonResponse(request, { error: "Gost nije pronađen." }, 404);
  }

  return jsonResponse(request, { ok: true });
}

// =============================================================================
// SHARED HELPERS
// =============================================================================

function isAuthorizedAdmin(request, env) {
  const key = request.headers.get("X-Admin-Key");
  return Boolean(env.ADMIN_API_KEY) && key === env.ADMIN_API_KEY;
}

function mapEventRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    eventDate: row.event_date,
    isActive: row.is_active === 1,
    totalPhotos: row.total_photos ?? 0,
    pendingPhotos: row.pending_photos ?? 0,
    guestCount: row.guest_count ?? 0,
    createdAt: row.created_at,
  };
}

function mapGuestRow(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    invited: row.invited === 1,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function generateSlug() {
  return crypto.randomUUID().replace(/-/g, ""); 
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getR2Client(env) {
  return new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
}

async function deleteR2Object(client, env, key) {
  const endpoint = `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const objectUrl = `${endpoint}/${BUCKET_NAME}/${key}`;

  const response = await client.fetch(objectUrl, { method: "DELETE" });

  if (!response.ok && response.status !== 404) {
    throw new Error(`R2 delete error: ${response.status}`);
  }
}

async function listAllObjectSizes(env) {
  const client = getR2Client(env);
  const endpoint = `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com`;

  let totalBytes = 0;
  let continuationToken;

  do {
    let listUrl = `${endpoint}/${BUCKET_NAME}?list-type=2`;
    if (continuationToken) {
      listUrl += `&continuation-token=${encodeURIComponent(continuationToken)}`;
    }

    const response = await client.fetch(listUrl);
    if (!response.ok) {
      throw new Error(`R2 list error: ${response.status}`);
    }

    const xml = await response.text();
    const { objects, isTruncated, nextToken } = parseListingWithSize(xml);

    for (const obj of objects) totalBytes += obj.size;
    continuationToken = isTruncated ? nextToken : null;
  } while (continuationToken);

  return totalBytes;
}

function parseListingWithSize(xml) {
  const objects = [];
  const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;

  let match;
  while ((match = contentRegex.exec(xml)) !== null) {
    const block = match[1];
    const key = getXmlValue(block, "Key");
    const sizeStr = getXmlValue(block, "Size");

    if (key) {
      objects.push({ key, size: sizeStr ? parseInt(sizeStr, 10) : 0 });
    }
  }

  const isTruncated = getXmlValue(xml, "IsTruncated") === "true";
  const nextToken = getXmlValue(xml, "NextContinuationToken");

  return { objects, isTruncated, nextToken };
}

function parseObjects(xml) {
  const objects = [];

  const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;

  let match;

  while ((match = contentRegex.exec(xml)) !== null) {
    const block = match[1];

    const key = getXmlValue(block, "Key");
    const uploaded = getXmlValue(block, "LastModified");

    if (key) {
      objects.push({
        key,
        uploaded,
      });
    }
  }

  return objects;
}

function getXmlValue(xml, tag) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);

  const match = xml.match(regex);

  return match ? decodeXml(match[1]) : null;
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function getExtension(filename) {
  const index = filename.lastIndexOf(".");

  if (index === -1) {
    return "";
  }

  return filename.slice(index).toLowerCase();
}

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin");

  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
    Vary: "Origin",
  };
}

function jsonResponse(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(request),
    },
  });
}