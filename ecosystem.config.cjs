module.exports = {
  apps: [
    {
      name: 'avatar-dashboard',
      script: './server/index.cjs',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5173,
        DATABASE_URL: 'postgresql://avatar_admin:avatar_secure_2026@localhost:5432/avatar_dashboard',
        JWT_SECRET: 'avatar-dashboard-secret-change-in-production-2026'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
}
