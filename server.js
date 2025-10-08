const express = require("express");
const fetch = require("node-fetch");
const axios = require("axios");

const app = express();

// Your existing proxy endpoint for general URLs
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
      body = body.replace(/(src|href|action)=["']([^:"]*[^"'>])["']/g, (match, attr, path) => {
        if (path.startsWith('http')) return match;
        const absolutePath = new URL(path, baseUrl).href;
        return `${attr}="${process.env.PROXY_BASE + encodeURIComponent(absolutePath)}"`;
      });
      body = body.replace(/<\/body>/i, `
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            const baseUrl = '${baseUrl}';
            const proxyBase = '${process.env.PROXY_BASE}';
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
    else if (contentType.includes("text/css") || contentType.includes("application/javascript")) {
      body = body.replace(/url\((['"]?)([^'"\)]+)\1\)/g, (match, quote, path) => {
        if (path.startsWith('http')) return match;
        const absolutePath = new URL(path, baseUrl).href;
        return `url(${quote}${process.env.PROXY_BASE + encodeURIComponent(absolutePath)}${quote})`;
      });
      res.setHeader("Content-Type", contentType);
    }
    else {
      res.setHeader("Content-Type", contentType);
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.send(body);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).send(`Error fetching the page: ${error.message}`);
  }
});

// New endpoint for PayPal proxy
app.get("/proxy-paypal", async (req, res) => {
  try {
    const response = await axios.get('https://www.paypal.com/signin', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      withCredentials: true,
    });
    // Extract cookies from the response headers
    const cookies = response.headers['set-cookie'] || [];
    res.json({
      success: true,
      cookies: cookies,
    });
  } catch (error) {
    console.error('Error fetching PayPal:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PayPal',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
