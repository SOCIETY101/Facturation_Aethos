import jsPDF from 'jspdf'
import { Invoice, Quote, Client, AppSettings } from './types'
import Logo from '@/assets/logonor.png'
import Favicon from '@/assets/faviconaethos.png'

// jsPDF cannot render non-breaking spaces (used by fr-FR locale as thousand separators).
// This formatter replaces them with regular spaces to prevent garbled output.
const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(amount)
  return `${formatted.replace(/\u202f|\u00a0/g, ' ')} MAD`
}

const COLOR_RED: [number, number, number] = [153, 10, 10]
const COLOR_DARK: [number, number, number] = [43, 43, 43]
const COLOR_LIGHT_RED: [number, number, number] = [243, 222, 222]

const formatDateNumeric = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

const loadImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Image load failed'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

const addLogo = async (doc: jsPDF, logoUrl?: string): Promise<number> => {
  const url = logoUrl || Logo
  const dataUrl = await loadImageAsDataUrl(url)
  if (!dataUrl) return 0

  // Measure the real image dimensions to preserve aspect ratio (no stretching)
  const imgProps = doc.getImageProperties(dataUrl)
  const logoMaxWidth = 80   // mm — fixed width, height calculated from ratio
  const logoH = (logoMaxWidth * imgProps.height) / imgProps.width
  doc.addImage(dataUrl, 'PNG', 20, 10, logoMaxWidth, logoH)
  return logoH
}

const addWatermark = async (doc: jsPDF) => {
  const dataUrl = await loadImageAsDataUrl(Favicon)
  if (!dataUrl) return
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const wm = Math.max(pageWidth, pageHeight) * 1.275
  doc.saveGraphicsState()
  // @ts-expect-error – jsPDF GState is available at runtime
  doc.setGState(new doc.GState({ opacity: 0.06, 'fill-opacity': 0.06 }))
  doc.addImage(dataUrl, 'PNG', (pageWidth - wm) / 2, (pageHeight - wm) / 2, wm, wm)
  doc.restoreGraphicsState()
}


const drawPill = (doc: jsPDF, x: number, y: number, w: number, h: number, text: string, fill?: number[], textColor?: number[], stroke?: number[]) => {
  if (fill) {
    doc.setFillColor(fill[0], fill[1], fill[2])
    doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F')
  }
  if (stroke) {
    doc.setDrawColor(stroke[0], stroke[1], stroke[2])
    doc.roundedRect(x, y, w, h, h / 2, h / 2, 'S')
  }
  if (textColor) {
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
  } else {
    doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  }
  doc.text(text, x + w / 2, y + h / 2 + 2.5, { align: 'center' })
}

const drawTable = (
  doc: jsPDF,
  startY: number,
  items: { description: string; quantity: number | null; total: number }[],
  pageWidth: number,
  margin: number,
  hasQty: boolean = true
) => {
  const tableX = margin
  const tableW = pageWidth - margin * 2
  const colDesc = hasQty ? tableW * 0.6 : tableW * 0.75
  const colQty = hasQty ? tableW * 0.15 : 0
  const colTotal = hasQty ? tableW * 0.25 : tableW * 0.25
  const headerH = 8
  let y = startY

  doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.rect(tableX, y, tableW, headerH, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('DESCRIPTION', tableX + colDesc / 2, y + 5.5, { align: 'center' })
  if (hasQty) {
    doc.text('QTE', tableX + colDesc + colQty / 2, y + 5.5, { align: 'center' })
  }
  doc.text('TOTAL TTC', tableX + colDesc + colQty + colTotal / 2, y + 5.5, { align: 'center' })

  y += headerH
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])

  items.forEach((item) => {
    const lines = doc.splitTextToSize(item.description, colDesc - 6)
    const rowH = Math.max(10, lines.length * 5 + 4)

    doc.setDrawColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
    // Draw vertical lines ONLY (no horizontal body borders) to keep the table "open"
    doc.line(tableX, y, tableX, y + rowH) // Left border
    doc.line(tableX + tableW, y, tableX + tableW, y + rowH) // Right border
    doc.line(tableX + colDesc, y, tableX + colDesc, y + rowH) // Desc separator
    if (hasQty) {
      doc.line(tableX + colDesc + colQty, y, tableX + colDesc + colQty, y + rowH) // Qty separator
    }

    doc.text(lines, tableX + 3, y + 6)
    if (hasQty && item.quantity !== null) {
      doc.text(String(item.quantity), tableX + colDesc + colQty / 2, y + 6, { align: 'center' })
    }
    doc.text(formatCurrency(item.total), tableX + colDesc + colQty + colTotal - 3, y + 6, { align: 'right' })

    y += rowH
  })

  // Calculate the remaining height available on the page for the table body to stretch
  // leaving enough room for the Totals, Payment Info and Footer at the bottom
  const footerAndTotalsSpace = 85 // height needed for Totals + Payment info + Footer below the table
  const pageHeight = doc.internal.pageSize.getHeight()
  const minimumYFinish = pageHeight - footerAndTotalsSpace
  
  if (y < minimumYFinish) {
    // Draw empty vertical lines down to the minimum finish line
    doc.setDrawColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
    doc.line(tableX, y, tableX, minimumYFinish) // Left border
    doc.line(tableX + tableW, y, tableX + tableW, minimumYFinish) // Right border
    doc.line(tableX + colDesc, y, tableX + colDesc, minimumYFinish) // Col 1 separator
    if (hasQty) {
      doc.line(tableX + colDesc + colQty, y, tableX + colDesc + colQty, minimumYFinish) // Col 2 separator
    }
    
    // Bottom border to finally close the stretching table
    doc.line(tableX, minimumYFinish, tableX + tableW, minimumYFinish)
    
    y = minimumYFinish
  } else {
    doc.line(tableX, y, tableX + tableW, y)
  }

  return { y, tableW, tableX }
}

