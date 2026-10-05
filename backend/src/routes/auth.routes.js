import { Router } from "express";
import { pool } from "../config/db.js";
import { comparePassword, createToken } from "../utils/auth.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, role, status,
              training_partner_id, centre_id
       FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "User is inactive" });
    }

    if (user.role !== "ADMIN") {
      if (user.role === "HO") {
        const [tp] = await pool.query(
          "SELECT status FROM training_partners WHERE id = ?",
          [user.training_partner_id]
        );
        if (!tp.length || tp[0].status !== "ACTIVE") {
          return res.status(403).json({ message: "Training Partner is inactive" });
        }
      }

      if (user.role === "CENTRE") {
        const [centre] = await pool.query(
          "SELECT status FROM training_centres WHERE id = ?",
          [user.centre_id]
        );
        if (!centre.length || centre[0].status !== "ACTIVE") {
          return res.status(403).json({ message: "Training Centre is inactive" });
        }
      }
    }

    const valid = await comparePassword(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = createToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        trainingPartnerId: user.training_partner_id,
        centreId: user.centre_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed" });
  }
});

router.get("/me", authenticate, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, status, training_partner_id, centre_id
     FROM users WHERE id = ?`,
    [req.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ user: rows[0] });
});

export default router;
