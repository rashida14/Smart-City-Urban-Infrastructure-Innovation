import { Router } from 'express';
import auth from '../middleware/auth.js';
import PotholeReport from '../models/PotholeReport.js';
import User from '../models/User.js';
import fetch from 'node-fetch';

const router = Router();

function simpleSeverityFromImageSize(imageData) {
  try {
    // crude heuristic: larger image size -> higher chance of High severity
    const len = (imageData || '').length;
    if (len > 800000) return 'High';
    if (len > 300000) return 'Medium';
    return 'Low';
  } catch {
    return 'Medium';
  }
}

async function runInference(imageData) {
  const base = process.env.INFERENCE_URL;
  const path = process.env.INFERENCE_PATH || '/detect';
  if (!base) return null;
  const url = `${base.replace(/\/$/, '')}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData }),
      // If your service needs other fields (e.g., size), add here
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `inference HTTP ${res.status}`);

    // Normalize detections from possible shapes
    const raw = data.detections || data.boxes || [];
    const detections = Array.isArray(raw)
      ? raw.map((d) => ({
          x: d.x ?? d.left ?? d.x1 ?? 0,
          y: d.y ?? d.top ?? d.y1 ?? 0,
          w: d.w ?? (d.width ?? (d.x2 != null && d.x1 != null ? d.x2 - d.x1 : 0)) ?? 0,
          h: d.h ?? (d.height ?? (d.y2 != null && d.y1 != null ? d.y2 - d.y1 : 0)) ?? 0,
          score: d.score ?? d.confidence ?? d.conf ?? 0,
          label: d.label ?? d.class ?? 'pothole',
        }))
      : [];
    const severity = data.severity || (detections.length > 2 ? 'High' : detections.length === 2 ? 'Medium' : detections.length === 1 ? 'Low' : 'Low');
    return { detections, severity };
  } catch (err) {
    console.error('Inference error:', err.message || err);
    return null;
  }
}

function simpleDetectionBox() {
  // return a single centered box as a placeholder detection
  return [
    {
      x: 0.35,
      y: 0.35,
      w: 0.3,
      h: 0.3,
      score: 0.78,
      label: 'pothole',
    },
  ];
}

// Create a pothole report (authenticated)
router.post('/', auth, async (req, res) => {
  try {
    const { imageData, latitude, longitude } = req.body || {};
    if (!imageData || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'imageData, latitude and longitude are required.' });
    }

    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Try external inference first; fallback to placeholder
    let detections = [];
    let severity = 'Medium';
    const infer = await runInference(imageData);
    if (infer) {
      detections = infer.detections || [];
      severity = infer.severity || (detections.length >= 3 ? 'High' : detections.length === 2 ? 'Medium' : 'Low');
    } else {
      detections = simpleDetectionBox();
      severity = simpleSeverityFromImageSize(imageData);
    }

    const doc = await PotholeReport.create({
      userId: user._id,
      userName: user.name,
      latitude,
      longitude,
      imageData,
      detections,
      severity,
      status: 'Detected',
    });

    res.status(201).json({ id: doc._id, severity: doc.severity, detections: doc.detections });
  } catch (err) {
    console.error('Report create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List reports for the authenticated user (most recent first)
router.get('/', auth, async (req, res) => {
  try {
    const items = await PotholeReport.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(items.map((r) => ({
      id: r._id,
      createdAt: r.createdAt,
      latitude: r.latitude,
      longitude: r.longitude,
      imageData: r.imageData,
      severity: r.severity,
      status: r.status,
      detections: r.detections || [],
    })));
  } catch (err) {
    console.error('Report list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics stats for the authenticated user
router.get('/stats', auth, async (req, res) => {
  try {
    const pipeline = [
      { $match: { userId: req.user.id } },
      {
        $facet: {
          bySeverity: [
            { $group: { _id: '$severity', count: { $sum: 1 } } },
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          total: [ { $count: 'count' } ],
          byDay: [
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
          byArea: [
            { $project: {
                area: {
                  $concat: [
                    { $toString: { $round: ['$latitude', 2] } },
                    ', ',
                    { $toString: { $round: ['$longitude', 2] } },
                  ]
                }
              }
            },
            { $group: { _id: '$area', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 12 },
          ],
        },
      },
    ];
    const [agg] = await PotholeReport.aggregate(pipeline);
    const total = (agg.total?.[0]?.count) || 0;
    const bySeverity = Object.fromEntries((agg.bySeverity || []).map((d) => [d._id, d.count]));
    const byStatus = Object.fromEntries((agg.byStatus || []).map((d) => [d._id, d.count]));
    const byDay = (agg.byDay || []).map((d) => ({ date: d._id, count: d.count }));
    const byArea = (agg.byArea || []).map((d) => ({ name: d._id, value: d.count }));
    res.json({ total, bySeverity, byStatus, byDay, byArea });
  } catch (err) {
    console.error('Report stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
