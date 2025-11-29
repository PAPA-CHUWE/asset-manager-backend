import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const router = express.Router();
router.use(bodyParser.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ----------------- LOGIN -----------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1️⃣ Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return res.status(401).json({ error: authError.message });

    const userId = authData.user.id;

    // 2️⃣ Fetch role from 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(403).json({ error: 'User not found in users table' });
    }

    // 3️⃣ Check if admin
    if (userData.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    // 4️⃣ Optionally fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    res.json({
      message: 'Login successful',
      user: {
        ...authData.user,
        role: userData.role,
        department: userData.department,
        full_name: profileData?.full_name || ''
      },
      session: authData.session
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
