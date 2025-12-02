// routes/AdminStatsRoute.js
import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/* -----------------------------------------------------
   VERIFY TOKEN
----------------------------------------------------- */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Missing token" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

/* -----------------------------------------------------
   MUST BE ADMIN
----------------------------------------------------- */
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admins only" });
  }
  next();
};

/* -----------------------------------------------------
   ADMIN DASHBOARD STATS
----------------------------------------------------- */
router.get("/stats", verifyToken, adminOnly, async (req, res) => {
  try {
    // Running all queries in parallel (fastest)
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalAssets,
      departments,
      categories,
      assetsPerDept,
      assetsPerCategory,
      recentAssets
    ] = await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("users").select("*").eq("status", "active"),
      supabase.from("users").select("*").eq("status", "inactive"),

      supabase.from("assets").select("*"),

      supabase.from("departments").select("*"),
      supabase.from("asset_categories").select("*"),

      supabase
        .from("assets")
        .select("id, department_id, departments(name)")
        .order("department_id"),

      supabase
        .from("assets")
        .select("id, category_id, asset_categories(name)")
        .order("category_id"),

      supabase
        .from("assets")
        .select("*")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
    ]);

    return res.json({
      success: true,
      stats: {
        total_users: totalUsers.data?.length || 0,
        active_users: activeUsers.data?.length || 0,
        inactive_users: inactiveUsers.data?.length || 0,

        total_assets: totalAssets.data?.length || 0,
        total_departments: departments.data?.length || 0,
        total_categories: categories.data?.length || 0,

        assets_per_department: assetsPerDept.data || [],
        assets_per_category: assetsPerCategory.data || [],
        recent_assets: recentAssets.data || []
      }
    });
  } catch (err) {
    console.error("❌ Error fetching admin stats:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard stats"
    });
  }
});

export default router;
