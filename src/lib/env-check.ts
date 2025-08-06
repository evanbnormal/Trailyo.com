// Environment variable checker to prevent build-time errors
export const checkEnvVars = () => {
  const required = [
    'DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'SENDGRID_API_KEY',
    'BASE_URL'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing environment variables:', missing.join(', '));
    console.warn('⚠️ This is expected during build time on Vercel');
  }
  
  return missing.length === 0;
}; 