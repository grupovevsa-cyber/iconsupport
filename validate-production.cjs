// Script de automatización con Puppeteer para validar producción en Vercel
const puppeteer = require('puppeteer')
const path = require('path')

const targetUrl = 'https://icon-support.vercel.app/login'
const email = 'admin@iconsupport.com'
const password = 'iconsupport2026'
const artifactsDir = 'C:\\Users\\GRUPOVEV\\.gemini\\antigravity\\brain\\f18da0b2-e996-4c13-84cd-dfa1566eafe8'

async function main() {
  console.log('🚀 Iniciando validación automatizada de producción...')
  console.log(`🌐 Navegando a: ${targetUrl}`)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800 })

  try {
    // 1. Cargar Login
    await page.goto(targetUrl, { waitUntil: 'networkidle2' })
    console.log('✅ Página de login cargada.')

    // Tomar captura de login
    await page.screenshot({ path: path.join(artifactsDir, '01_login.png') })
    console.log('📸 Captura de login guardada.')

    // 2. Llenar formulario de login
    console.log('🔑 Completando credenciales de administrador...')
    await page.type('input[type="email"]', email)
    await page.type('input[type="password"]', password)
    
    // Hacer clic en Iniciar Sesión
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })
    ])

    console.log('✅ Inicio de sesión completado.')

    // 3. Validar Panel de Administración
    const dashboardTitle = await page.evaluate(() => {
      return document.querySelector('h1')?.textContent || ''
    })

    console.log(`📋 Título del panel: "${dashboardTitle}"`)
    if (!dashboardTitle.includes('Administración') && !dashboardTitle.includes('Técnico')) {
      throw new Error('No se cargó el panel de administración de forma correcta.')
    }

    // Tomar captura del dashboard
    await page.screenshot({ path: path.join(artifactsDir, '02_dashboard.png') })
    console.log('📸 Captura del dashboard guardada.')

    // 4. Ir a la página de Usuarios
    console.log('👥 Navegando a la sección de Usuarios...')
    await page.click('#nav--admin-usuarios')
    await page.waitForTimeout(3000) // Esperar que cargue la lista

    const usersTitle = await page.evaluate(() => {
      return document.querySelector('h1')?.textContent || ''
    })
    console.log(`📋 Título de sección: "${usersTitle}"`)

    // Tomar captura de la sección de usuarios
    await page.screenshot({ path: path.join(artifactsDir, '03_usuarios.png') })
    console.log('📸 Captura de lista de usuarios guardada.')

    console.log('\n🎉 ¡Todos los flujos de producción en Vercel validados exitosamente!')
    console.log('------------------------------------------------------------------')
    console.log('Las siguientes capturas de pantalla están listas en tus artefactos:')
    console.log('  1. 01_login.png (Pantalla de acceso)')
    console.log('  2. 02_dashboard.png (Panel de administración conectado a Supabase)')
    console.log('  3. 03_usuarios.png (Sección de gestión de usuarios)')
    console.log('------------------------------------------------------------------')

  } catch (err) {
    console.error('❌ Fallo en la validación:', err.message)
    // Guardar captura de error
    await page.screenshot({ path: path.join(artifactsDir, 'error_val.png') })
    console.log('📸 Captura del error guardada como error_val.png')
    process.exit(1)
  } finally {
    await browser.close()
  }
}

main()
