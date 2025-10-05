import express from "express";
import fetch from "node-fetch";

const app = express();

app.get("/api/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing ?url parameter" });

  try {
    const response = await fetch(url);
    let html = await response.text();

    // Extract the origin (e.g. https://2stepverification.page.gd)
    const baseUrl = new URL(url).origin;

    // Fix relative asset links to full URLs
    html = html.replace(/(src|href)=["'](\/[^"']*)["']/g, (match, attr, path) => {
      return `${attr}="${baseUrl}${path}"`;
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(html);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
