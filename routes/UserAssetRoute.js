// routes/UserAssetRoute.js
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
   GET ALL ASSETS FOR USER
----------------------------------------- */
router.get("/list/all", verifyToken, async (req, res) => {
    try {
      // Fetch assets created by this user
      const { data: assetsData, error: assetsError } = await supabase
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
        `)
        .eq("created_by", req.user.id);
  
      if (assetsError) throw assetsError;
  
      // For each asset, fetch creator's full name from profiles
      const assetsWithNames = await Promise.all(
        assetsData.map(async (a) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", a.created_by)
            .single();
  
          return {
            id: a.id,
            name: a.name,
            category_id: a.category_id,
            category_name: a.asset_categories?.name || "Unknown",
            department_id: a.department_id,
            department_name: a.departments?.name || "Unknown",
            date_purchased: a.date_purchased,
            cost: a.cost,
            created_by: a.created_by,
            created_by_name: profileData?.full_name || "Unknown",
            created_at: a.created_at
          };
        })
      );
  
      res.json({ success: true, assets: assetsWithNames });
    } catch (err) {
      console.error("❌ Error fetching user assets:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });
  

/* -----------------------------------------
   CREATE ASSET (USER)
----------------------------------------- */
router.post("/create", verifyToken, async (req, res) => {
  try {
    const { name, category_id, department_id, date_purchased, cost } = req.body;

    const { data, error } = await supabase
      .from("assets")
      .insert([{
        name,
        category_id,
        department_id,
        date_purchased,
        cost,
        created_by: req.user.id
      }])
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(500).json({ success: false, message: "Failed to create asset" });
    }

    res.status(201).json({ success: true, asset: data[0] });
  } catch (err) {
    console.error("❌ Error creating user asset:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------
   GET ASSET BY ID (USER)
----------------------------------------- */

router.get("/list/:id", verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
  
      // Fetch the asset
      const { data: assetData, error: assetError } = await supabase
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
        `)
        .eq("id", id)
        .single();
  
      if (assetError) throw assetError;
      if (!assetData) return res.status(404).json({ success: false, message: "Asset not found" });
  
      // Ensure the user owns the asset
      if (assetData.created_by !== req.user.id) {
        return res.status(403).json({ success: false, message: "Access denied." });
      }
  
      // Fetch creator's full name
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", assetData.created_by)
        .single();
  
      const assetWithName = {
        id: assetData.id,
        name: assetData.name,
        category_id: assetData.category_id,
        category_name: assetData.asset_categories?.name || "Unknown",
        department_id: assetData.department_id,
        department_name: assetData.departments?.name || "Unknown",
        date_purchased: assetData.date_purchased,
        cost: assetData.cost,
        created_by: assetData.created_by,
        created_by_name: profileData?.full_name || "Unknown",
        created_at: assetData.created_at
      };
  
      res.json({ success: true, asset: assetWithName });
    } catch (err) {
      console.error("❌ Error fetching asset:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });
  

  /* -----------------------------------------
   GET USER ASSET STATS
----------------------------------------- */
router.get("/stats", verifyToken, async (req, res) => {
    try {
      const userId = req.user.id;
  
      // 1️⃣ Total assets created by the user
      const { data: totalAssetsData, error: totalError, count: totalCount } = await supabase
        .from("assets")
        .select("id", { count: "exact" })
        .eq("created_by", userId);
  
      if (totalError) throw totalError;
  
      // 2️⃣ Total cost of all assets
      const { data: costData, error: costError } = await supabase
        .from("assets")
        .select("cost")
        .eq("created_by", userId);
  
      if (costError) throw costError;
  
      const totalCost = costData.reduce((sum, a) => sum + Number(a.cost || 0), 0);
  
      // 3️⃣ Assets by category
      const { data: categoryData, error: catError } = await supabase
        .from("assets")
        .select(`
          category_id,
          asset_categories!inner(name)
        `)
        .eq("created_by", userId);
  
      if (catError) throw catError;
  
      const assetsByCategory = categoryData.reduce((acc, item) => {
        const name = item.asset_categories?.name || "Unknown";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});
  
      // 4️⃣ Assets by department
      const { data: deptData, error: deptError } = await supabase
        .from("assets")
        .select(`
          department_id,
          departments!inner(name)
        `)
        .eq("created_by", userId);
  
      if (deptError) throw deptError;
  
      const assetsByDepartment = deptData.reduce((acc, item) => {
        const name = item.departments?.name || "Unknown";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});
  
      res.json({
        success: true,
        stats: {
          totalAssets: totalCount,
          totalCost,
          assetsByCategory,
          assetsByDepartment
        }
      });
  
    } catch (err) {
      console.error("❌ Error fetching user asset stats:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  });
  

export default router;
