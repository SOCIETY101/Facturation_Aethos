import jsPDF from 'jspdf'
import { Invoice, Quote, Client, AppSettings } from './types'
import { formatCurrency, formatDate } from './utils'

export function generateInvoicePDF(
  invoice: Invoice,
  client: Client,
  settings: AppSettings
): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPos = margin

  // Header
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURE', pageWidth - margin, yPos, { align: 'right' })
  yPos += 10

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`N° ${invoice.invoiceNumber}`, pageWidth - margin, yPos, { align: 'right' })
  yPos += 15

  // Company info
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(settings.company.name, margin, yPos)
  yPos += 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(settings.company.address, margin, yPos)
  yPos += 5
  doc.text(
    `${settings.company.postalCode} ${settings.company.city}`,
    margin,
    yPos
  )
  yPos += 5
  doc.text(settings.company.country, margin, yPos)
  yPos += 5
  if (settings.company.taxId) {
    doc.text(`SIRET: ${settings.company.taxId}`, margin, yPos)
    yPos += 10
  } else {
    yPos += 5
  }

  // Client info
  const clientX = pageWidth - margin - 60
  yPos = margin + 10
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Facturé à:', clientX, yPos)
  yPos += 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(client.name, clientX, yPos)
  yPos += 5
  doc.text(client.address, clientX, yPos)
  yPos += 5
  if (client.taxId) {
    doc.text(`SIRET: ${client.taxId}`, clientX, yPos)
    yPos += 5
  }
  doc.text(client.email, clientX, yPos)
  yPos += 5
  doc.text(client.phone, clientX, yPos)
  yPos += 20

  // Invoice details
  doc.setFontSize(10)
  doc.text(`Date d'émission: ${formatDate(invoice.date)}`, margin, yPos)
  yPos += 5
  doc.text(`Date d'échéance: ${formatDate(invoice.dueDate)}`, margin, yPos)
  yPos += 10

  // Line items table
  const tableTop = yPos
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Description', margin, yPos)
  doc.text('Qté', margin + 80, yPos)
  doc.text('Prix unit.', margin + 100, yPos)
  doc.text('TVA', margin + 130, yPos)
  doc.text('Total', pageWidth - margin, yPos, { align: 'right' })
  yPos += 5

  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 5

  doc.setFont('helvetica', 'normal')
  invoice.lineItems.forEach((item) => {
    const itemTotal = item.quantity * item.unitPrice
    const itemTax = itemTotal * (item.taxRate / 100)
    const itemTotalWithTax = itemTotal + itemTax

    doc.text(item.description.substring(0, 30), margin, yPos)
    doc.text(item.quantity.toString(), margin + 80, yPos)
    doc.text(formatCurrency(item.unitPrice), margin + 100, yPos)
    doc.text(`${item.taxRate}%`, margin + 130, yPos)
    doc.text(formatCurrency(itemTotalWithTax), pageWidth - margin, yPos, {
      align: 'right',
    })
    yPos += 6
  })

  yPos += 5
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // Totals
  doc.setFont('helvetica', 'bold')
  doc.text('Sous-total HT:', pageWidth - margin - 50, yPos, { align: 'right' })
  doc.text(formatCurrency(invoice.subtotal), pageWidth - margin, yPos, {
    align: 'right',
  })
  yPos += 6

  doc.setFont('helvetica', 'normal')
  doc.text('TVA:', pageWidth - margin - 50, yPos, { align: 'right' })
  doc.text(formatCurrency(invoice.taxAmount), pageWidth - margin, yPos, {
    align: 'right',
  })
  yPos += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total TTC:', pageWidth - margin - 50, yPos, { align: 'right' })
  doc.text(formatCurrency(invoice.total), pageWidth - margin, yPos, {
    align: 'right',
  })
  yPos += 15

  // Payments
  if (invoice.payments.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Paiements:', margin, yPos)
    yPos += 6
    doc.setFont('helvetica', 'normal')
    invoice.payments.forEach((payment) => {
      doc.text(
        `${formatDate(payment.date)} - ${formatCurrency(payment.amount)} (${payment.method})`,
        margin + 5,
        yPos
      )
      yPos += 5
    })
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = invoice.total - totalPaid
    if (remaining > 0) {
      yPos += 2
      doc.setFont('helvetica', 'bold')
      doc.text(`Reste à payer: ${formatCurrency(remaining)}`, margin + 5, yPos)
      yPos += 10
    }
  }

  // Notes
  if (invoice.notes) {
    yPos += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    const splitNotes = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin)
    doc.text(splitNotes, margin, yPos)
    yPos += splitNotes.length * 4
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 30
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Banque: ${settings.company.bankName} - IBAN: ${settings.company.bankIBAN} - BIC: ${settings.company.bankBIC}`,
    margin,
    footerY
  )
  yPos += 5
  if (settings.invoice.terms) {
    const splitTerms = doc.splitTextToSize(
      settings.invoice.terms,
      pageWidth - 2 * margin
    )
    doc.text(splitTerms, margin, footerY + 5)
  }

  doc.save(`invoice-${invoice.invoiceNumber}.pdf`)
}

export function generateQuotePDF(
  quote: Quote,
  client: Client,
  settings: AppSettings
): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPos = margin

  // Header
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('DEVIS', pageWidth - margin, yPos, { align: 'right' })
  yPos += 10

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`N° ${quote.quoteNumber}`, pageWidth - margin, yPos, { align: 'right' })
  yPos += 15

  // Company info
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(settings.company.name, margin, yPos)
  yPos += 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(settings.company.address, margin, yPos)
  yPos += 5
  doc.text(
    `${settings.company.postalCode} ${settings.company.city}`,
    margin,
    yPos
  )
  yPos += 5
  doc.text(settings.company.country, margin, yPos)
  yPos += 5
  if (settings.company.taxId) {
    doc.text(`SIRET: ${settings.company.taxId}`, margin, yPos)
    yPos += 10
  } else {
    yPos += 5
  }

  // Client info
  const clientX = pageWidth - margin - 60
  yPos = margin + 10
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Devis pour:', clientX, yPos)
  yPos += 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(client.name, clientX, yPos)
  yPos += 5
  doc.text(client.address, clientX, yPos)
  yPos += 5
  if (client.taxId) {
    doc.text(`SIRET: ${client.taxId}`, clientX, yPos)
    yPos += 5
  }
  doc.text(client.email, clientX, yPos)
  yPos += 5
  doc.text(client.phone, clientX, yPos)
  yPos += 20

  // Quote details
  doc.setFontSize(10)
  doc.text(`Date: ${formatDate(quote.date)}`, margin, yPos)
  yPos += 5
  doc.text(`Valide jusqu'au: ${formatDate(quote.validUntil)}`, margin, yPos)
  yPos += 10

  // Line items table
  const tableTop = yPos
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Description', margin, yPos)
  doc.text('Qté', margin + 80, yPos)
  doc.text('Prix unit.', margin + 100, yPos)
  doc.text('TVA', margin + 130, yPos)
  doc.text('Total', pageWidth - margin, yPos, { align: 'right' })
  yPos += 5

  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 5

  doc.setFont('helvetica', 'normal')
  quote.lineItems.forEach((item) => {
    const itemTotal = item.quantity * item.unitPrice
    const itemTax = itemTotal * (item.taxRate / 100)
    const itemTotalWithTax = itemTotal + itemTax

    doc.text(item.description.substring(0, 30), margin, yPos)
    doc.text(item.quantity.toString(), margin + 80, yPos)
    doc.text(formatCurrency(item.unitPrice), margin + 100, yPos)
    doc.text(`${item.taxRate}%`, margin + 130, yPos)
    doc.text(formatCurrency(itemTotalWithTax), pageWidth - margin, yPos, {
      align: 'right',
    })
    yPos += 6
  })

  yPos += 5
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 10

  // Totals
  doc.setFont('helvetica', 'bold')
  doc.text('Sous-total HT:', pageWidth - margin - 50, yPos, { align: 'right' })
  doc.text(formatCurrency(quote.subtotal), pageWidth - margin, yPos, {
    align: 'right',
  })
  yPos += 6

  doc.setFont('helvetica', 'normal')
  doc.text('TVA:', pageWidth - margin - 50, yPos, { align: 'right' })
  doc.text(formatCurrency(quote.taxAmount), pageWidth - margin, yPos, {
    align: 'right',
  })
  yPos += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total TTC:', pageWidth - margin - 50, yPos, { align: 'right' })
  doc.text(formatCurrency(quote.total), pageWidth - margin, yPos, {
    align: 'right',
  })
  yPos += 15

  // Notes
  if (quote.notes) {
    yPos += 5
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    const splitNotes = doc.splitTextToSize(quote.notes, pageWidth - 2 * margin)
    doc.text(splitNotes, margin, yPos)
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Ce devis est valable jusqu'au ${formatDate(quote.validUntil)}`,
    margin,
    footerY
  )

  doc.save(`quote-${quote.quoteNumber}.pdf`)
}
