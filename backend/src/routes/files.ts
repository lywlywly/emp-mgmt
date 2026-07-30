import { Router } from "express";
import type { Request, Response } from "express";
import multer, { MulterError } from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { uploadedFileSchema } from "@emp-mgmt/shared";
import { requireAuth } from "../middleware/requireAuth.js";
import { FileMetadataModel } from "../models/FileMetadata.js";

const UPLOAD_DIR = "uploads";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

// Accept only image/* or application/pdf.
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.startsWith("image/") || file.mimetype === "application/pdf";
    if (ok) cb(null, true);
    else cb(new Error("Only image or PDF files are allowed"));
  },
});

export const filesRouter = Router();

const uploadSingle = upload.single("file");

// Upload (login required): store the file + a FileMetadata record owned by the
// current user. Form field name: "file". Returns the new file id + basic info.
// Multer errors are mapped to proper 4xx codes here (locally, so the global
// error handler and other routes are unaffected).
filesRouter.post("/files", requireAuth, (req, res, next) => {
  uploadSingle(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      // Size limit -> 413; any other Multer error -> 400.
      const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "File exceeds 10MB limit"
          : err.message;
      res.status(status).json({ error: message });
      return;
    }
    if (err) {
      // fileFilter rejection (disallowed type) -> 400.
      res
        .status(400)
        .json({ error: err instanceof Error ? err.message : "Upload failed" });
      return;
    }
    void handleUpload(req, res).catch(next);
  });
});

async function handleUpload(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const doc = await FileMetadataModel.create({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    path: req.file.path,
    size: req.file.size,
    uploadedBy: req.session.userId!,
  });
  res.json(
    uploadedFileSchema.parse({
      id: String(doc._id),
      fileName: doc.originalName,
      mimeType: doc.mimetype,
      size: doc.size,
    }),
  );
}

// Load a file the caller may access: the owner, or any file for HR.
// Returns null (and sends 404/403) when not accessible.
async function loadAuthorizedFile(req: Request, res: Response) {
  const file = await FileMetadataModel.findById(req.params.id).lean();
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return null;
  }
  const isHr = req.session.role === "hr";
  if (!isHr && String(file.uploadedBy) !== req.session.userId) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return file;
}

// Preview: inline so the browser renders it in a tab.
filesRouter.get("/files/:id/preview", requireAuth, async (req, res, next) => {
  try {
    const file = await loadAuthorizedFile(req, res);
    if (!file) return;
    res.setHeader("Content-Type", file.mimetype);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.originalName}"`,
    );
    fs.createReadStream(path.resolve(file.path)).pipe(res);
  } catch (err) {
    next(err);
  }
});

// Download: as an attachment.
filesRouter.get("/files/:id/download", requireAuth, async (req, res, next) => {
  try {
    const file = await loadAuthorizedFile(req, res);
    if (!file) return;
    res.download(path.resolve(file.path), file.originalName);
  } catch (err) {
    next(err);
  }
});

// Static I-983 templates (blank + sample) for the OPT I-983 step.
const I983_TEMPLATE_FILES: Record<string, string> = {
  empty: "i983-empty.pdf",
  sample: "i983-sample.pdf",
};
filesRouter.get("/templates/i983/:kind", requireAuth, (req, res) => {
  const fname = I983_TEMPLATE_FILES[req.params.kind];
  if (!fname) {
    res.status(404).json({ error: "Unknown template" });
    return;
  }
  res.download(path.resolve("templates", fname), fname);
});
