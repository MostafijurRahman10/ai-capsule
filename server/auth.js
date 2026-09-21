import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'ai-capsule'
    });
    if (!payload.sub) throw new Error('JWT subject is missing');
    req.user = { id: String(payload.sub), login: payload.login || '' };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function issueToken(user) {
  return jwt.sign(
    { login: user.login },
    process.env.JWT_SECRET,
    { subject: String(user.id), issuer: 'ai-capsule', expiresIn: '8h', algorithm: 'HS256' }
  );
}

export const tokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/'
});
