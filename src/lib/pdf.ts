import jsPDF from 'jspdf'
import { Invoice, Quote, Client, AppSettings } from './types'
import { formatCurrency } from './utils'
import Logo from '@/assets/Logo.png'
import Signature from '@/assets/Segnature.png'

const COLOR_RED = [176, 13, 11] as const
const COLOR_DARK = [43, 43, 43] as const
const COLOR_LIGHT_RED = [243, 222, 222] as const

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

const addLogo = async (doc: jsPDF, logoUrl?: string) => {
  const url = logoUrl || Logo
  const dataUrl = await loadImageAsDataUrl(url)
  if (!dataUrl) return
  doc.addImage(dataUrl, 'PNG', 20, 18, 45, 15)
}

const addSignature = async (doc: jsPDF, x: number, y: number) => {
  const dataUrl = await loadImageAsDataUrl(Signature)
  if (!dataUrl) return
  doc.addImage(dataUrl, 'PNG', x, y, 40, 20)
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
  items: { description: string; quantity: number; total: number }[],
  pageWidth: number,
  margin: number
) => {
  const tableX = margin
  const tableW = pageWidth - margin * 2
  const colDesc = tableW * 0.6
  const colQty = tableW * 0.15
  const colTotal = tableW * 0.25
  const headerH = 8
  let y = startY

  doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.rect(tableX, y, tableW, headerH, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('DESCRIPTION', tableX + colDesc / 2, y + 5.5, { align: 'center' })
  doc.text('QTE', tableX + colDesc + colQty / 2, y + 5.5, { align: 'center' })
  doc.text('TOTAL TTC', tableX + colDesc + colQty + colTotal / 2, y + 5.5, { align: 'center' })

  y += headerH
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])

  items.forEach((item) => {
    const lines = doc.splitTextToSize(item.description, colDesc - 6)
    const rowH = Math.max(10, lines.length * 5 + 4)

    doc.setDrawColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
    doc.rect(tableX, y, tableW, rowH)
    doc.line(tableX + colDesc, y, tableX + colDesc, y + rowH)
    doc.line(tableX + colDesc + colQty, y, tableX + colDesc + colQty, y + rowH)

    doc.text(lines, tableX + 3, y + 6)
    doc.text(String(item.quantity), tableX + colDesc + colQty / 2, y + 6, { align: 'center' })
    doc.text(formatCurrency(item.total), tableX + colDesc + colQty + colTotal - 3, y + 6, { align: 'right' })

    y += rowH
  })

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

  await addLogo(doc, settings.company.logo)

  // Title row
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.setFillColor(COLOR_LIGHT_RED[0], COLOR_LIGHT_RED[1], COLOR_LIGHT_RED[2])
  doc.rect(margin, 40, 28, 10, 'F')
  doc.text('FACTURE', margin + 1, 48)

  doc.setFontSize(10)
  drawPill(doc, pageWidth / 2 - 20, 40, 40, 10, `N°${invoice.invoiceNumber}`, undefined, undefined, COLOR_DARK)
  drawPill(doc, pageWidth - margin - 35, 40, 35, 10, formatDateNumeric(invoice.date), COLOR_RED, [255, 255, 255])

  doc.setDrawColor(120)
  doc.line(margin, 58, pageWidth - margin, 58)

  // Parties
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.text(client.name.toUpperCase(), margin, 70)
  doc.text((settings.company.name || 'AETHOS TECH').toUpperCase(), pageWidth - margin, 70, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  let leftY = 76
  if (client.taxId) {
    doc.text(`ICE : ${client.taxId}`, margin, leftY)
    leftY += 5
  }
  if (client.email) {
    doc.text(client.email, margin, leftY)
    leftY += 5
  }
  if (client.phone) {
    doc.text(client.phone, margin, leftY)
  }

  if (settings.company.taxId) {
    doc.text(`ICE : ${settings.company.taxId}`, pageWidth - margin, 76, { align: 'right' })
  }

  // Table
  const items = invoice.lineItems.map((item) => {
    const itemTotal = item.quantity * item.unitPrice
    const itemTax = itemTotal * (item.taxRate / 100)
    return {
      description: item.description,
      quantity: item.quantity,
      total: itemTotal + itemTax,
    }
  })

  const table = drawTable(doc, 88, items, pageWidth, margin)

  // Totals
  let y = table.y + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.text('HT Total :', pageWidth - margin - 40, y, { align: 'right' })
  doc.text(formatCurrency(invoice.subtotal), pageWidth - margin, y, { align: 'right' })

  y += 8
  doc.setFillColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(`TOTAL TTC : ${formatCurrency(invoice.total)}`, pageWidth - margin - 2, y + 7, { align: 'right' })

  // Payment info
  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = invoice.total - totalPaid

  y += 16
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.setFont('helvetica', 'bold')
  doc.text(`Payé : ${formatCurrency(totalPaid)}`, pageWidth - margin - 2, y, { align: 'right' })
  y += 6
  doc.text(`Reste : ${formatCurrency(remaining)}`, pageWidth - margin - 2, y, { align: 'right' })
  y += 8

  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.setFont('helvetica', 'bold')
  doc.text('MODE DE PAIEMENT', margin, y)
  doc.setFont('helvetica', 'normal')
  y += 6
  doc.text(`INTITULE DU COMPTE : ${settings.company.name || 'STE AETHOS TECH SARL'}`, margin, y)
  y += 5
  if (settings.company.bankAccount) {
    doc.text(`RIB : ${settings.company.bankAccount}`, margin, y)
    y += 5
  }
  if (settings.company.bankIBAN) {
    doc.text(`IBAN : ${settings.company.bankIBAN}`, margin, y)
    y += 5
  }
  if (settings.company.bankBIC) {
    doc.text(`CODE SWIFT : ${settings.company.bankBIC}`, margin, y)
    y += 5
  }

  // Signature
  await addSignature(doc, pageWidth - margin - 45, y - 10)

  // Footer
  const footerParts = [
    settings.company.name || 'STE AETHOS TECH SARL',
    settings.company.taxId ? `ICE ${settings.company.taxId}` : null,
    settings.company.address || null,
    settings.company.city ? `${settings.company.city}${settings.company.postalCode ? ` ${settings.company.postalCode}` : ''}` : null,
  ].filter(Boolean) as string[]

  doc.setFontSize(8)
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.setDrawColor(160)
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)
  if (footerParts.length > 0) {
    doc.text(footerParts.join(' - '), pageWidth / 2, pageHeight - 12, { align: 'center' })
  }

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

  await addLogo(doc, settings.company.logo)

  // Title row
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.setFillColor(COLOR_LIGHT_RED[0], COLOR_LIGHT_RED[1], COLOR_LIGHT_RED[2])
  doc.rect(margin, 40, 22, 10, 'F')
  doc.text('DEVIS', margin + 1, 48)

  doc.setFontSize(10)
  drawPill(doc, pageWidth / 2 - 20, 40, 40, 10, `N°${quote.quoteNumber}`, undefined, undefined, COLOR_DARK)
  drawPill(doc, pageWidth - margin - 35, 40, 35, 10, formatDateNumeric(quote.date), COLOR_RED, [255, 255, 255])

  const validText = `Valable jusqu'au ${formatDateNumeric(quote.validUntil)}`
  doc.setFontSize(8)
  const validW = doc.getTextWidth(validText) + 6
  drawPill(
    doc,
    pageWidth - margin - validW,
    52,
    validW,
    8,
    validText,
    undefined,
    undefined,
    COLOR_DARK
  )

  doc.setDrawColor(120)
  doc.line(margin, 62, pageWidth - margin, 62)

  // Parties
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.text(client.name.toUpperCase(), margin, 74)
  doc.text((settings.company.name || 'AETHOS TECH').toUpperCase(), pageWidth - margin, 74, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  let leftY = 80
  if (client.taxId) {
    doc.text(`ICE : ${client.taxId}`, margin, leftY)
    leftY += 5
  }
  if (client.email) {
    doc.text(client.email, margin, leftY)
    leftY += 5
  }
  if (client.phone) {
    doc.text(client.phone, margin, leftY)
  }

  if (settings.company.taxId) {
    doc.text(`ICE : ${settings.company.taxId}`, pageWidth - margin, 80, { align: 'right' })
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

  const table = drawTable(doc, 92, items, pageWidth, margin)

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

  // Notes
  y += 14
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.setFont('helvetica', 'normal')
  if (quote.notes) {
    doc.text('Notes', margin, y)
    y += 5
    const splitNotes = doc.splitTextToSize(quote.notes, pageWidth - margin * 2)
    doc.text(splitNotes, margin, y)
    y += splitNotes.length * 4 + 2
  }

  if (quote.terms) {
    doc.text('Conditions', margin, y)
    y += 5
    const splitTerms = doc.splitTextToSize(quote.terms, pageWidth - margin * 2)
    doc.text(splitTerms, margin, y)
  }

  // Footer
  const footerParts = [
    settings.company.name || 'STE AETHOS TECH SARL',
    settings.company.taxId ? `ICE ${settings.company.taxId}` : null,
    settings.company.address || null,
    settings.company.city ? `${settings.company.city}${settings.company.postalCode ? ` ${settings.company.postalCode}` : ''}` : null,
  ].filter(Boolean) as string[]

  doc.setFontSize(8)
  doc.setTextColor(COLOR_DARK[0], COLOR_DARK[1], COLOR_DARK[2])
  doc.setDrawColor(160)
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18)
  if (footerParts.length > 0) {
    doc.text(footerParts.join(' - '), pageWidth / 2, pageHeight - 12, { align: 'center' })
  }

  doc.save(`quote-${quote.quoteNumber}.pdf`)
}
