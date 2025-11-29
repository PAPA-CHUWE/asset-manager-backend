// routes/UserRoute.js
import express from "express";
import postgres from "postgres";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

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
      const { first_name, last_name, email,phone, role, department, password } = req.body;
  
      if (!first_name || !last_name || !email || !role || !department || !password) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }
  
      // 1️⃣ Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
  
      if (authError) return res.status(400).json({ success: false, message: authError.message });
  
      const userId = authUser.user.id;
      const fullName = `${first_name} ${last_name}`;
  
      // 2️⃣ Insert into users table
      const { error: userError } = await supabase.from("users").insert([
        {
          id: userId,
          first_name,
          last_name,
          email,
          phone,
          role,
          department
        }
      ]);
      if (userError) return res.status(400).json({ success: false, message: userError.message });
  
      // 3️⃣ Insert into profiles table
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: userId,
          full_name: fullName,
          role
        }
      ]);
      if (profileError) return res.status(400).json({ success: false, message: profileError.message });
  
      res.status(201).json({ success: true, message: "User created successfully", userId });
    } catch (err) {
      console.error("❌ Error creating user:", err);
      res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
  });
/* -----------------------------------------
   LIST ALL USERS (ADMIN ONLY)
----------------------------------------- */
router.get("/list", verifyToken, adminOnly, async (req, res) => {
  try {
    const users = await sql`
      SELECT id, first_name, last_name, email,phone, role, department, created_at
      FROM public.users
      ORDER BY created_at DESC;
    `;

    res.json({ success: true, users });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});


router.get("/list-user/:id", verifyToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const users = await sql`
        SELECT id, first_name, last_name, email, phone, role, department
        FROM public.users
        WHERE id = ${id}
        LIMIT 1
      `;
      if (users.length === 0) return res.status(404).json({ success: false, message: "User not found" });
      res.json({ success: true, user: users[0] });
    } catch (err) {
      console.error("❌ Error fetching user:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });
  
  /* -----------------------------------------
     UPDATE USER (PUT /admin/users/:id)
  ----------------------------------------- */
  router.put("/update/:id", verifyToken, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { first_name, last_name, email, phone, role, department } = req.body;
  
      const { error: updateError } = await supabase.from("users").update({ first_name, last_name, email, phone, role, department }).eq("id", id);
      if (updateError) return res.status(400).json({ success: false, message: updateError.message });
  
      const fullName = `${first_name} ${last_name}`;
      const { error: profileError } = await supabase.from("profiles").update({ full_name: fullName, role }).eq("id", id);
      if (profileError) return res.status(400).json({ success: false, message: profileError.message });
  
      res.json({ success: true, message: "User updated successfully" });
    } catch (err) {
      console.error("❌ Error updating user:", err);
      res.status(500).json({ success: false, message: err.message });
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
