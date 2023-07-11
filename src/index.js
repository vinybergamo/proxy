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

app.all("/:name*", async (req, res) => {
  const { name } = req.params;

  const api = await prisma.api.findUnique({
    where: {
      name,
    },
  });

  if (!api)
    return res.status(404).json({
      reason: `Api ${name} not found`,
    });

  proxy.on("proxyReq", err => {
    console.log(err.path);
  });

  const path = req.params[0];

  proxy.on("error", err => {
    return res.status(500).json({
      reason: "Internal server error",
    });
  });

  return proxy.web(
    req,
    res,
    {
      target: api.url + path,
      secure: false,
      ignorePath: true,
    },
    e => console.log(e)
  );
});

app.listen(8000, () => {
  console.log("Server runing on 8000");
});
