// Script para probar el inicio de sesión y comprobar el rol del usuario
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://nxfbagnimvvkurhlyhwg.supabase.co'
const supabaseAnonKey = 'sb_publishable_oTa9qfrDZiNnofbgGFirJw_rkpCA_ws'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const testEmail = 'admin@iconsupport.com'
const testPassword = 'iconsupport2026'

async function main() {
  console.log(`🔑 Probando inicio de sesión para: ${testEmail}...`)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })

  if (error) {
    console.error('❌ Error de autenticación:', error.message)
    if (error.message.includes('Email not confirmed')) {
      console.log('\n💡 El correo no está verificado en Supabase.')
      console.log('Por favor, desactiva la opción "Confirm email" en Project Settings -> Authentication -> Providers -> Email de tu panel de Supabase y vuelve a probar.')
    }
  } else {
    console.log('\n✅ ¡Inicio de sesión exitoso!')
    console.log('--------------------------------------------------')
    console.log(`👤 ID de Usuario: ${data.user.id}`)
    console.log(`📧 Email:         ${data.user.email}`)
    
    // Consultar el perfil ahora que estamos autenticados (la RLS nos permitirá ver nuestro propio perfil)
    console.log('🔍 Consultando rol del perfil...')
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileErr) {
      console.error('❌ Error al obtener perfil:', profileErr.message)
    } else {
      console.log(`👑 Rol en base de datos: ${profile.rol}`)
      console.log(`👤 Nombre en perfil:     ${profile.nombre}`)
      console.log('--------------------------------------------------')
      if (profile.rol === 'admin') {
        console.log('🎉 ¡Perfecto! Tienes acceso total de Administrador.')
      } else {
        console.log('⚠️  Atención: No eres admin, tienes el rol:', profile.rol)
      }
    }
  }
}

main()
