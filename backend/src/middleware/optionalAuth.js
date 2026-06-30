import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (header?.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      req.user = user && (user.tokenVersion || 0) === (decoded.tokenVersion || 0) ? user : null;
    }

    next();
  } catch {
    next();
  }
}