export async function generateInvoicePDF(
  invoice: Invoice,
  client: Client,
  settings: AppSettings
): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  const logoH = await addLogo(doc, settings.company.logo)
  await addWatermark(doc)

  // Title row — positioned dynamically just below the logo
  const titleY = Math.max(10 + logoH + 6, 68)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.setFillColor(COLOR_LIGHT_RED[0], COLOR_LIGHT_RED[1], COLOR_LIGHT_RED[2])
  doc.rect(margin, titleY - 4, 32, 12, 'F')
  doc.text('FACTURE', margin + 2, titleY + 4)

  doc.setFontSize(10)
  drawPill(doc, margin + 38, titleY - 2, 50, 10, `N°${invoice.invoiceNumber}`, undefined, undefined, COLOR_DARK)
  drawPill(doc, pageWidth - margin - 40, titleY - 2, 40, 10, formatDateNumeric(invoice.date), COLOR_RED, [255, 255, 255])

  doc.setDrawColor(120)
  doc.line(margin, titleY + 16, pageWidth - margin, titleY + 16)

  // Parties — company LEFT, client RIGHT
  const partiesY = titleY + 26
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.text((settings.company.name || 'AETHOS TECH').toUpperCase(), margin, partiesY)
  doc.text(client.name.toUpperCase(), pageWidth - margin, partiesY, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  let companyY = partiesY + 6
  if (settings.company.taxId) {
    doc.text(`ICE : ${settings.company.taxId}`, margin, companyY)
    companyY += 5
  }
  if (settings.company.address) {
    doc.text(settings.company.address, margin, companyY)
    companyY += 5
  }

  let clientY = partiesY + 6
  if (client.taxId) {
    doc.text(`ICE : ${client.taxId}`, pageWidth - margin, clientY, { align: 'right' })
    clientY += 5
  }
  if (client.email) {
    doc.text(client.email, pageWidth - margin, clientY, { align: 'right' })
    clientY += 5
  }
  if (client.phone) {
    doc.text(client.phone, pageWidth - margin, clientY, { align: 'right' })
    clientY += 5
  }

  // Table starts after the parties section (whichever is longer, plus 8mm gap)
  const tableStartY = Math.max(companyY, clientY) + 8

  // Table
  const items = invoice.lineItems.map((item) => {
    const itemTotal = item.quantity * item.unitPrice
    const itemTax = itemTotal * (item.taxRate / 100)
    return {
      description: item.description,
      quantity: null,
      total: itemTotal + itemTax,
    }
  })

  const table = drawTable(doc, tableStartY, items, pageWidth, margin, false)

  // Totals
  let y = table.y + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.text('HT Total :', pageWidth - margin - 45, y, { align: 'right' })
  doc.text(formatCurrency(invoice.subtotal), pageWidth - margin, y, { align: 'right' })

  y += 10
  const tva = invoice.total - invoice.subtotal
  doc.text('TVA 20% :', pageWidth - margin - 45, y, { align: 'right' })
  doc.text(formatCurrency(tva), pageWidth - margin, y, { align: 'right' })

  // Full-width dark TOTAL TTC bar — matches web `bg-[#1a1a1a] w-full`
  y += 8
  doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.rect(0, y, pageWidth, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL TTC :', margin, y + 8)
  doc.text(formatCurrency(invoice.total), pageWidth - margin, y + 8, { align: 'right' })

  // Payment info — bold uppercase, no MODE DE PAIEMENT header, no Payé/Reste
  y += 20
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`INTITULÉ DU COMPTE : ${(settings.company.name || 'STE AETHOS TECH SARL').toUpperCase()}`, margin, y)
  y += 7
  if (settings.company.bankAccount) {
    doc.text(`RIB : ${settings.company.bankAccount}`, margin, y)
    y += 7
  }
  if (settings.company.bankIBAN) {
    doc.text(`IBAN : ${settings.company.bankIBAN}`, margin, y)
    y += 7
  }
  if (settings.company.bankBIC) {
    doc.text(`CODE SWIFT : ${settings.company.bankBIC}`, margin, y)
  }

  // Footer
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.setDrawColor(160)
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)

  doc.text('STE AETHOS TECH SARL - ICE N°003619027000094 - RC N°156509 - Siège Social :', pageWidth / 2, pageHeight - 12, { align: 'center' })
  doc.text('AV AL QODS L IMCOPA LT 2 1ER ETG N 5 AOUAMA , Tanger - Capital Social(Devise) : 100000,00 MAD', pageWidth / 2, pageHeight - 8, { align: 'center' })

  doc.save(`invoice-${invoice.invoiceNumber}.pdf`)
}

