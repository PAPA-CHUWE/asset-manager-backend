import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const router = express.Router();

// Middleware to extract user from JWT (example)
router.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Missing Authorization header" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

// GET all assets
router.get("/", async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = supabase.from("assets").select("*");

    if (role !== "admin") {
      // Users only see their own assets
      query = query.eq("created_by", id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, assets: data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create new asset
router.post("/", async (req, res) => {
  try {
    const { name, category_id, date_purchased, cost, department_id } = req.body;
    const { id } = req.user;

    const { data, error } = await supabase
      .from("assets")
      .insert([{ name, category_id, date_purchased, cost, department_id, created_by: id }]);

    if (error) throw error;

    res.json({ success: true, asset: data[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update asset (Admin only)
router.put("/:id", async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "admin") return res.status(403).json({ message: "Forbidden" });

    const { id } = req.params;
    const { name, category_id, date_purchased, cost, department_id } = req.body;

    const { data, error } = await supabase
      .from("assets")
      .update({ name, category_id, date_purchased, cost, department_id })
      .eq("id", id);

    if (error) throw error;

    res.json({ success: true, asset: data[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE asset (Admin only)
router.delete("/:id", async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "admin") return res.status(403).json({ message: "Forbidden" });

    const { id } = req.params;
    const { error } = await supabase.from("assets").delete().eq("id", id);

    if (error) throw error;

    res.json({ success: true, message: "Asset deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
