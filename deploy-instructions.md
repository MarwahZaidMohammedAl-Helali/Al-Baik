# Quick Render Deployment

## Option 1: GitHub Deployment (Recommended)
1. Push your code to GitHub
2. Connect GitHub to Render
3. Deploy automatically

## Option 2: Manual Deployment
1. Zip your project folder
2. Upload to Render
3. Configure build settings

## Environment Variables for Render:
```
NODE_ENV=production
PORT=10000
JWT_SECRET=wholesale-ecommerce-super-secret-key-2024-make-this-very-long-and-random
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wholesale_ecommerce
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Build Settings:
- Build Command: `npm run build`
- Start Command: `npm start`
- Node Version: 18

## After Deployment:
Your app will be available at: `https://your-app-name.onrender.com`

Test endpoints:
- `/health` - API health check
- `/mobile` - Mobile web app
- `/api/auth/register` - Register endpoint

## Mobile Access:
1. Open phone browser
2. Go to your Render URL + `/mobile`
3. Add to home screen for app experience