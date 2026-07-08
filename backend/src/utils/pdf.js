function escapePdfText(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

export function createInvoicePdfBuffer({ invoice, user, classItem, transaction }) {
  const lines = [
    'Lin-Badminton Invoice',
    `Invoice: ${invoice.invoiceNumber}`,
    `Issued: ${new Date(invoice.issuedAt).toLocaleString('en-US')}`,
    `Student: ${user?.name || 'Student'} (${user?.email || ''})`,
    `Class: ${classItem?.title || 'Class'}`,
    `Start: ${classItem?.startDate ? new Date(classItem.startDate).toLocaleString('en-US') : 'TBD'}`,
    `Transaction: ${transaction.providerRef}`,
    `Status: ${transaction.status.toUpperCase()}`,
    `Total: ${invoice.total.toLocaleString('vi-VN')} ${invoice.currency}`
  ];

  const content = [
    'BT',
    '/F1 18 Tf',
    '50 780 Td',
    `(${escapePdfText(lines[0])}) Tj`,
    '/F1 11 Tf',
    ...lines.slice(1).flatMap((line) => ['0 -28 Td', `(${escapePdfText(line)}) Tj`]),
    'ET'
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream\nendobj`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf);
}
