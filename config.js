// Dynamic Backend URL resolution for Local & Cloud Hosting (Render / Vercel / Netlify)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const customBackend = localStorage.getItem('custom_backend_url');

window.APP_CONFIG = {
  // Production Render Backend URL with local & custom fallback
  BACKEND_URL: customBackend || (isLocalhost 
    ? "http://localhost:5000/api" 
    : "https://uidbackend.onrender.com/api"),
  SITE_NAME: "UID BYPASS REGISTRY",
  DEFAULT_WHITELIST_DAYS: 30
};
