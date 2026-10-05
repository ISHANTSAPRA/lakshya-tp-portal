import { Router } from "express";
import { pool } from "../config/db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { hashPassword } from "../utils/auth.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));

router.post("/training-partners", async (req, res) => {
  const {
    companyName, pan, gst, contactPerson, email, phone, address,
    hoName, hoEmail, hoPassword
  } = req.body;

  if (!companyName || !pan || !contactPerson || !email || !phone ||
      !address || !hoName || !hoEmail || !hoPassword) {
    return res.status(400).json({ message: "All required fields must be provided" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [tpResult] = await connection.query(
      `INSERT INTO training_partners
       (name, pan, gst, contact_person, email, phone, address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [companyName, pan, gst || null, contactPerson, email, phone, address]
    );

    const passwordHash = await hashPassword(hoPassword);

    await connection.query(
      `INSERT INTO users
       (training_partner_id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, 'HO')`,
      [tpResult.insertId, hoName, hoEmail, passwordHash]
    );

    await connection.commit();

    res.status(201).json({
      message: "Training Partner and HO account created",
      trainingPartnerId: tpResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "PAN, TP email or HO email already exists" });
    }

    res.status(500).json({ message: "Failed to create Training Partner" });
  } finally {
    connection.release();
  }
});

router.get("/training-partners", async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT tp.id, tp.name, tp.pan, tp.gst, tp.contact_person,
           tp.email, tp.phone, tp.address, tp.status, tp.created_at,
           u.name AS ho_name, u.email AS ho_email, u.status AS ho_status
    FROM training_partners tp
    LEFT JOIN users u
      ON u.training_partner_id = tp.id AND u.role = 'HO'
    ORDER BY tp.id DESC
  `);

  res.json({ trainingPartners: rows });
});

router.patch("/training-partners/:id/status", async (req, res) => {
  const { status } = req.body;

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return res.status(400).json({ message: "Status must be ACTIVE or INACTIVE" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      "UPDATE training_partners SET status = ? WHERE id = ?",
      [status, req.params.id]
    );

    if (!result.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ message: "Training Partner not found" });
    }

    await connection.query(
      `UPDATE users SET status = ?
       WHERE training_partner_id = ? AND role = 'HO'`,
      [status, req.params.id]
    );

    await connection.commit();
    res.json({ message: `Training Partner ${status.toLowerCase()}` });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Failed to update status" });
  } finally {
    connection.release();
  }
});

export default router;
