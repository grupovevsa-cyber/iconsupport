// Script para verificar si el usuario admin ya está registrado y activo
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://nxfbagnimvvkurhlyhwg.supabase.co'
const supabaseAnonKey = 'sb_publishable_oTa9qfrDZiNnofbgGFirJw_rkpCA_ws'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  console.log('🔍 Buscando perfil de admin@iconsupport.com en la base de datos...')
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'admin@iconsupport.com')

  if (error) {
    console.error('❌ Error:', error.message)
  } else if (!profiles || profiles.length === 0) {
    console.log('❌ No se encontró ningún perfil con el correo admin@iconsupport.com.')
  } else {
    const profile = profiles[0]
    console.log('\n✅ ¡Usuario Administrador Encontrado!')
    console.log('--------------------------------------------------')
    console.log(`👤 Nombre: ${profile.nombre}`)
    console.log(`📧 Email:  ${profile.email}`)
    console.log(`👑 Rol:    ${profile.rol}`)
    console.log('--------------------------------------------------')
    
    if (profile.rol === 'admin') {
      console.log('🎉 ¡El rol de administrador está correctamente asignado!')
    } else {
      console.log('⚠️  El usuario existe pero tiene el rol:', profile.rol)
    }
  }
}

main()
