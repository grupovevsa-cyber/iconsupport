import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nxfbagnimvvkurhlyhwg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_oTa9qfrDZiNnofbgGFirJw_rkpCA_ws';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  console.log('Intentando hacer login con ceo@grupovev.com...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'ceo@grupovev.com',
    password: 'Panama2026@'
  });

  if (error) {
    console.error('Error en login:', JSON.stringify(error, null, 2));
    
    // Si falla porque no existe (Invalid login credentials), intentamos crearlo de nuevo
    console.log('Intentando signUp...');
    const signUpRes = await supabase.auth.signUp({
      email: 'ceo@grupovev.com',
      password: 'Panama2026@',
      options: {
        data: {
          nombre: 'CEO Grupo VEV',
          rol: 'superadmin'
        }
      }
    });
    
    if (signUpRes.error) {
      console.error('Error signUp:', JSON.stringify(signUpRes.error, null, 2));
    } else {
      console.log('SignUp exitoso:', signUpRes.data);
    }
  } else {
    console.log('Login exitoso! El usuario ya existe.');
    console.log('User ID:', data.user.id);
  }
}

checkUser();
