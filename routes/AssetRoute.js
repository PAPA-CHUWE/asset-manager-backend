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
   Optional: include category_name & department_name
----------------------------------------- */

router.get("/list/all", verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("assets")
      .select(`
        id,
        name,
        category_id,
        department_id,
        date_purchased,
        cost,
        created_by,
        created_at,
        asset_categories!inner(name),
        departments!inner(name)
      `);

    if (error) throw error;

    // Map joined data to frontend-friendly keys
    const assets = data.map(a => ({
      id: a.id,
      name: a.name,
      category_id: a.category_id,
      category_name: a.asset_categories?.name || 'Unknown',
      department_id: a.department_id,
      department_name: a.departments?.name || 'Unknown',
      date_purchased: a.date_purchased,
      cost: a.cost,
      created_by: a.created_by,
      created_by_name: a.created_by, // Optional: join with users table if needed
      created_at: a.created_at
    }));

    res.json({ success: true, assets });
  } catch (err) {
    console.error("❌ Error fetching assets:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


/* -----------------------------------------
   GET ASSET BY ID
----------------------------------------- */
router.get("/list/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from("assets").select("*").eq("id", id);

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ success: false, message: "Asset not found" });

    res.json({ success: true, asset: data[0] });
  } catch (err) {
    console.error("❌ Error fetching asset:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------
   CREATE NEW ASSET (ADMIN ONLY)
----------------------------------------- */
router.post("/create", verifyToken, adminOnly, async (req, res) => {
  try {
    const { name, category_id, department_id, date_purchased, cost } = req.body;

    const { data, error } = await supabase
      .from("assets")
      .insert([{ name, category_id, department_id, date_purchased, cost, created_by: req.user.id }])
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(500).json({ success: false, message: "Failed to create asset" });

    res.status(201).json({ success: true, asset: data[0] });
  } catch (err) {
    console.error("❌ Error creating asset:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------
   UPDATE ASSET (ADMIN ONLY)
----------------------------------------- */
router.put("/update/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, department_id, date_purchased, cost } = req.body;

    const { data, error } = await supabase
      .from("assets")
      .update({ name, category_id, department_id, date_purchased, cost })
      .eq("id", id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ success: false, message: "Asset not found" });

    res.json({ success: true, asset: data[0] });
  } catch (err) {
    console.error("❌ Error updating asset:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------
   DELETE ASSET (ADMIN ONLY)
----------------------------------------- */
router.delete("/delete/:id", verifyToken, adminOnly, async (req, res) => {
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
