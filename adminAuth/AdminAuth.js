// routes/AuthRoute.js
import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

dotenv.config();

const router = express.Router();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ----------------- LOGIN -----------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password are required' });

  try {
    // 1️⃣ Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return res.status(401).json({ success: false, message: authError.message });

    const userId = authData.user.id;

    // 2️⃣ Fetch user info from your 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(403).json({ success: false, message: 'User not found in users table' });
    }

    // 3️⃣ Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // 4️⃣ Create JWT compatible with verifyToken middleware
    const token = jwt.sign(
      {
        id: userId,
        email: userData.email,
        role: userData.role,
        full_name: profileData?.full_name || '',
        department: userData.department,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // adjust expiry if needed
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: userId,
        email: userData.email,
        role: userData.role,
        full_name: profileData?.full_name || '',
        department: userData.department,
      },
      accessToken: token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------- LOGOUT -----------------
router.post('/logout', async (req, res) => {
  try {
    // Supabase server-side sign out
    const { error } = await supabase.auth.signOut();
    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
