# Security and production gaps
- **Local-only development artifact**. DEV_OTP reveals signup codes in API output in development, and must be turned off before deployment. Production requires SMTP and properly secured email delivery.
- Rate limiting is mandatory for production. Configure reverse proxy per-IP+account throttling, especially POST /api/auth/login (5/min), send-otp (3/15 min), signup (5/hour). A single-process limiter can be bypassed in multi-worker deployments; use Redis or a gateway if deploying.
- `AUDITOR_INVITE_CODE` is an initial demo provisioning mechanism. For production use server-created invitation records scoped to email with single use and expiry, or an administrator-only user provisioning API.
- HTTP-only cookie protects from JS reading sessions; production requires HTTPS, `COOKIE_SECURE=true`, CSRF protections, trusted `ALLOWED_ORIGINS`, rotation and logout revocation. SameSite=Lax alone is not full CSRF protection.
- Session is signed and time-limited but not centrally revocable until expiration; logout deletes browser cookie only. Future iteration should add server-side session table.
- No dashboard operating data migrated to PostgreSQL in this phase, by explicit requirement to leave those files alone.
- SQL tables created with `create_all` for easy local setup; production should use Alembic migrations.
