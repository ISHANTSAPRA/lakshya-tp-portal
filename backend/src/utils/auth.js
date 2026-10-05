import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      trainingPartnerId: user.training_partner_id,
      centreId: user.centre_id
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}
