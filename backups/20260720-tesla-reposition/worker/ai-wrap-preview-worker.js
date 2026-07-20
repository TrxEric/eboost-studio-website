const OPENAI_IMAGE_EDIT_URL = "https://api.openai.com/v1/images/edits";

function jsonResponse(body, status = 200, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] || "image/png";
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function buildPrompt(color) {
  return [
    "Create a realistic automotive vinyl wrap preview.",
    `Apply the wrap color ${color.nameEn} (${color.nameZh}), hex ${color.hex}.`,
    `Surface finish: ${color.finish}.`,
    "Only modify painted exterior body panels inside the provided mask.",
    "Preserve original lighting, shadows, reflections, panel lines, body shape, camera angle, wheels, glass, lights, grille, license plate, interior, and background.",
    "The result should look like a real high-end car wrap photograph, not a transparent color overlay.",
  ].join(" ");
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";

    if (request.method === "OPTIONS") {
      return jsonResponse({}, 200, allowedOrigin);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, allowedOrigin);
    }

    if (!env.OPENAI_API_KEY) {
      return jsonResponse({ error: "OPENAI_API_KEY is not configured" }, 500, allowedOrigin);
    }

    try {
      const payload = await request.json();
      const { originalImage, maskImage, color } = payload;

      if (!originalImage || !maskImage || !color?.hex) {
        return jsonResponse({ error: "Missing originalImage, maskImage, or color" }, 400, allowedOrigin);
      }

      const formData = new FormData();
      formData.append("model", "gpt-image-1");
      formData.append("prompt", buildPrompt(color));
      formData.append("size", "1024x1024");
      formData.append("image", dataUrlToBlob(originalImage), "vehicle.png");
      formData.append("mask", dataUrlToBlob(maskImage), "mask.png");

      const response = await fetch(OPENAI_IMAGE_EDIT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        return jsonResponse({ error: result.error?.message || "OpenAI image edit failed" }, response.status, allowedOrigin);
      }

      const imageBase64 = result.data?.[0]?.b64_json;
      if (!imageBase64) {
        return jsonResponse({ error: "No image returned by image model" }, 502, allowedOrigin);
      }

      return jsonResponse({ imageBase64 }, 200, allowedOrigin);
    } catch (error) {
      return jsonResponse({ error: error.message || "Unexpected worker error" }, 500, allowedOrigin);
    }
  },
};
