import express, { Request, Response } from "express";
import path from "path";

import {
  startCaseFromTopicCmd,
  analyzePDFAndStartCaseCmd,
  progressSimulationCmd,
} from "./server/claudeServer.ts";

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "50mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", engine: "claude" });
  });

  // Generate a case from a free-text medical topic.
  app.post("/api/sim/topic", async (req: Request, res: Response) => {
    try {
      const data = await startCaseFromTopicCmd(req.body.topic);
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to generate case." });
    }
  });

  // Generate a case from uploaded clinical records (PDF / images).
  app.post("/api/sim/pdf", async (req: Request, res: Response) => {
    try {
      const data = await analyzePDFAndStartCaseCmd(
        req.body.files,
        req.body.extractedImages
      );
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to analyze records." });
    }
  });

  // Advance the simulation one player action at a time.
  app.post("/api/sim/progress", async (req: Request, res: Response) => {
    try {
      const { context, history, userAction, visuals, cmePoints } = req.body;
      const data = await progressSimulationCmd(
        context,
        history,
        userAction,
        visuals,
        cmePoints
      );
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "The clinical engine failed." });
    }
  });

  if (process.env.NODE_ENV === "production") {
    console.log("Serving static production assets from dist/...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    console.log("Starting Vite dev middleware...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("Failed to start Vite middleware:", e);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MediSim ER running on http://localhost:${PORT}`);
  });
}

startServer();
