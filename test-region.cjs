// Script to detect correct Supabase region and pooler host
const { Client } = require('pg')

const password = process.argv[2] || 'iconsupport2026'
const projectId = 'nxfbagnimvvkurhlyhwg'
const regions = [
  'sa-east-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ca-central-1'
]

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`
  console.log(`Testing host: ${host}...`)
  
  const client = new Client({
    host: host,
    port: 6543,
    database: 'postgres',
    user: `postgres.${projectId}`,
    password: password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  })

  try {
    await client.connect()
    console.log(`✅ SUCCESS on region ${region}! Host is ${host}`)
    await client.end()
    return host
  } catch (err) {
    console.log(`❌ Failed on region ${region}: ${err.message}`)
    try { await client.end() } catch (_) {}
    return null
  }
}

async function main() {
  for (const region of regions) {
    const host = await testRegion(region)
    if (host) {
      console.log(`\n🎉 Found active pooler host: ${host}`)
      process.exit(0)
    }
  }
  console.log('\n❌ All pooler regions failed.')
  process.exit(1)
}

main()
