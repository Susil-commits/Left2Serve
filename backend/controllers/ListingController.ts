import { Request, Response, NextFunction } from 'express';
import { ListingService } from '../services/ListingService.js';
import { AIService } from '../services/AIService.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Readable } from 'stream';

const CLOUDINARY_CONFIGURED = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (CLOUDINARY_CONFIGURED) cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => { const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']; cb(null, allowed.includes(file.mimetype)); } });

function uploadToCloudinary(buffer: Buffer) {
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'left2serve', resource_type: 'auto' }, (err, result) => err ? reject(err) : resolve(result!.secure_url));
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
}

const MAX_IMAGES = 5;

function sanitizeImageUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return (urls as unknown[])
    .map((u) => String(u || ''))
    .filter((u) => /^https:\/\/[^\s'"]+\.(jpg|jpeg|png|webp)(\?[^\s'"]*)?$/i.test(u) || /^https:\/\/res\.cloudinary\.com\/[^\s'"]+$/i.test(u) || /^\/uploads\/left2serve\/[^\s'"]+\.webp$/i.test(u) || /^https:\/\/[^\s'"]+\/uploads\/left2serve\/[^\s'"]+\.webp$/i.test(u))
    .slice(0, MAX_IMAGES);
}

export class ListingController {
  static get uploadMiddleware() {
    return upload.array('images', MAX_IMAGES);
  }

  static async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const urls: string[] = [];
      const files = req.files as Express.Multer.File[];
      for (const f of files) {
        const processedBuffer = await sharp(f.buffer)
          .rotate()
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        if (CLOUDINARY_CONFIGURED) {
          try {
            const url = await uploadToCloudinary(processedBuffer);
            urls.push(url);
            continue;
          } catch (err: any) {
            console.error('Cloudinary upload failed, falling back to local storage:', err.message);
          }
        }
        
        const dir = path.join(process.cwd(), 'uploads', 'left2serve');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
        await fs.promises.writeFile(path.join(dir, filename), processedBuffer);
        
        const base = req.protocol ? `${req.protocol}://${req.get('host')}` : '';
        urls.push(base ? `${base}/uploads/left2serve/${filename}` : `/uploads/left2serve/${filename}`);
      }
      res.json({ urls });
    } catch (err: any) {
      console.error('Upload error:', err.message);
      res.status(500).json({ error: 'Upload failed' });
    }
  }

  static async analyzeImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) {
        res.status(400).json({ error: 'imageUrl is required' });
        return;
      }
      if (!process.env.GEMINI_API_KEY) {
        res.status(503).json({ error: 'AI features are not configured on this server.' });
        return;
      }
      const analysis = await AIService.analyzeFoodImage(imageUrl);
      res.json(analysis);
    } catch (err: any) {
      console.error('AI Analysis Route error:', err.message);
      res.status(500).json({ error: err.message || 'Failed to analyze image' });
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryOptions = {
        category: req.query.category,
        status: req.query.status,
        search: req.query.search,
        sort: req.query.sort,
        dietary: req.query.dietary,
        page: Math.max(1, parseInt((req.query.page as string) || '1') || 1),
        limit: Math.min(48, Math.max(1, parseInt((req.query.limit as string) || '12') || 12)),
        lat: req.query.lat,
        lng: req.query.lng,
        distance: req.query.distance
      };
      const result = await ListingService.getAllListings(queryOptions);
      res.json(result);
    } catch (err) { next(err); }
  }

  static async getAnalyticsMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await ListingService.getAnalyticsMe(req.user!.id);
      res.json(stats);
    } catch (err) { next(err); }
  }

  static async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const listings = await ListingService.getMine(req.user!.id);
      res.json(listings);
    } catch (err) { next(err); }
  }

  static async getTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const templates = await ListingService.getTemplates(req.user!.id);
      res.json(templates);
    } catch (err) { next(err); }
  }

  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await ListingService.getStats();
      res.json(stats);
    } catch (err) { next(err); }
  }

  static async getImpact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const impact = await ListingService.getImpactStats();
      res.json(impact);
    } catch (err) { next(err); }
  }

  static async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user ? { id: req.user.id, role: req.user.role } : undefined;
      const listing = await ListingService.getOne(req.params.id as string, user);
      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }
      res.json(listing);
    } catch (err) { next(err); }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      data.image_urls = sanitizeImageUrls(data.image_urls);
      const listing = await ListingService.createListing(req.user!.id, data);
      res.status(201).json(listing);
    } catch (err) { next(err); }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = { ...req.body };
      if (data.image_urls) data.image_urls = sanitizeImageUrls(data.image_urls);
      const updated = await ListingService.updateListing(req.params.id as string, req.user!.id, data);
      res.json(updated);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') res.status(404).json({ error: 'Listing not found' });
      else if (err.message === 'NOT_AUTHORIZED') res.status(403).json({ error: 'Not authorized' });
      else if (err.message === 'CLOSED') res.status(409).json({ error: 'Cannot edit a listing that is already closed' });
      else next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ListingService.deleteListing(req.params.id as string, req.user!.id);
      res.json({ message: 'Listing deleted' });
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') res.status(404).json({ error: 'Listing not found' });
      else if (err.message === 'NOT_AUTHORIZED') res.status(403).json({ error: 'Not authorized' });
      else if (err.message === 'ACTIVE_RESERVATIONS') res.status(409).json({ error: 'Cannot delete a listing with active reservations. Cancel them first.' });
      else next(err);
    }
  }

  static async close(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ListingService.closeListing(req.params.id as string, req.user!.id);
      res.json({ message: 'Listing marked as donated' });
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') res.status(404).json({ error: 'Listing not found' });
      else if (err.message === 'NOT_AUTHORIZED') res.status(403).json({ error: 'Not authorized' });
      else if (err.message === 'ALREADY_CLOSED') res.status(400).json({ error: 'Listing is already closed' });
      else if (err.message === 'ACTIVE_RESERVATIONS') res.status(409).json({ error: 'Cannot close a listing with pending or approved reservations' });
      else next(err);
    }
  }
}
