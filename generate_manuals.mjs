import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio public/manuals
const manualsDir = path.resolve(__dirname, 'public', 'manuals');

const manuals = [
  { html: 'manual_cliente.html', pdf: 'manual_cliente.pdf' },
  { html: 'manual_tecnico.html', pdf: 'manual_tecnico.pdf' },
  { html: 'manual_administrador.html', pdf: 'manual_administrador.pdf' }
];

async function generatePDFs() {
  console.log('Iniciando generación de PDFs...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const manual of manuals) {
    const htmlPath = path.join(manualsDir, manual.html);
    const pdfPath = path.join(manualsDir, manual.pdf);
    
    console.log(`Renderizando ${manual.html} -> ${manual.pdf}...`);
    const page = await browser.newPage();
    
    // Abrir archivo local
    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
    
    // Imprimir a PDF con formato A4
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      },
      displayHeaderFooter: true,
      footerTemplate: `
        <div style="font-size: 8px; font-family: 'Inter', sans-serif; color: #94a3b8; width: 100%; padding: 0 40px; display: flex; justify-content: space-between;">
          <span>ICON Support — Documentación Oficial</span>
          <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        </div>
      `,
      headerTemplate: '<div></div>'
    });
    
    await page.close();
    console.log(`✅ Creado: ${manual.pdf}`);
  }

  await browser.close();
  console.log('¡Todos los PDFs generados correctamente!');
}

generatePDFs().catch(err => {
  console.error('Error al generar los PDFs:', err);
  process.exit(1);
});
