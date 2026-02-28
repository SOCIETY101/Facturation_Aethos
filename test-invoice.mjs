import { jsPDF } from 'jspdf'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS = '/Users/aminerb/Desktop/Aethos/Facturation/src/assets'

// === Colors ===
const COLOR_RED = [153, 10, 10]
const COLOR_DARK = [43, 43, 43]
const COLOR_LIGHT_RED = [243, 222, 222]

// === Helpers ===
const formatCurrency = (amount) => {
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(amount)
  return `${formatted.replace(/\u202f|\u00a0/g, ' ')} MAD`
}

const formatDate = (d) => new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric'
}).format(new Date(d))

const loadDataUrl = (filePath) => {
  try {
    const buf = readFileSync(filePath)
    const b64 = buf.toString('base64')
    const ext = path.extname(filePath).slice(1).toUpperCase()
    return `data:image/${ext.toLowerCase()};base64,${b64}`
  } catch { return null }
}

const drawPill = (doc, x, y, w, h, text, fill, textColor, stroke) => {
  if (fill) { doc.setFillColor(...fill); doc.roundedRect(x, y, w, h, h/2, h/2, 'F') }
  if (stroke) { doc.setDrawColor(...stroke); doc.roundedRect(x, y, w, h, h/2, h/2, 'S') }
  doc.setTextColor(...(textColor || COLOR_DARK))
  doc.text(text, x + w/2, y + h/2 + 2.5, { align: 'center' })
}

const drawTable = (doc, startY, items, pageWidth, margin, hasQty = true) => {
  const tableX = margin
  const tableW = pageWidth - margin * 2
  const colDesc = hasQty ? tableW * 0.6 : tableW * 0.75
  const colQty  = hasQty ? tableW * 0.15 : 0
  const colTotal = tableW * 0.25
  const headerH = 8
  let y = startY

  doc.setFillColor(...COLOR_DARK)
  doc.rect(tableX, y, tableW, headerH, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10); doc.setFont('helvetica', 'bold')
  doc.text('DESCRIPTION', tableX + colDesc / 2, y + 5.5, { align: 'center' })
  if (hasQty) doc.text('QTE', tableX + colDesc + colQty / 2, y + 5.5, { align: 'center' })
  doc.text('TOTAL TTC', tableX + colDesc + colQty + colTotal / 2, y + 5.5, { align: 'center' })

  y += headerH
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLOR_DARK)

  items.forEach((item) => {
    const lines = doc.splitTextToSize(item.description, colDesc - 6)
    const rowH = Math.max(10, lines.length * 5 + 4)
    doc.setDrawColor(...COLOR_DARK)
    doc.line(tableX, y, tableX, y + rowH)
    doc.line(tableX + tableW, y, tableX + tableW, y + rowH)
    doc.line(tableX + colDesc, y, tableX + colDesc, y + rowH)
    if (hasQty) doc.line(tableX + colDesc + colQty, y, tableX + colDesc + colQty, y + rowH)
    doc.text(lines, tableX + 3, y + 6)
    if (hasQty && item.quantity != null) doc.text(String(item.quantity), tableX + colDesc + colQty / 2, y + 6, { align: 'center' })
    doc.text(formatCurrency(item.total), tableX + colDesc + colQty + colTotal - 3, y + 6, { align: 'right' })
    y += rowH
  })

  const footerAndTotalsSpace = 130
  const pageHeight = doc.internal.pageSize.getHeight()
  const minimumYFinish = pageHeight - footerAndTotalsSpace
  if (y < minimumYFinish) {
    doc.setDrawColor(...COLOR_DARK)
    doc.line(tableX, y, tableX, minimumYFinish)
    doc.line(tableX + tableW, y, tableX + tableW, minimumYFinish)
    doc.line(tableX + colDesc, y, tableX + colDesc, minimumYFinish)
    if (hasQty) doc.line(tableX + colDesc + colQty, y, tableX + colDesc + colQty, minimumYFinish)
    doc.line(tableX, minimumYFinish, tableX + tableW, minimumYFinish)
    y = minimumYFinish
  } else {
    doc.line(tableX, y, tableX + tableW, y)
  }
  return { y, tableW, tableX }
}

// === Main: Generate Test Invoice ===
const doc = new jsPDF()
const pageWidth = doc.internal.pageSize.getWidth()
const pageHeight = doc.internal.pageSize.getHeight()
const margin = 20

// Logo
const logoDataUrl = loadDataUrl(`${ASSETS}/logonor.png`)
let logoH = 0
if (logoDataUrl) {
  const imgProps = doc.getImageProperties(logoDataUrl)
  const logoMaxWidth = 80
  logoH = (logoMaxWidth * imgProps.height) / imgProps.width
  doc.addImage(logoDataUrl, 'PNG', 20, 10, logoMaxWidth, logoH)
}

