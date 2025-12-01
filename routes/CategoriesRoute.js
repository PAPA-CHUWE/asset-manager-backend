// routes/CategoryRoute.js
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
   GET ALL CATEGORIES
----------------------------------------- */
router.get("/list/all", verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from("asset_categories").select("*");
    if (error) throw error;

    res.json({ success: true, categories: data });
  } catch (err) {
    console.error("❌ Error fetching categories:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get("/list/:id", verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from("asset_categories").select("*").eq("id", id);
      if (error) throw error;
  
      res.json({ success: true, categories: data });
    } catch (err) {
      console.error("❌ Error fetching categories:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });

/* -----------------------------------------
   CREATE NEW CATEGORY (ADMIN ONLY)
----------------------------------------- */
router.post("/create", verifyToken, adminOnly, async (req, res) => {
    try {
      const { name, description } = req.body;
  
      // Insert and return the inserted row
      const { data, error } = await supabase
        .from("asset_categories")
        .insert([{ name, description }])
        .select(); // ✅ ensures data is returned
  
      if (error) throw error;
  
      if (!data || data.length === 0) {
        return res.status(500).json({ success: false, message: "Failed to create category" });
      }
  
      res.status(201).json({ success: true, category: data[0] });
    } catch (err) {
      console.error("❌ Error creating category:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });
  

/* -----------------------------------------
   UPDATE CATEGORY (ADMIN ONLY)
----------------------------------------- */
router.put("/update/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const { data, error } = await supabase.from("asset_categories").update({ name, description }).eq("id", id);
    if (error) throw error;

    res.json({ success: true, category: data[0] });
  } catch (err) {
    console.error("❌ Error updating category:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------
   DELETE CATEGORY (ADMIN ONLY)
----------------------------------------- */
router.delete("/delete/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("asset_categories").delete().eq("id", id);
    if (error) throw error;

    res.json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting category:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
