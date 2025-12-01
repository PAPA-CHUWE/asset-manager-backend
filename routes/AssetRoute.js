// routes/AssetRoute.js
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
   GET ALL ASSETS
----------------------------------------- */
router.get("/", verifyToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = supabase.from("assets").select("*");

    if (role !== "admin") {
      query = query.eq("created_by", id); // Users see only their own assets
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, assets: data });
  } catch (err) {
    console.error("❌ Error fetching assets:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------
   CREATE NEW ASSET
----------------------------------------- */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, category_id, date_purchased, cost, department_id } = req.body;
    const { id } = req.user;

    const { data, error } = await supabase.from("assets").insert([
      { name, category_id, date_purchased, cost, department_id, created_by: id }
    ]);

    if (error) throw error;

    res.status(201).json({ success: true, asset: data[0] });
  } catch (err) {
    console.error("❌ Error creating asset:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------
   UPDATE ASSET (ADMIN ONLY)
----------------------------------------- */
router.put("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, date_purchased, cost, department_id } = req.body;

    const { data, error } = await supabase
      .from("assets")
      .update({ name, category_id, date_purchased, cost, department_id })
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true, asset: data[0] });
  } catch (err) {
    console.error("❌ Error updating asset:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------
   DELETE ASSET (ADMIN ONLY)
----------------------------------------- */
router.delete("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) throw error;

    res.json({ success: true, message: "Asset deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting asset:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