// Watermark
const faviconDataUrl = loadDataUrl(`${ASSETS}/faviconaethos.png`)
if (faviconDataUrl) {
  const wm = Math.max(pageWidth, pageHeight) * 1.275
  doc.saveGraphicsState()
  doc.setGState(new doc.GState({ opacity: 0.06, 'fill-opacity': 0.06 }))
  doc.addImage(faviconDataUrl, 'PNG', (pageWidth - wm) / 2, (pageHeight - wm) / 2, wm, wm)
  doc.restoreGraphicsState()
}

// Title row
const titleY = Math.max(10 + logoH + 6, 68)
doc.setFont('helvetica', 'bold')
doc.setFontSize(24)
doc.setTextColor(...COLOR_DARK)
doc.setFillColor(...COLOR_LIGHT_RED)
doc.rect(margin, titleY - 4, 32, 12, 'F')
doc.text('FACTURE', margin + 2, titleY + 4)

doc.setFontSize(10)
drawPill(doc, margin + 38, titleY - 2, 50, 10, 'N°INV-0001', undefined, undefined, COLOR_DARK)
drawPill(doc, pageWidth - margin - 40, titleY - 2, 40, 10, formatDate('2026-02-27'), COLOR_RED, [255, 255, 255])

doc.setDrawColor(120)
doc.line(margin, titleY + 16, pageWidth - margin, titleY + 16)

// Parties
const partiesY = titleY + 26
doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...COLOR_DARK)
doc.text('AETHOS TECH', margin, partiesY)
doc.text('CLIENT EXEMPLE SARL', pageWidth - margin, partiesY, { align: 'right' })

doc.setFont('helvetica', 'normal')
let companyY = partiesY + 6
doc.text('ICE : 003619027000094', margin, companyY); companyY += 5
doc.text('AV AL QODS L IMCOPA LT 2 1ER ETG N 5', margin, companyY); companyY += 5

let clientY = partiesY + 6
doc.text('ICE : ICE123456789', pageWidth - margin, clientY, { align: 'right' }); clientY += 5
doc.text('contact@exemple.ma', pageWidth - margin, clientY, { align: 'right' }); clientY += 5
doc.text('+212 5 22 123 456', pageWidth - margin, clientY, { align: 'right' }); clientY += 5

// Table
const tableStartY = Math.max(companyY, clientY) + 8
const items = [
  { description: 'Développement Application Mobile React Native\nInclut design UI/UX et intégration API', quantity: null, total: 15000 },
  { description: 'Maintenance mensuelle serveur et base de données', quantity: null, total: 3600 },
]
const table = drawTable(doc, tableStartY, items, pageWidth, margin, false)

// Totals
let y = table.y + 10
doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...COLOR_DARK)
doc.text('HT Total :', pageWidth - margin - 45, y, { align: 'right' })
doc.text(formatCurrency(15500), pageWidth - margin, y, { align: 'right' })

y += 10
doc.text('TVA 20% :', pageWidth - margin - 45, y, { align: 'right' })
doc.text(formatCurrency(3100), pageWidth - margin, y, { align: 'right' })

y += 8
doc.setFillColor(...COLOR_DARK)
doc.rect(0, y, pageWidth, 12, 'F')
doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
doc.text('TOTAL TTC :', margin, y + 8)
doc.text(formatCurrency(18600), pageWidth - margin, y + 8, { align: 'right' })

// Payment info
y += 20
doc.setTextColor(...COLOR_DARK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
doc.text('INTITULÉ DU COMPTE : AETHOS TECH', margin, y); y += 7
doc.text('RIB : 230 640 6333711221011800 40', margin, y); y += 7
doc.text('IBAN : MA64230640633371122101180040', margin, y); y += 7
doc.text('CODE SWIFT : CIHMMAMC', margin, y)

// Footer
doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...COLOR_DARK)
doc.setDrawColor(160)
doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)
doc.text('STE AETHOS TECH SARL - ICE N°003619027000094 - RC N°156509 - Siège Social :', pageWidth / 2, pageHeight - 12, { align: 'center' })
doc.text('AV AL QODS L IMCOPA LT 2 1ER ETG N 5 AOUAMA , Tanger - Capital Social(Devise) : 100000,00 MAD', pageWidth / 2, pageHeight - 8, { align: 'center' })

const outputPath = '/tmp/test-invoice-output.pdf'
writeFileSync(outputPath, Buffer.from(doc.output('arraybuffer')))
console.log('✅ PDF generated at:', outputPath)
