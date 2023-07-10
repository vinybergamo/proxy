const express = require("express");
const http = require("http");
const { PrismaClient } = require("@prisma/client");
const httpProxy = require("http-proxy");

const prisma = new PrismaClient();
const app = express();
const proxy = httpProxy.createProxyServer();

app.use(express.json());

app.get("/gateway", async (req, res) => {
  const result = await prisma.api.findMany();

  return res.status(200).json(result);
});

app.get("/gateway/:name", async (req, res) => {
  const { name } = req.params;

  const result = await prisma.api.findUnique({
    where: { name },
  });

  if (!result) return res.status(404).json({ reason: `Api ${name} not found` });

  return res.status(200).json(result);
});

app.delete("/gateway/:name", async (req, res) => {
  const { name } = req.params;

  const result = await prisma.api.findUnique({
    where: { name },
  });

  if (!result) return res.status(404).json({ reason: `Api ${name} not found` });

  await prisma.api.delete({
    where: {
      name,
    },
  });

  return res.status(200).json({
    message: `Api ${name} deleted`,
  });
});

app.patch("/gateway/:name", async (req, res) => {
  const { name } = req.params;
  const { url } = req.body;

  const result = await prisma.api.findUnique({
    where: { name },
  });

  if (!result) return res.status(404).json({ reason: `Api ${name} not found` });

  const updated = await prisma.api.update({
    where: {
      name,
    },
    data: {
      url,
      updated_at: new Date(),
    },
  });

  return res.status(200).json({
    message: `Api ${name} updated`,
    api: updated,
  });
});

app.post("/gateway", async (req, res) => {
  const { name, url } = req.body;

  const api = await prisma.api.findUnique({
    where: { name },
  });

  if (api)
    return res.status(400).json({
      reason: `Api ${name} Already exists`,
      api,
    });

  const result = await prisma.api.create({
    data: {
      name,
      url,
    },
  });

  return res.status(201).json({ message: "Api saved", api: result });
});

app.all("/api", (req, res) =>
  res.status(400).json({ error: "Error connect to api" })
);

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith("/api")) {
    const name = req.url.split("/")[2];
    req.url = req.url.replace("/api/" + name, "");

    const api = await prisma.api.findUnique({
      where: {
        name,
      },
    });

    if (!api) {
      res.writeHead(500);
      res.end(
        JSON.stringify(
          {
            reason: `Api ${name} not found`,
          },
          null,
          3
        )
      );

      return;
    }

    proxy.on("error", err => {
      res.writeHead(500);
      res.end(
        JSON.stringify(
          {
            reason: "Internal server error",
          },
          null,
          3
        )
      );

      return;
    });

    proxy.web(req, res, {
      target: api.url,
      secure: false,
    });
  } else {
    app(req, res);
  }
});

server.listen(8000, () => {
  console.log("Server runing on 8000");
});
