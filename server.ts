import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { google } from 'googleapis';
import cookieSession from 'cookie-session';

import { startCaseFromTopicCmd, analyzePDFAndStartCaseCmd, progressSimulationCmd, generateSpeechCmd } from './server/geminiServer.ts';

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieSession({
    name: 'session',
    keys: [process.env.COOKIE_SECRET || 'medisim-secret'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true,
    sameSite: 'none'
  }));

  const oauth2Client = (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) 
    ? new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      )
    : null;

  // API routes
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.post('/api/gemini/topic', async (req, res) => {
    try {
      const data = await startCaseFromTopicCmd(req.body.topic);
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Error occurred' });
    }
  });

  app.post('/api/gemini/pdf', async (req, res) => {
    try {
      const data = await analyzePDFAndStartCaseCmd(req.body.files, req.body.extractedImages);
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Error occurred' });
    }
  });

  app.post('/api/gemini/progress', async (req, res) => {
    try {
      const { context, history, userAction, visuals, cmePoints } = req.body;
      const data = await progressSimulationCmd(context, history, userAction, visuals, cmePoints);
      res.json(data);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Error occurred' });
    }
  });

  app.post('/api/gemini/speech', async (req, res) => {
    try {
      const data = await generateSpeechCmd(req.body.text);
      res.json({ audioData: data });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || 'Error occurred' });
    }
  });


  app.get('/api/auth/google/url', (req: Request, res: Response) => {
    if (!oauth2Client) {
      return res.status(503).json({ error: 'Google integration is not configured' });
    }
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/documents'
      ],
      redirect_uri: redirectUri
    });
    res.json({ url });
  });

  app.get('/auth/google/callback', async (req: any, res: Response) => {
    if (!oauth2Client) {
      return res.status(503).send('Google integration is not configured');
    }
    const { code } = req.query;
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
    
    try {
      const { tokens } = await oauth2Client.getToken({
        code: code as string,
        redirect_uri: redirectUri
      });
      req.session.tokens = tokens;
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Google Auth Error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get('/api/auth/google/check', (req: any, res: Response) => {
    res.json({ authenticated: !!req.session?.tokens });
  });

  app.post('/api/export/googledoc', async (req: any, res: Response) => {
    if (!oauth2Client) {
      return res.status(503).json({ error: 'Google integration is not configured' });
    }
    if (!req.session?.tokens) {
      return res.status(401).json({ error: 'Not authenticated with Google' });
    }

    const { entry } = req.body;
    oauth2Client.setCredentials(req.session.tokens);
    const docs = google.docs({ version: 'v1', auth: oauth2Client });

    try {
      // Create a new document
      const doc = await docs.documents.create({
        requestBody: {
          title: `MediSim ER Report - ${entry.diagnosis} - ${new Date(entry.timestamp).toLocaleDateString()}`
        }
      });

      const documentId = doc.data.documentId;

      // Add content to the document
      const content = `
CLINICAL PERFORMANCE REPORT
---------------------------
Diagnosis: ${entry.diagnosis}
Date: ${new Date(entry.timestamp).toLocaleString()}
Outcome: ${entry.outcome}
Score: ${entry.score}%

SUMMARY:
${entry.summary}

AREAS FOR IMPROVEMENT:
${entry.missedOpportunities.map((m: string) => `- ${m}`).join('\n')}
${entry.criticalEvents.filter((e: any) => e.type === 'negative').map((e: any) => `- [${e.event}] ${e.feedback}`).join('\n')}

KEY LEARNING POINTS:
${entry.learningPoints.map((p: string) => `- ${p}`).join('\n')}

Generated by MediSim ER
      `.trim();

      await docs.documents.batchUpdate({
        documentId: documentId!,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content
              }
            }
          ]
        }
      });

      res.json({ success: true, documentId, url: `https://docs.google.com/document/d/${documentId}/edit` });
    } catch (error: any) {
      console.error('Google Docs Export Error:', error);
      if (error.code === 401) {
        req.session = null;
        return res.status(401).json({ error: 'Authentication expired' });
      }
      res.status(500).json({ error: 'Failed to export to Google Docs' });
    }
  });

  // Vite middleware for development (live compilation of assets)
  // Production optimized asset serving under production environment
  if (process.env.NODE_ENV === "production") {
    console.log("Serving static production assets from dist/ to optimize loading speeds...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log("Vite dynamic development middleware is active for on-the-fly TypeScript compilation/hot execution...");
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: false
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('Failed to start Vite middleware:', e);
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
