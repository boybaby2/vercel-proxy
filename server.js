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

    // Force correct content type for HTML
    if (contentType.includes("text/html")) {
      const baseUrl = new URL(url).origin;

      // Convert relative links to absolute
      body = body.replace(/(src|href)=["'](\/[^"'>]+)["']/g, (match, attr, path) => {
        return `${attr}="${baseUrl}${path}"`;
      });

      // Ensure everything from that domain loads
      res.setHeader("Content-Type", "text/html; charset=utf-8");
    } else {
      // For CSS, JS, or images, send as-is
      res.setHeader("Content-Type", contentType);
    }

    // Allow iframe embedding everywhere
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