export async function generateQuotePDF(
  quote: Quote,
  client: Client,
  settings: AppSettings
): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  const logoH = await addLogo(doc, settings.company.logo)
  await addWatermark(doc)

  // Title row — positioned dynamically just below the logo
  const titleY = Math.max(10 + logoH + 6, 68)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.setFillColor(COLOR_LIGHT_RED[0], COLOR_LIGHT_RED[1], COLOR_LIGHT_RED[2])
  doc.rect(margin, titleY - 4, 28, 12, 'F')
  doc.text('DEVIS', margin + 2, titleY + 4)

  doc.setFontSize(10)
  drawPill(doc, margin + 34, titleY - 2, 50, 10, `N°${quote.quoteNumber}`, undefined, undefined, COLOR_DARK)
  drawPill(doc, pageWidth - margin - 40, titleY - 2, 40, 10, formatDateNumeric(quote.date), COLOR_RED, [255, 255, 255])

  const validText = `Valable jusqu'au ${formatDateNumeric(quote.validUntil)}`
  doc.setFontSize(8)
  const validW = doc.getTextWidth(validText) + 6
  drawPill(doc, pageWidth - margin - validW, titleY + 10, validW, 8, validText, undefined, undefined, COLOR_DARK)

  doc.setDrawColor(120)
  doc.line(margin, titleY + 16, pageWidth - margin, titleY + 16)

  // Parties — company LEFT, client RIGHT (match invoice)
  const partiesY = titleY + 28
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.text((settings.company.name || 'AETHOS TECH').toUpperCase(), margin, partiesY)
  doc.text(client.name.toUpperCase(), pageWidth - margin, partiesY, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  let companyY = partiesY + 6
  if (settings.company.taxId) {
    doc.text(`ICE : ${settings.company.taxId}`, margin, companyY)
    companyY += 5
  }
  if (settings.company.address) {
    doc.text(settings.company.address, margin, companyY)
    companyY += 5
  }

  let clientY = partiesY + 6
  if (client.taxId) {
    doc.text(`ICE : ${client.taxId}`, pageWidth - margin, clientY, { align: 'right' })
    clientY += 5
  }
  if (client.email) {
    doc.text(client.email, pageWidth - margin, clientY, { align: 'right' })
    clientY += 5
  }
  if (client.phone) {
    doc.text(client.phone, pageWidth - margin, clientY, { align: 'right' })
  }

  // Table
  const items = quote.lineItems.map((item) => {
    const itemTotal = item.quantity * item.unitPrice
    const itemTax = itemTotal * (item.taxRate / 100)
    return {
      description: item.description,
      quantity: item.quantity,
      total: itemTotal + itemTax,
    }
  })

  const table = drawTable(doc, 118, items, pageWidth, margin)

  // Totals
  let y = table.y + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.text('HT Total :', pageWidth - margin - 40, y, { align: 'right' })
  doc.text(formatCurrency(quote.subtotal), pageWidth - margin, y, { align: 'right' })

  y += 8
  doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(`TOTAL TTC : ${formatCurrency(quote.total)}`, pageWidth - margin - 2, y + 7, { align: 'right' })

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.setDrawColor(160)
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)
  
  doc.text('STE AETHOS TECH SARL - ICE N°003619027000094 - RC N°156509 - Siège Social :', pageWidth / 2, pageHeight - 12, { align: 'center' })
  doc.text('AV AL QODS L IMCOPA LT 2 1ER ETG N 5 AOUAMA , Tanger - Capital Social(Devise) : 100000,00 MAD', pageWidth / 2, pageHeight - 8, { align: 'center' })

  doc.save(`quote-${quote.quoteNumber}.pdf`)
}
