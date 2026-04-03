# 🚀 Deploy Al-Baik Web App to Vercel

## Prerequisites
- Vercel account (free): https://vercel.com/signup
- Git repository (GitHub, GitLab, or Bitbucket)

## 📋 Step-by-Step Deployment

### 1. **Prepare Your Repository**
Make sure your code is pushed to a Git repository (GitHub recommended).

### 2. **Login to Vercel**
1. Go to https://vercel.com/
2. Sign up or login with your GitHub account
3. Connect your GitHub account if not already connected

### 3. **Import Your Project**
1. Click "New Project" on Vercel dashboard
2. Import your repository containing the Al-Baik project
3. Select the repository from the list

### 4. **Configure Project Settings**
When importing, configure these settings:

**Framework Preset:** Next.js
**Root Directory:** `web` (important!)
**Build Command:** `npm run build`
**Output Directory:** `.next`
**Install Command:** `npm install`

### 5. **Environment Variables**
Add these environment variables in Vercel:
- `NEXT_PUBLIC_API_URL` = `https://al-baik-api.albaik-ecommerce-api.workers.dev`

### 6. **Deploy**
1. Click "Deploy"
2. Wait for the build to complete (usually 2-3 minutes)
3. Your site will be live at a Vercel URL (e.g., `your-project.vercel.app`)

## 🔧 Alternative: Deploy via Vercel CLI

### 1. **Install Vercel CLI**
```bash
npm install -g vercel
```

### 2. **Login to Vercel**
```bash
vercel login
```

### 3. **Deploy from Web Directory**
```bash
cd web
vercel
```

### 4. **Follow the Prompts**
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N** (for first deployment)
- What's your project's name? **al-baik-web**
- In which directory is your code located? **./** (since you're in web folder)

### 5. **Set Environment Variables**
```bash
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://al-baik-api.albaik-ecommerce-api.workers.dev
```

### 6. **Redeploy with Environment Variables**
```bash
vercel --prod
```

## 🌐 Custom Domain (Optional)

### 1. **Add Custom Domain**
1. Go to your project in Vercel dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `al-baik.com`)

### 2. **Configure DNS**
Point your domain's DNS to Vercel:
- **A Record**: `76.76.19.61`
- **CNAME**: `cname.vercel-dns.com`

## ✅ Verification Checklist

After deployment, verify:
- [ ] Website loads at Vercel URL
- [ ] Admin login page works (`/admin`)
- [ ] Main website displays correctly (`/`)
- [ ] API calls work (check browser console)
- [ ] Categories and products can be added via admin
- [ ] Mobile-responsive design works
- [ ] Logo and images display correctly

## 🔄 Automatic Deployments

Vercel automatically deploys when you push to your main branch:
1. Make changes to your code
2. Push to GitHub
3. Vercel automatically builds and deploys
4. Live site updates in 2-3 minutes

## 🐛 Troubleshooting

### Build Fails
- Check that `web` is set as root directory
- Verify all dependencies are in `package.json`
- Check build logs for specific errors

### API Not Working
- Verify `NEXT_PUBLIC_API_URL` environment variable
- Check that the backend API is accessible
- Look for CORS issues in browser console

### Images Not Loading
- Ensure images are in `web/public/` directory
- Check image paths are correct
- Verify logo.png exists in `web/public/`

## 📱 Testing Your Deployed Site

### Test Admin Features:
1. Go to `https://your-site.vercel.app/admin`
2. Login with admin credentials
3. Add categories and products
4. Verify they appear on main site

### Test Main Website:
1. Go to `https://your-site.vercel.app`
2. Check categories display
3. Check products display
4. Test responsive design on mobile

## 🎯 Production URLs

After deployment, you'll have:
- **Main Website**: `https://your-project.vercel.app`
- **Admin Dashboard**: `https://your-project.vercel.app/admin`
- **Login Page**: `https://your-project.vercel.app/login`

Your Al-Baik web app is now live and ready for use! 🎉