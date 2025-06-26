import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import indicatorRoutes from './routes/indicators';
import userRoutes from './routes/users';
import syncRoutes from './routes/sync';
import userPreferencesRoutes from './routes/userPreferences';
import analysisRoutes from './routes/analysis';
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import emailRoutes from './routes/email';
import { backgroundWorker } from './services/backgroundWorker';
import SchedulerService from './services/schedulerService';
import { env, features } from './utils/env';

const app = express();
const PORT = env.PORT;

// Logging startup info
console.log(`🚀 Starting EconIndicatorDaily API on port ${PORT}`);
console.log(`📊 Environment: ${env.NODE_ENV}`);
console.log(`🔧 Features enabled:`, features);

app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/indicators', indicatorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/user-preferences', userPreferencesRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/email', emailRoutes);

// Initialize scheduler service
const schedulerService = new SchedulerService();

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  
  // Start background worker for automated data syncing
  if (env.ENABLE_BACKGROUND_SYNC) {
    console.log('\n🤖 Starting background worker...');
    backgroundWorker.start();
  } else {
    console.log('\n⏸️  Background worker disabled');
  }
  
  // Start email scheduler
  console.log('\n📧 Starting email scheduler...');
  schedulerService.start();
});