import jwt from 'jsonwebtoken';

export function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      tokenVersion: user.tokenVersion || 0
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
