import express, { Request, Response } from "express";
import path from "path";

import {
  startCaseFromTopicCmd,
  analyzePDFAndStartCaseCmd,
  progressSimulationCmd,
  tutorCmd,
  gradeCmd,
} from "./server/simEngine.ts";
import { engineInfo, credsFromHeaders, runWithCreds, testCreds, NeedKeyError } from "./server/llm.ts";

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "50mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", engine: engineInfo() });
  });

  /**
   * Every AI route runs on the caller's own key (or the owner's, with the owner
   * access code). Requests with neither get 401 and never touch a server key.
   * Keys are used for the one request and never stored or logged.
   */
  const withKey =
    (fallbackError: string, handler: (req: Request) => Promise<unknown>) =>
    async (req: Request, res: Response) => {
      try {
        const creds = credsFromHeaders(req.headers);
        res.json(await runWithCreds(creds, () => handler(req)));
      } catch (e: any) {
        if (e instanceof NeedKeyError) {
          return res.status(401).json({ error: e.message, code: e.code });
        }
        console.error(e?.message || e);
        res.status(500).json({ error: e?.message || fallbackError });
      }
    };

  // Check a key (or the owner access code) before playing.
  app.post("/api/key/test", async (req: Request, res: Response) => {
    try {
      const creds = credsFromHeaders(req.headers);
      const info = await testCreds(creds);
      res.json({ ok: true, ...info, source: creds.source });
    } catch (e: any) {
      const status = e instanceof NeedKeyError ? 401 : 502;
      res.status(status).json({ ok: false, error: e?.message || "Key check failed.", code: e?.code });
    }
  });

  // Generate a case from a free-text medical topic.
  app.post(
    "/api/sim/topic",
    withKey("Failed to generate case.", (req) => startCaseFromTopicCmd(req.body.topic, req.body.level))
  );

  // Generate a case from uploaded clinical records (PDF / images).
  app.post(
    "/api/sim/pdf",
    withKey("Failed to analyze records.", (req) =>
      analyzePDFAndStartCaseCmd(req.body.files, req.body.extractedImages, req.body.level)
    )
  );

  // Advance the simulation one player action at a time.
  app.post(
    "/api/sim/progress",
    withKey("The clinical engine failed.", (req) => {
      const { context, history, userAction, visuals, cmePoints, workingDiagnoses, level } = req.body;
      return progressSimulationCmd(context, history, userAction, visuals, cmePoints, workingDiagnoses, level);
    })
  );

  // Private coaching when the player is stuck: escalating hints or a direct question.
  app.post(
    "/api/sim/tutor",
    withKey("The tutor is unavailable.", (req) => {
      const { record, hintLevel, question, level } = req.body;
      return tutorCmd(record, hintLevel, question, level);
    })
  );

  // Full-case review once the encounter ends.
  app.post(
    "/api/sim/grade",
    withKey("Grading failed.", (req) => {
      const { record, preliminary, level } = req.body;
      return gradeCmd(record, preliminary, level);
    })
  );

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
    const e = engineInfo();
    console.log(`MediSim ER running on http://localhost:${PORT} — bring-your-own-key mode`);
    console.log(
      e.ownerAccess
        ? "Owner access code is set: only requests with that code can use the server's own keys."
        : "No OWNER_ACCESS_CODE set: the server's own keys (if any) are never used."
    );
  });
}

startServer();
