// Script temporal para ejecutar el schema SQL en Supabase via PostgreSQL directo
// Uso: node run-schema.js [password]

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const password = process.argv[2] || 'iconsupport2026'
const projectId = 'nxfbagnimvvkurhlyhwg'

const client = new Client({
  host: `db.${projectId}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: password,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  console.log('🔌 Conectando a Supabase PostgreSQL...')
  
  try {
    await client.connect()
    console.log('✅ Conexión exitosa!\n')

    const schemaPath = path.join(__dirname, 'supabase', 'schema.sql')
    const sql = fs.readFileSync(schemaPath, 'utf8')

    // Dividir el SQL en statements para ejecutarlos uno a uno
    // Excluimos los bloques DO $$ ... $$ que contienen funciones
    console.log('📦 Ejecutando schema SQL...')
    
    await client.query(sql)
    
    console.log('✅ ¡Schema ejecutado exitosamente!')
    console.log('\n📋 Tablas creadas:')
    
    const result = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `)
    
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.tablename}`)
    })

    console.log('\n🎉 Base de datos de ICON Support lista!')
    
  } catch (err) {
    console.error('❌ Error:', err.message)
    if (err.message.includes('password authentication failed')) {
      console.error('\n💡 La contraseña es incorrecta. Pasa la contraseña como argumento:')
      console.error('   node run-schema.js TU_PASSWORD_AQUI')
    }
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
