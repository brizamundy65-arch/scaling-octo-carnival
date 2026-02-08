const { randomUUID } = require('crypto');
const { z } = require('zod');

const guestCookieName = 'wt_guest';
const guestIdSchema = z.string().uuid();

function isHttpsRequest(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '');
  if (forwardedProto) return forwardedProto.split(',')[0].trim() === 'https';
  return !!req.secure;
}

function ensureGuestId(req, res, next) {
  const existing = req.cookies?.[guestCookieName];
  const parsed = guestIdSchema.safeParse(existing);

  if (parsed.success) {
    req.guestId = parsed.data;
    return next();
  }

  const guestId = randomUUID();
  const secure = process.env.NODE_ENV === 'production' ? isHttpsRequest(req) : false;

  res.cookie(guestCookieName, guestId, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
  });

  req.guestId = guestId;
  next();
}

function getActorId(req) {
  if (req.user?.id) return req.user.id;
  return req.guestId;
}

module.exports = { ensureGuestId, getActorId };

