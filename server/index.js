import 'dotenv/config';
import { createApp } from './app.js';

const required = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'JWT_SECRET', 'APP_URL'];
const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const port = Number(process.env.PORT) || 3000;
createApp().listen(port, () => console.log(`AI Capsule running on port ${port}`));
