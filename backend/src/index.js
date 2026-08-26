import { AwsClient } from "aws4fetch";

const BUCKET_NAME = "wedding-photos";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
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
      if (
        request.method === "POST" &&
        url.pathname === "/presign"
      ) {
        return await presignUpload(request, env);
      }

      if (
        request.method === "GET" &&
        url.pathname === "/photos"
      ) {
        return await getPhotos(request, env);
      }

      return jsonResponse(
        request,
        {
          error: "Ruta nije pronađena.",
        },
        404
      );
    } catch (error) {
      console.error(error);

      return jsonResponse(
        request,
        {
          error: "Dogodila se greška na poslužitelju.",
        },
        500
      );
    }
  },
};

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
      400
    );
  }

  if (!contentType.startsWith("image/")) {
    return jsonResponse(
      request,
      {
        error: "Dozvoljene su samo slike.",
      },
      400
    );
  }

  const extension = getExtension(filename);

  const key = `photos/${crypto.randomUUID()}${extension}`;

  const endpoint =
    `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const objectUrl =
    `${endpoint}/${BUCKET_NAME}/${key}`;

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
  const endpoint =
    `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com`;

  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const listUrl =
    `${endpoint}/${BUCKET_NAME}?list-type=2&prefix=photos/`;

  const response = await client.fetch(listUrl);

  if (!response.ok) {
    throw new Error(
      `R2 list error: ${response.status}`
    );
  }

  const xml = await response.text();

  const objects = parseObjects(xml);

  const photos = objects.map((object) => ({
    key: object.key,
    url: `${env.BUCKET_PUBLIC_URL}/${object.key}`,
    uploaded: object.uploaded,
  }));

  photos.sort(
    (a, b) =>
      new Date(b.uploaded) -
      new Date(a.uploaded)
  );

  return jsonResponse(request, photos);
}

function parseObjects(xml) {
  const objects = [];

  const contentRegex =
    /<Contents>([\s\S]*?)<\/Contents>/g;

  let match;

  while ((match = contentRegex.exec(xml)) !== null) {
    const block = match[1];

    const key = getXmlValue(block, "Key");
    const uploaded =
      getXmlValue(block, "LastModified");

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
  const regex = new RegExp(
    `<${tag}>([\\s\\S]*?)<\\/${tag}>`
  );

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

  return filename
    .slice(index)
    .toLowerCase();
}

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin");

  const allowedOrigin =
    ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function jsonResponse(request, data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(request),
      },
    }
  );
}