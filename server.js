import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { Note } from './models/Note.js';

const dbUri = process.env.MONGODB_URI;
const port = Number(process.env.PORT) || 3000;
const app = express();

// ---------- middleware ----------

function logger(req, res, next) {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} ${req.method} ${req.path}`);
  next();
}

// Validation: a title is required and must be a non-empty string
function requireTitle(req, res, next) {
  const title = req.body?.title;
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  next();
}

// Validation: the :id in the URL must be a valid ObjectId
function checkId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
}

// Schema rule failed -> 400. Anything else -> 500.
function sendError(res, err) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err.message);
  res.status(500).json({ error: 'Server error' });
}

app.use(logger);
app.use(express.json());

// ---------- routes ----------

// READ ALL  (?search=exam filters by title)
app.get('/api/notes', async (req, res) => {
  try {
    const re = { $regex: req.query.search ?? '', $options: 'i' };
    const notes = await Note.find({ title: re }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    sendError(res, err);
  }
});

// READ ONE
app.get('/api/notes/:id', checkId, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    sendError(res, err);
  }
});

// CREATE
app.post('/api/notes', requireTitle, async (req, res) => {
  try {
    const { title, body, tags } = req.body;
    const note = await Note.create({ title, body, tags });
    res.status(201).json(note);
  } catch (err) {
    sendError(res, err);
  }
});

// REPLACE (PUT): the whole note is replaced, so title is required
app.put('/api/notes/:id', checkId, requireTitle, async (req, res) => {
  try {
    const { title, body, tags } = req.body;
    const data = { title, body: body ?? '', tags: tags ?? [] };
    const note = await Note.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    sendError(res, err);
  }
});

// UPDATE (PATCH): changes only the fields you send
app.patch('/api/notes/:id', checkId, async (req, res) => {
  try {
    const { title, body, tags } = req.body ?? {};
    const data = {};
    if (title !== undefined) data.title = title;
    if (body !== undefined) data.body = body;
    if (tags !== undefined) data.tags = tags;
    const note = await Note.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE
app.delete('/api/notes/:id', checkId, async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.sendStatus(204);
  } catch (err) {
    sendError(res, err);
  }
});

// nothing matched
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------- connect first, then listen ----------

try {
  await mongoose.connect(dbUri);
  console.log('connected to MongoDB');
  app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
} catch (err) {
  console.error('DB connection failed:', err.message);
  process.exit(1);
}
