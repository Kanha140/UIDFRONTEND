// Dynamic Backend URL resolution for Local & Cloud Hosting (Render / Vercel / Netlify)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

window.APP_CONFIG = {
  // Production Render Backend URL
  BACKEND_URL: isLocalhost 
    ? "http://localhost:5000/api" 
    : "https://uidbackend.onrender.com/api",
  SITE_NAME: "UID BYPASS REGISTRY",
  DEFAULT_WHITELIST_DAYS: 30
};
