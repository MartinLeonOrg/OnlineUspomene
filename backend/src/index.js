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

      // POST /events/:slug/photos
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

  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

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

  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

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

  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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
