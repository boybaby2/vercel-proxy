import express from "express";
import fetch from "node-fetch";
const app = express();

app.get("/api/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing ?url parameter");

  try {
    console.log("Fetching URL:", url);
    const response = await fetch(url);
    console.log("Response status:", response.status);
    let contentType = response.headers.get("content-type") || "";
    let body = await response.text();

    const baseUrl = new URL(url).origin;
    console.log("Base URL:", baseUrl);

    // Rewrite HTML, CSS, and JS
    if (contentType.includes("text/html")) {
      // Rewrite src/href/action attributes
      body = body.replace(/(src|href|action)=["']([^:"]*[^"'>])["']/g, (match, attr, path) => {
        if (path.startsWith('http')) return match; // Skip absolute URLs
        const absolutePath = new URL(path, baseUrl).href;
        return `${attr}="${proxyBase + encodeURIComponent(absolutePath)}"`;
      });

      // Inject script to handle dynamic content
      body = body.replace(/<\/body>/i, `
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            const baseUrl = '${baseUrl}';
            const proxyBase = '${proxyBase}';
            // Override fetch to proxy relative URLs
            const originalFetch = window.fetch;
            window.fetch = async (input, init) => {
              if (typeof input === 'string' && !input.startsWith('http')) {
                input = proxyBase + encodeURIComponent(new URL(input, baseUrl).href);
              }
              return await originalFetch(input, init);
            };
          });
        </script>
        </body>
      `);

      res.setHeader("Content-Type", "text/html; charset=utf-8");
    }
    // Rewrite CSS/JS files
    else if (contentType.includes("text/css") || contentType.includes("application/javascript")) {
      body = body.replace(/url\((['"]?)([^'"\)]+)\1\)/g, (match, quote, path) => {
        if (path.startsWith('http')) return match;
        const absolutePath = new URL(path, baseUrl).href;
        return `url(${quote}${proxyBase + encodeURIComponent(absolutePath)}${quote})`;
      });
      res.setHeader("Content-Type", contentType);
    }
    // Serve other content as-is
    else {
      res.setHeader("Content-Type", contentType);
    }

    // Allow embedding and CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.send(body);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).send(`Error fetching the page: ${error.message}`);
  }
});

const proxyBase = "https://vercel-proxy-nnuf.onrender.com/api/proxy?url=";
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
    
