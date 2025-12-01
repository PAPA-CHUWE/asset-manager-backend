import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const router = express.Router();

// GET all categories
router.get("/", async (req, res) => {
  const { data, error } = await supabase.from("asset_categories").select("*");
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, categories: data });
});

// POST new category
router.post("/", async (req, res) => {
  const { name, description } = req.body;
  const { data, error } = await supabase.from("asset_categories").insert([{ name, description }]);
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, category: data[0] });
});

// PUT update category
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const { data, error } = await supabase.from("asset_categories").update({ name, description }).eq("id", id);
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, category: data[0] });
});

// DELETE category
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("asset_categories").delete().eq("id", id);
  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, message: "Category deleted successfully" });
});

export default router;
