// Script para ejecutar el schema SQL en Supabase via PostgreSQL pooler (IPv4)
// Uso: node run-schema.cjs [password]

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const password = process.argv[2] || 'iconsupport2026'
const projectId = 'nxfbagnimvvkurhlyhwg'

// Usar el pooler de Supabase en São Paulo (sa-east-1) que soporta IPv4
const client = new Client({
  host: `aws-0-sa-east-1.pooler.supabase.com`,
  port: 6543,
  database: 'postgres',
  user: `postgres.${projectId}`,
  password: password,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  console.log('🔌 Conectando a Supabase PostgreSQL Pooler...')
  
  try {
    await client.connect()
    console.log('✅ Conexión exitosa!\n')

    const schemaPath = path.join(__dirname, 'supabase', 'schema.sql')
    const sql = fs.readFileSync(schemaPath, 'utf8')

    console.log('📦 Ejecutando schema SQL...')
    await client.query(sql)
    
    console.log('✅ ¡Schema ejecutado exitosamente!')
    console.log('\n📋 Tablas creadas/verificadas en la base de datos:');
    
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
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
