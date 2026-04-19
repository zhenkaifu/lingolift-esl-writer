import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  // API to extract text from files
  app.post("/api/extract-text", upload.fields([
    { name: 'writing', maxCount: 1 },
    { name: 'rubric', maxCount: 1 }
  ]), async (req: any, res: any) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const result: { writingText?: string; rubricText?: string } = {};

      const extract = async (file: Express.Multer.File) => {
        if (file.mimetype === "application/pdf") {
          const pdfParser = new PDFParse({ data: file.buffer });
          const data = await pdfParser.getText();
          return data.text;
        } else if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          const data = await mammoth.extractRawText({ buffer: file.buffer });
          return data.value;
        } else {
          return file.buffer.toString("utf-8");
        }
      };

      if (files?.writing?.[0]) {
        result.writingText = await extract(files.writing[0]);
      }
      if (files?.rubric?.[0]) {
        result.rubricText = await extract(files.rubric[0]);
      }

      res.json(result);
    } catch (error) {
      console.error("Text extraction failed:", error);
      res.status(500).json({ error: "Failed to extract text from files" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
