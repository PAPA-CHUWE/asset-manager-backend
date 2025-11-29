// utils/GenerateAdmin.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function createAdminUsers() {
  const admins = [
    {
      email: 'admin1@example.com',
      password: 'Admin123!',
      first_name: 'Admin',
      last_name: 'One',
      role: 'admin',
      department: 'IT'
    },
    {
      email: 'admin2@example.com',
      password: 'Admin123!',
      first_name: 'Admin',
      last_name: 'Two',
      role: 'admin',
      department: 'Finance'
    }
  ];

  for (const admin of admins) {
    // 1️⃣ Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      email_confirm: true
    });

    if (authError) {
      console.error(`Error creating auth user ${admin.email}:`, authError);
      continue;
    }

    const userId = authUser.user.id;
    const fullName = `${admin.first_name} ${admin.last_name}`;

    // 2️⃣ Insert into users table
    const { error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          first_name: admin.first_name,
          last_name: admin.last_name,
          email: admin.email,
          role: admin.role,
          department: admin.department
        }
      ]);

    if (userError) {
      console.error(`Error inserting into users table for ${admin.email}:`, userError);
      continue;
    }

    // 3️⃣ Insert into profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          full_name: fullName,
          role: admin.role
        }
      ]);

    if (profileError) {
      console.error(`Error inserting into profiles table for ${admin.email}:`, profileError);
    } else {
      console.log(`Admin created successfully: ${admin.email}`);
    }
  }
}
