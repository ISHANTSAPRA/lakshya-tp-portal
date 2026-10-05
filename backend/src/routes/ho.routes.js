import { Router } from "express";
import { pool } from "../config/db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { hashPassword } from "../utils/auth.js";

const router = Router();

router.use(authenticate, authorize("HO"));

router.get("/centres", async (req, res) => {
  const [rows] = await pool.query(`
    SELECT c.*,
           COUNT(u.id) AS user_count
    FROM training_centres c
    LEFT JOIN users u ON u.centre_id = c.id AND u.role = 'CENTRE'
    WHERE c.training_partner_id = ?
    GROUP BY c.id
    ORDER BY c.id DESC
  `, [req.user.trainingPartnerId]);

  res.json({ centres: rows });
});

router.post("/centres", async (req, res) => {
  const { name, code, address, contactPerson, phone, email, userName, userEmail, userPassword } = req.body;

  if (!name || !code || !address || !contactPerson || !phone ||
      !userName || !userEmail || !userPassword) {
    return res.status(400).json({ message: "Centre and centre-user fields are required" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [centreResult] = await connection.query(
      `INSERT INTO training_centres
       (training_partner_id, name, code, address, contact_person, phone, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.trainingPartnerId, name, code, address,
        contactPerson, phone, email || null
      ]
    );

    const passwordHash = await hashPassword(userPassword);

    await connection.query(
      `INSERT INTO users
       (training_partner_id, centre_id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'CENTRE')`,
      [
        req.user.trainingPartnerId, centreResult.insertId,
        userName, userEmail, passwordHash
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: "Training Centre and centre login created",
      centreId: centreResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Centre code or user email already exists" });
    }

    res.status(500).json({ message: "Failed to create centre" });
  } finally {
    connection.release();
  }
});

router.patch("/centres/:id/status", async (req, res) => {
  const { status } = req.body;

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return res.status(400).json({ message: "Status must be ACTIVE or INACTIVE" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE training_centres
       SET status = ?
       WHERE id = ? AND training_partner_id = ?`,
      [status, req.params.id, req.user.trainingPartnerId]
    );

    if (!result.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ message: "Centre not found" });
    }

    await connection.query(
      `UPDATE users
       SET status = ?
       WHERE centre_id = ? AND training_partner_id = ? AND role = 'CENTRE'`,
      [status, req.params.id, req.user.trainingPartnerId]
    );

    await connection.commit();
    res.json({ message: `Centre ${status.toLowerCase()}` });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Failed to update centre status" });
  } finally {
    connection.release();
  }
});

router.post("/centres/:id/users", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  const [centres] = await pool.query(
    `SELECT id FROM training_centres
     WHERE id = ? AND training_partner_id = ?`,
    [req.params.id, req.user.trainingPartnerId]
  );

  if (!centres.length) {
    return res.status(404).json({ message: "Centre not found" });
  }

  try {
    const passwordHash = await hashPassword(password);

    await pool.query(
      `INSERT INTO users
       (training_partner_id, centre_id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'CENTRE')`,
      [req.user.trainingPartnerId, req.params.id, name, email, passwordHash]
    );

    res.status(201).json({ message: "Centre user created" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already exists" });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to create centre user" });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  const { status } = req.body;

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return res.status(400).json({ message: "Status must be ACTIVE or INACTIVE" });
  }

  const [result] = await pool.query(
    `UPDATE users
     SET status = ?
     WHERE id = ? AND training_partner_id = ? AND role = 'CENTRE'`,
    [status, req.params.id, req.user.trainingPartnerId]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ message: "Centre user not found" });
  }

  res.json({ message: `Centre user ${status.toLowerCase()}` });
});

router.post("/courses", async (req, res) => {
  const { name, fee } = req.body;

  if (!name || fee === undefined || Number(fee) < 0) {
    return res.status(400).json({ message: "Course name and valid fee are required" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO courses (training_partner_id, name, fee)
       VALUES (?, ?, ?)`,
      [req.user.trainingPartnerId, name, Number(fee)]
    );

    res.status(201).json({ message: "Course created", courseId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create course" });
  }
});

router.get("/courses", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM courses
     WHERE training_partner_id = ?
     ORDER BY id DESC`,
    [req.user.trainingPartnerId]
  );

  res.json({ courses: rows });
});

router.post("/centres/:centreId/courses/:courseId", async (req, res) => {
  const [centres] = await pool.query(
    `SELECT id FROM training_centres
     WHERE id = ? AND training_partner_id = ?`,
    [req.params.centreId, req.user.trainingPartnerId]
  );

  const [courses] = await pool.query(
    `SELECT id FROM courses
     WHERE id = ? AND training_partner_id = ?`,
    [req.params.courseId, req.user.trainingPartnerId]
  );

  if (!centres.length || !courses.length) {
    return res.status(404).json({ message: "Centre or course not found" });
  }

  try {
    await pool.query(
      `INSERT INTO centre_courses (centre_id, course_id)
       VALUES (?, ?)`,
      [req.params.centreId, req.params.courseId]
    );

    res.status(201).json({ message: "Course mapped to centre" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Course already mapped" });
    }
    console.error(error);
    res.status(500).json({ message: "Failed to map course" });
  }
});

router.delete("/centres/:centreId/courses/:courseId", async (req, res) => {
  const [result] = await pool.query(
    `DELETE cc FROM centre_courses cc
     INNER JOIN training_centres c ON c.id = cc.centre_id
     INNER JOIN courses co ON co.id = cc.course_id
     WHERE cc.centre_id = ?
       AND cc.course_id = ?
       AND c.training_partner_id = ?
       AND co.training_partner_id = ?`,
    [
      req.params.centreId,
      req.params.courseId,
      req.user.trainingPartnerId,
      req.user.trainingPartnerId
    ]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ message: "Mapping not found" });
  }

  res.json({ message: "Course unmapped" });
});

export default router;
