export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.startsWith("http")) {
    return res.status(400).send("<h1>Missing or invalid 'url' parameter.</h1>");
  }

  try {
    const response = await fetch(url);
    const body = await response.text();

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(body);
  } catch (error) {
    res.status(500).send(`<h1>Proxy Error</h1><p>${error.message}</p>`);
  }
}
