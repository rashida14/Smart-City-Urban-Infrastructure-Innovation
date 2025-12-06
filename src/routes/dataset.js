import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import fg from 'fast-glob';
import { fileURLToPath } from 'url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to data.yaml
const dataYamlPath = path.resolve(__dirname, '..', 'models', 'pothol_backend-main', 'backened', 'dataset', 'data.yaml');

function getDatasetRoot() {
  const yamlDir = path.dirname(dataYamlPath);
  return yamlDir; // this is the folder that contains train/ and val/
}

function readYaml() {
  const raw = fs.readFileSync(dataYamlPath, 'utf8');
  const doc = yaml.load(raw);
  return doc || {};
}

router.get('/meta', async (_req, res) => {
  try {
    const doc = readYaml();
    const datasetRoot = getDatasetRoot();

    const trainImagesDir = path.resolve(datasetRoot, 'train', 'images');
    const valImagesDir = path.resolve(datasetRoot, 'val', 'images');

    const trainCount = (await fg(['**/*.{jpg,jpeg,png}'], { cwd: trainImagesDir, caseSensitiveMatch: false })).length;
    const valCount = (await fg(['**/*.{jpg,jpeg,png}'], { cwd: valImagesDir, caseSensitiveMatch: false })).length;

    res.json({
      nc: doc.nc,
      names: doc.names,
      splits: {
        train: { images: trainCount },
        val: { images: valCount },
      },
    });
  } catch (err) {
    console.error('dataset meta error:', err);
    res.status(500).json({ error: 'Failed to read dataset meta' });
  }
});

router.get('/samples', async (req, res) => {
  try {
    const split = (req.query.split || 'train').toString();
    const limit = Math.min(parseInt(req.query.limit || '12', 10) || 12, 50);

    const datasetRoot = getDatasetRoot();
    const imagesDir = path.resolve(datasetRoot, split, 'images');

    const files = await fg(['**/*.{jpg,jpeg,png}'], { cwd: imagesDir, caseSensitiveMatch: false });
    const sample = files.slice(0, limit).map((rel) => `/static/dataset/${split}/images/${rel.replace(/\\/g, '/')}`);

    res.json({ split, count: files.length, sample });
  } catch (err) {
    console.error('dataset samples error:', err);
    res.status(500).json({ error: 'Failed to list samples' });
  }
});

export default router;
