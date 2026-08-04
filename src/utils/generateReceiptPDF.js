export const generateReceiptPDF = (payment, profile = {}, existingWindow = null) => {
  const receiptNo = payment.receiptNumber || `RCP-2026-${(payment.id || payment._id || "0000").toString().slice(-4).toUpperCase()}`;
  const payDate = payment.payDate || payment.paymentDate || (new Date().toLocaleDateString('en-GB') + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
  const memberName = profile.name || payment.memberName || "સમાજ સભ્ય";
  const mobile = profile.mobile || payment.mobile || "-";
  const village = profile.village || payment.village || "-";
  const deceasedName = payment.name || payment.deceasedName || "સહાય ફંડ";
  const amount = payment.amount || 50;
  const paymentId = payment.paymentId || payment.razorpayPaymentId || `pay_${(payment.id || payment._id || "0000").toString().slice(-8)}`;

  let printWindow = existingWindow;
  if (!printWindow || printWindow.closed) {
    printWindow = window.open("", "_blank", "width=850,height=950");
  }

  if (!printWindow) {
    alert("કૃપા કરીને પૉપઅપ (Pop-up) બ્લોકર ડિસેબલ કરો જેથી રસીદ ડાઉનલોડ થઈ શકે.");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="UTF-8">
      <title>રસીદ_${receiptNo}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Hind+Vadodara:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Hind Vadodara', sans-serif; }
        body { background: #f8fafc; padding: 40px 20px; color: #1e293b; }
        .receipt-card { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 2px solid #cbd5e1; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); position: relative; overflow: hidden; }
        .receipt-header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 24px; }
        .receipt-header h1 { color: #1e3a8a; font-size: 26px; font-weight: 700; margin-bottom: 4px; }
        .receipt-header p { color: #64748b; font-size: 14px; }
        .badge-paid { display: inline-block; background: #dcfce7; color: #166534; font-weight: 700; padding: 6px 18px; border-radius: 20px; font-size: 14px; margin-top: 10px; border: 1px solid #bbf7d0; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #f1f5f9; padding: 16px 20px; border-radius: 10px; }
        .meta-item label { font-size: 12px; color: #64748b; display: block; font-weight: 500; }
        .meta-item span { font-size: 15px; color: #0f172a; font-weight: 600; }
        .section-title { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 10px; border-left: 4px solid #2563eb; padding-left: 10px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-table td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .info-table td.label { color: #475569; width: 40%; font-weight: 500; }
        .info-table td.value { color: #0f172a; font-weight: 600; }
        .total-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 18px 24px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; margin-bottom: 24px; }
        .total-box label { font-size: 16px; font-weight: 700; color: #1e40af; }
        .total-box span { font-size: 28px; font-weight: 800; color: #1d4ed8; }
        .watermark-stamp { position: absolute; right: 40px; bottom: 85px; width: 120px; height: 120px; border: 3px dashed #166534; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-15deg); opacity: 0.3; color: #166534; text-align: center; font-weight: 800; font-size: 11px; pointer-events: none; }
        .receipt-footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        .no-print-bar { text-align: center; margin-bottom: 24px; }
        .print-btn { background: #2563eb; color: #ffffff; border: none; padding: 12px 28px; font-size: 16px; font-weight: 600; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.3); transition: all 0.2s; }
        .print-btn:hover { background: #1d4ed8; }
        @media print {
          body { background: #ffffff; padding: 0; }
          .receipt-card { border: 1px solid #cbd5e1; box-shadow: none; }
          .no-print-bar { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <button class="print-btn" onclick="window.print()">🖨️ રસીદ પ્રિન્ટ કરો / PDF ડાઉનલોડ કરો</button>
      </div>

      <div class="receipt-card">
        <div class="receipt-header">
          <h1>🏛️ પંચશીલ સમાજ સેવા ટ્રસ્ટ</h1>
          <p>સહાય ફંડ ચૂકવણી અધિકૃત ડિજિટલ રસીદ (Official Receipt)</p>
          <span class="badge-paid">✓ ચૂકવણી સફળ (PAID)</span>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <label>રસીદ નંબર (Receipt No):</label>
            <span>${receiptNo}</span>
          </div>
          <div class="meta-item">
            <label>ચૂકવણી તારીખ અને સમય:</label>
            <span>${payDate}</span>
          </div>
        </div>

        <div class="section-title">👤 ચૂકવનાર સભ્યની વિગતો (Family Head)</div>
        <table class="info-table">
          <tr><td class="label">કુટુંબના મોભીનું નામ:</td><td class="value">${memberName}</td></tr>
          <tr><td class="label">મોબાઇલ નંબર:</td><td class="value">${mobile}</td></tr>
          <tr><td class="label">ગામ:</td><td class="value">${village}</td></tr>
          <tr><td class="label">કુટુંબના મંજૂર સભ્યો:</td><td class="value">${payment.familyCoveredMembers ? `${payment.familyCoveredMembers} સભ્યો (૧ મોભી + સભ્યો)` : '૧ સભ્ય'}</td></tr>
        </table>

        <div class="section-title">💐 સહાય ફંડ વિગતો (સદગત)</div>
        <table class="info-table">
          <tr><td class="label">સ્વર્ગસ્થ સભ્યનું નામ:</td><td class="value">${deceasedName}</td></tr>
          <tr><td class="label">અંતિમ ગામ:</td><td class="value">${payment.village || village}</td></tr>
          <tr><td class="label">મૃત્યુ તારીખ:</td><td class="value">${payment.deathDate || "-"}</td></tr>
        </table>

        <div class="section-title">💳 ટ્રાન્ઝેક્શન વિગતો</div>
        <table class="info-table">
          <tr><td class="label">રેઝરપે પેમેન્ટ ID:</td><td class="value"><code>${paymentId}</code></td></tr>
          <tr><td class="label">ચૂકવણી પદ્ધતિ:</td><td class="value">Online (Razorpay Gateway / UPI / Card)</td></tr>
        </table>

        <div class="total-box">
          <label>કુલ ચૂકવેલ રકમ (Total Paid Amount):</label>
          <span>₹${amount}.00</span>
        </div>

        <div class="watermark-stamp">
          <div>VERIFIED</div>
          <div>PAID</div>
          <div>પંચશીલ સમાજ</div>
        </div>

        <div class="receipt-footer">
          <p>આ કમ્પ્યુટર દ્વારા જનરેટ થયેલ ડિજિટલ રસીદ છે. કોઈપણ ભૌતિક સહીની જરૂર નથી.</p>
          <p>© 2026 પંચશીલ સમાજ કમ્યુનિટી પોર્ટલ. સર્વાધિકાર સુરક્ષિત.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();

  // Auto-launch browser PDF print dialog immediately
  setTimeout(() => {
    try {
      printWindow.print();
    } catch (e) {
      console.error("Auto print error:", e);
    }
  }, 400);
};
