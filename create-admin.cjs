// Script para crear y activar un usuario Administrador en Supabase
const { createClient } = require('@supabase/supabase-js')
const { Client } = require('pg')

const supabaseUrl = 'https://nxfbagnimvvkurhlyhwg.supabase.co'
const supabaseAnonKey = 'sb_publishable_oTa9qfrDZiNnofbgGFirJw_rkpCA_ws'
const dbPassword = 'iconsupport2026'
const projectId = 'nxfbagnimvvkurhlyhwg'

const adminEmail = 'admin@iconsupport.com'
const adminPassword = 'iconsupport2026'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  console.log(`👤 Intentando registrar usuario: ${adminEmail}...`)
  
  try {
    // 1. Intentar registrar vía API Auth de Supabase
    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          nombre: 'Administrador Principal',
          rol: 'admin'
        }
      }
    })

    if (error && error.message !== 'User already registered') {
      throw error
    }
    
    if (error && error.message === 'User already registered') {
      console.log('ℹ️ El usuario ya estaba registrado en Auth, procediendo a forzar activación y rol admin...')
    } else {
      console.log('✅ Registro inicial completado en Auth!')
    }

    // 2. Conectar a PostgreSQL para forzar confirmación de email y rol de admin
    console.log('🔌 Conectando a la base de datos PostgreSQL para activar la cuenta...')
    
    const dbClient = new Client({
      host: `aws-0-sa-east-1.pooler.supabase.com`,
      port: 6543,
      database: 'postgres',
      user: `postgres.${projectId}`,
      password: dbPassword,
      ssl: { rejectUnauthorized: false },
    })

    await dbClient.connect()
    
    // Forzar confirmación de correo en la tabla auth.users
    console.log('⚡ Confirmando correo del administrador...')
    await dbClient.query(`
      UPDATE auth.users 
      SET email_confirmed_at = NOW(), 
          confirmed_at = NOW(),
          last_sign_in_at = NOW(),
          raw_user_meta_data = '{"nombre": "Administrador Principal", "rol": "admin"}'::jsonb
      WHERE email = $1
    `, [adminEmail])

    // Asegurar que el perfil en public.profiles tiene el rol de admin
    console.log('👑 Otorgando privilegios de Administrador...')
    
    // Primero verificar si el trigger lo insertó, si no, lo insertamos manualmente
    const checkProfile = await dbClient.query('SELECT id FROM public.profiles WHERE email = $1', [adminEmail])
    
    if (checkProfile.rows.length === 0) {
      const userResult = await dbClient.query('SELECT id FROM auth.users WHERE email = $1', [adminEmail])
      const userId = userResult.rows[0].id
      await dbClient.query(`
        INSERT INTO public.profiles (id, nombre, email, rol)
        VALUES ($1, $2, $3, 'admin')
      `, [userId, 'Administrador Principal', adminEmail])
    } else {
      await dbClient.query(`
        UPDATE public.profiles 
        SET rol = 'admin', nombre = 'Administrador Principal'
        WHERE email = $1
      `, [adminEmail])
    }

    console.log('\n🎉 ¡Cuenta de Administrador creada y activada con éxito!')
    console.log('--------------------------------------------------')
    console.log(`📧 Email:    ${adminEmail}`)
    console.log(`🔑 Password: ${adminPassword}`)
    console.log('--------------------------------------------------')
    console.log('Ya puedes iniciar sesión en tu app local localmente.')

    await dbClient.end()

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

main()
