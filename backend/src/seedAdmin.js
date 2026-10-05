import dotenv from "dotenv";
import { pool } from "./config/db.js";
import { hashPassword } from "./utils/auth.js";

dotenv.config();

const email = "admin@lakshya.local";
const password = "Admin@123";

try {
  const [existing] = await pool.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  if (existing.length) {
    console.log("Admin already exists.");
  } else {
    const passwordHash = await hashPassword(password);

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES (?, ?, ?, 'ADMIN', 'ACTIVE')`,
      ["Lakshya Admin", email, passwordHash]
    );

    console.log("Admin created:");
    console.log("Email:", email);
    console.log("Password:", password);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
