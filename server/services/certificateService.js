const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Generate a participation certificate as a PDF buffer.
 *
 * @param {Object} opts
 * @param {string} opts.participantName
 * @param {string} opts.eventTitle
 * @param {string} opts.eventDate     — ISO date string
 * @param {string} opts.venue
 * @param {string} opts.certId        — unique certificate ID
 * @param {string} [opts.department]
 * @param {string} [opts.verifyUrl]   — URL to verify the certificate online
 * @returns {Promise<Buffer>}
 */
exports.generateCertificate = async ({
  participantName,
  eventTitle,
  eventDate,
  venue,
  certId,
  department = '',
  verifyUrl = '',
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const W = 841.89;   // A4 landscape width
      const H = 595.28;   // A4 landscape height

      // ─── Background ──────────────────────────────────────────
      // Deep navy background
      doc.rect(0, 0, W, H).fill('#0D0F1A');

      // Gradient-like decorative strips (top & bottom)
      const grad1 = doc.linearGradient(0, 0, W, 0);
      grad1.stop(0, '#7c3aed').stop(0.5, '#4f46e5').stop(1, '#10b981');
      doc.rect(0, 0, W, 8).fill(grad1);

      const grad2 = doc.linearGradient(0, 0, W, 0);
      grad2.stop(0, '#10b981').stop(0.5, '#4f46e5').stop(1, '#7c3aed');
      doc.rect(0, H - 8, W, 8).fill(grad2);

      // Inner border frame
      doc.roundedRect(30, 30, W - 60, H - 60, 16)
        .lineWidth(1.5)
        .strokeOpacity(0.15)
        .stroke('#ffffff');

      // Corner accent circles (decorative)
      [[60, 60], [W - 60, 60], [60, H - 60], [W - 60, H - 60]].forEach(([x, y]) => {
        doc.circle(x, y, 18).fillOpacity(0.08).fill('#7c3aed');
        doc.circle(x, y, 8).fillOpacity(0.15).fill('#7c3aed');
      });
      doc.fillOpacity(1);

      // ─── Logo / Header ─────────────────────────────────────
      doc.fontSize(28).fillColor('#7c3aed').font('Helvetica-Bold')
        .text('⚡', W / 2 - 18, 62, { width: 36, align: 'center' });

      doc.fontSize(14).fillColor('#ffffff').font('Helvetica-Bold')
        .text('FestOS', 0, 94, { width: W, align: 'center' });

      doc.fontSize(8).fillColor('#ffffff').font('Helvetica')
        .text('MANAV RACHNA UNIVERSITY', 0, 112, { width: W, align: 'center', characterSpacing: 3 });

      // ─── Title ──────────────────────────────────────────────
      doc.fontSize(11).fillColor('#a78bfa').font('Helvetica')
        .text('CERTIFICATE OF PARTICIPATION', 0, 150, { width: W, align: 'center', characterSpacing: 5 });

      // Decorative line under title
      const lineY = 170;
      doc.moveTo(W / 2 - 120, lineY).lineTo(W / 2 + 120, lineY)
        .lineWidth(0.8).strokeOpacity(0.3).stroke('#7c3aed');

      // ─── Body Text ─────────────────────────────────────────
      doc.fillOpacity(1);
      doc.fontSize(13).fillColor('#94a3b8').font('Helvetica')
        .text('This is to certify that', 0, 195, { width: W, align: 'center' });

      // Participant name — large and bold
      doc.fontSize(32).fillColor('#ffffff').font('Helvetica-Bold')
        .text(participantName, 0, 222, { width: W, align: 'center' });

      // Underline under name
      const nameWidth = doc.widthOfString(participantName);
      const nameLineY = 260;
      doc.moveTo((W - nameWidth) / 2, nameLineY)
        .lineTo((W + nameWidth) / 2, nameLineY)
        .lineWidth(1).strokeOpacity(0.2).stroke('#a78bfa');

      if (department) {
        doc.fillOpacity(1);
        doc.fontSize(10).fillColor('#64748b').font('Helvetica')
          .text(`Department of ${department}`, 0, 268, { width: W, align: 'center' });
      }

      doc.fillOpacity(1);
      doc.fontSize(13).fillColor('#94a3b8').font('Helvetica')
        .text('has successfully participated in', 0, 290, { width: W, align: 'center' });

      // Event title — large accent color
      doc.fontSize(24).fillColor('#a78bfa').font('Helvetica-Bold')
        .text(eventTitle, 0, 315, { width: W, align: 'center' });

      // Event details
      const dateStr = new Date(eventDate).toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });

      doc.fontSize(11).fillColor('#64748b').font('Helvetica')
        .text(`Held on ${dateStr}`, 0, 350, { width: W, align: 'center' });

      doc.fontSize(11).fillColor('#64748b').font('Helvetica')
        .text(`Venue: ${venue}`, 0, 368, { width: W, align: 'center' });

      // ─── Signature lines ──────────────────────────────────
      const sigY = 430;

      // Left signature
      doc.moveTo(150, sigY).lineTo(330, sigY).lineWidth(0.8).strokeOpacity(0.2).stroke('#ffffff');
      doc.fillOpacity(1);
      doc.fontSize(9).fillColor('#64748b').font('Helvetica')
        .text('Event Organizer', 150, sigY + 6, { width: 180, align: 'center' });

      // Right signature
      doc.moveTo(W - 330, sigY).lineTo(W - 150, sigY).lineWidth(0.8).strokeOpacity(0.2).stroke('#ffffff');
      doc.fillOpacity(1);
      doc.fontSize(9).fillColor('#64748b').font('Helvetica')
        .text('Head of Department', W - 330, sigY + 6, { width: 180, align: 'center' });

      // ─── QR Code (verification) ────────────────────────────
      if (verifyUrl) {
        try {
          const qrBuffer = await QRCode.toBuffer(verifyUrl, {
            width: 70,
            margin: 1,
            color: { dark: '#a78bfa', light: '#0D0F1A' },
          });
          doc.image(qrBuffer, W / 2 - 35, 460, { width: 70, height: 70 });
          doc.fontSize(7).fillColor('#475569').font('Helvetica')
            .text('Scan to verify', 0, 533, { width: W, align: 'center' });
        } catch {
          // QR generation failed, skip it
        }
      }

      // ─── Certificate ID (bottom) ───────────────────────────
      doc.fontSize(8).fillColor('#334155').font('Helvetica')
        .text(`Certificate ID: ${certId}`, 0, H - 50, { width: W, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
