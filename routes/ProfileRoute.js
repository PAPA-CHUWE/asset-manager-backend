// routes/ProfileRoute.js
import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

dotenv.config();

const router = express.Router();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ----------------- VERIFY TOKEN MIDDLEWARE -----------------
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ----------------- GET PROFILE -----------------
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user from 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, role, department')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch profile from 'profiles' table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(500).json({ success: false, message: profileError.message });
    }

    res.json({
      success: true,
      user: {
        ...userData,
        full_name: profileData?.full_name || `${userData.first_name} ${userData.last_name}`,
      },
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
