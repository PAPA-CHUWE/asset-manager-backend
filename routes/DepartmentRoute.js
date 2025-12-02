// routes/DepartmentRoute.js
import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const router = express.Router();

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
    req.user = decoded;
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
    return res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }
  next();
};

/* -----------------------------------------
   GET ALL DEPARTMENTS
----------------------------------------- */
router.get("/list/all", verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from("departments").select("*");
    if (error) throw error;

    res.json({ success: true, departments: data });
  } catch (err) {
    console.error("❌ Error fetching departments:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------
   GET DEPARTMENT BY ID
----------------------------------------- */
router.get("/list/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from("departments").select("*").eq("id", id);
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ success: false, message: "Department not found" });

    res.json({ success: true, department: data[0] });
  } catch (err) {
    console.error("❌ Error fetching department:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------
   CREATE NEW DEPARTMENT (ADMIN ONLY)
----------------------------------------- */
router.post("/create", verifyToken, adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;

    const { data, error } = await supabase
      .from("departments")
      .insert([{ name, description }])
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(500).json({ success: false, message: "Failed to create department" });

    res.status(201).json({ success: true, department: data[0] });
  } catch (err) {
    console.error("❌ Error creating department:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------
   UPDATE DEPARTMENT (ADMIN ONLY)
----------------------------------------- */
router.put("/update/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const { data, error } = await supabase
      .from("departments")
      .update({ name, description })
      .eq("id", id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ success: false, message: "Department not found" });

    res.json({ success: true, department: data[0] });
  } catch (err) {
    console.error("❌ Error updating department:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------
   DELETE DEPARTMENT (ADMIN ONLY)
----------------------------------------- */
router.delete("/delete/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) throw error;

    res.json({ success: true, message: "Department deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting department:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
