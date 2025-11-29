// routes/UserRoute.js
import express from "express";
import postgres from "postgres";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

dotenv.config();

const router = express.Router();

// DB Connection
const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
});

/* -----------------------------------------
   VERIFY TOKEN MIDDLEWARE
----------------------------------------- */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user from token
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

/* -----------------------------------------
   ADMIN ONLY MIDDLEWARE
----------------------------------------- */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Access denied. Admins only." });
  }
  next();
};

/* -----------------------------------------
   CREATE USER (ADMIN ONLY)
----------------------------------------- */
router.post("/create", verifyToken, adminOnly, async (req, res) => {
    try {
      const { first_name, last_name, email, role, department, password } = req.body;
  
      if (!first_name || !last_name || !email || !role || !department || !password) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }
  
      // 1️⃣ Check if email exists
      const exists = await sql`
        SELECT * FROM auth.users WHERE email = ${email}
      `;
  
      if (exists.length > 0) {
        return res.status(400).json({
          success: false,
          message: "A user with this email already exists",
        });
      }
  
      // 2️⃣ Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // 3️⃣ Insert into auth.users
      const [authUser] = await sql`
        INSERT INTO auth.users (email, password)
        VALUES (${email}, ${hashedPassword})
        RETURNING id
      `;
  
      const userId = authUser.id;
  
      // 4️⃣ Insert into public.users
      await sql`
        INSERT INTO public.users (id, first_name, last_name, email, role, department)
        VALUES (${userId}, ${first_name}, ${last_name}, ${email}, ${role}, ${department})
      `;
  
      // 5️⃣ Insert into public.profiles
      await sql`
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (${userId}, ${first_name + " " + last_name}, ${role})
      `;
  
      res.status(201).json({
        success: true,
        message: "User created successfully",
        userId,
      });
    } catch (error) {
      console.error("❌ Error creating user:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  });
/* -----------------------------------------
   LIST ALL USERS (ADMIN ONLY)
----------------------------------------- */
router.get("/list", verifyToken, adminOnly, async (req, res) => {
  try {
    const users = await sql`
      SELECT id, first_name, last_name, email, role, department, created_at
      FROM public.users
      ORDER BY created_at DESC;
    `;

    res.json({ success: true, users });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* -----------------------------------------
   DELETE USER (ADMIN ONLY)
----------------------------------------- */
router.delete("/delete/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete from public tables first due to FK constraints
    await sql`DELETE FROM public.profiles WHERE id = ${id}`;
    await sql`DELETE FROM public.users WHERE id = ${id}`;

    // Then delete from auth.users
    await sql`DELETE FROM auth.users WHERE id = ${id}`;

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* -----------------------------------------
   GET SINGLE USER (ADMIN ONLY)
----------------------------------------- */
router.get("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const users = await sql`
      SELECT id, first_name, last_name, email, role, department
      FROM public.users
      WHERE id = ${id}
      LIMIT 1
    `;

    if (users.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
