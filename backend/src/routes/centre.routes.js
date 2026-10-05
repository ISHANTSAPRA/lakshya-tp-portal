import { Router } from "express";
import { pool } from "../config/db.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, authorize("CENTRE"));

router.get("/me", async (req, res) => {
  const [rows] = await pool.query(`
    SELECT c.id, c.name, c.code, c.address, c.contact_person,
           c.phone, c.email, c.status,
           tp.id AS training_partner_id, tp.name AS training_partner_name
    FROM training_centres c
    JOIN training_partners tp ON tp.id = c.training_partner_id
    WHERE c.id = ? AND c.training_partner_id = ?
  `, [req.user.centreId, req.user.trainingPartnerId]);

  if (!rows.length) {
    return res.status(404).json({ message: "Centre not found" });
  }

  res.json({ centre: rows[0] });
});

router.get("/courses", async (req, res) => {
  const [rows] = await pool.query(`
    SELECT co.id, co.name, co.fee, co.status, cc.assigned_at
    FROM centre_courses cc
    JOIN courses co ON co.id = cc.course_id
    JOIN training_centres c ON c.id = cc.centre_id
    WHERE cc.centre_id = ?
      AND c.training_partner_id = ?
      AND co.status = 'ACTIVE'
    ORDER BY co.name
  `, [req.user.centreId, req.user.trainingPartnerId]);

  res.json({ courses: rows });
});

export default router;
