import express from "express";
import fetch from "node-fetch";

const app = express();

app.get("/api/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing ?url parameter");

  try {
    const response = await fetch(url);
    let contentType = response.headers.get("content-type") || "";
    let body = await response.text();

    // Only rewrite HTML pages
    if (contentType.includes("text/html")) {
      const baseUrl = new URL(url).origin;

      // Rewrite relative src/href URLs to absolute
      body = body.replace(/(src|href)=["'](\/[^"'>]+)["']/g, (match, attr, path) => {
        return `${attr}="${baseUrl}${path}"`;
      });

      // Rewrite all internal links (<a>) to go through proxy
      body = body.replace(/<a\s+([^>]*?)href=["'](\/[^"']*)["']/g, (match, attrs, href) => {
        const proxyUrl = `/api/proxy?url=${baseUrl}${href}`;
        return `<a ${attrs} href="${proxyUrl}"`;
      });

      // Rewrite all form actions to go through proxy
      body = body.replace(/<form\s+([^>]*?)action=["'](\/[^"']*)["']/g, (match, attrs, action) => {
        const proxyUrl = `/api/proxy?url=${baseUrl}${action}`;
        return `<form ${attrs} action="${proxyUrl}"`;
      });

      // Set proper headers
      res.setHeader("Content-Type", "text/html; charset=utf-8");
    } else {
      // CSS, JS, images, etc. served as-is
      res.setHeader("Content-Type", contentType);
    }

    // Allow iframe embedding anywhere
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");

    res.send(body);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).send("Error fetching the page.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
