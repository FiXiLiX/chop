import express from 'express';
import cors from 'cors';
import { repertoiresRouter } from './routes/repertoires.js';
import { analysisRouter } from './routes/analysis.js';
import { shutdown as shutdownEngine } from './services/analysis.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/repertoires', repertoiresRouter);
app.use('/api/analysis', analysisRouter);

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function cleanup() {
  console.log('Shutting down...');
  shutdownEngine().catch(() => {});
  server.close(() => process.exit(0));
}

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
