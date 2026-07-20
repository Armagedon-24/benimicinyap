import { Transaction } from './types';

export function printReceipt(transaction: Transaction) {
  const dateStr = new Date(transaction.createdAt).toLocaleString('tr-TR');
  const receiptNo = `REC-${transaction.id.slice(0, 8).toUpperCase()}`;
  
  // Calculate details
  const amount = transaction.amount;
  const commission = transaction.platformFee || 0;
  const total = transaction.type === 'escrow_release' ? amount - commission : amount;
  
  let typeLabel = '';
  switch (transaction.type) {
    case 'escrow_block':
      typeLabel = 'Güvenli Ödeme Blokajı (Escrow)';
      break;
    case 'escrow_release':
      typeLabel = 'Görev Ödemesi (Hakediş)';
      break;
    case 'wallet_load':
      typeLabel = 'Cüzdan Bakiye Yükleme';
      break;
    case 'wallet_withdraw':
      typeLabel = 'Cüzdandan Para Çekme';
      break;
    case 'platform_commission':
      typeLabel = 'Sistem Hizmet Bedeli (Komisyon)';
      break;
    default:
      typeLabel = 'Bakiye Düzeltme';
  }

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert('Yazdır penceresi engellendi. Lütfen pop-up engelleyicisini kapatın.');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>Ödeme Makbuzu - ${receiptNo}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 40px;
          color: #333;
          background: #fff;
          font-size: 14px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo-container h1 {
          margin: 0;
          font-size: 24px;
          color: #4f46e5;
          font-weight: 800;
        }
        .logo-container p {
          margin: 5px 0 0 0;
          font-size: 12px;
          color: #64748b;
        }
        .receipt-info {
          text-align: right;
        }
        .receipt-info h2 {
          margin: 0;
          font-size: 18px;
          color: #0f172a;
        }
        .receipt-info p {
          margin: 5px 0 0 0;
          color: #64748b;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 40px;
        }
        .card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 15px;
          border-radius: 8px;
        }
        .card h3 {
          margin: 0 0 10px 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }
        .card p {
          margin: 5px 0;
          font-weight: 500;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
        }
        th, td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        th {
          background: #f1f5f9;
          font-weight: 600;
          color: #475569;
        }
        td.amount-col {
          text-align: right;
          font-weight: 600;
        }
        th.amount-col {
          text-align: right;
        }
        .summary-container {
          display: flex;
          justify-content: flex-end;
        }
        .summary-table {
          width: 300px;
          margin-bottom: 0;
        }
        .summary-table td {
          padding: 8px 15px;
        }
        .summary-table tr.total {
          font-size: 16px;
          font-weight: bold;
          color: #4f46e5;
          background: #f5f3ff;
        }
        .footer {
          margin-top: 60px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
          color: #94a3b8;
          font-size: 11px;
        }
        .stamp {
          border: 2px dashed #10b981;
          color: #10b981;
          display: inline-block;
          padding: 5px 15px;
          border-radius: 4px;
          font-weight: bold;
          transform: rotate(-5deg);
          margin-top: 15px;
          text-transform: uppercase;
        }
        @media print {
          body {
            margin: 20px;
          }
          .no-print {
            display: none;
          }
        }
        .print-btn-container {
          margin-bottom: 20px;
          text-align: right;
        }
        .print-btn {
          background-color: #4f46e5;
          color: white;
          border: none;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
        }
        .print-btn:hover {
          background-color: #4338ca;
        }
      </style>
    </head>
    <body>
      <div class="print-btn-container no-print">
        <button class="print-btn" onclick="window.print()">Yazdır veya PDF Kaydet</button>
      </div>

      <div class="header">
        <div class="logo-container">
          <h1>BENİM İÇİN YAP</h1>
          <p>Güvenli Görev ve Escrow Pazaryeri</p>
        </div>
        <div class="receipt-info">
          <h2>RESMİ ÖDEME MAKBUZU</h2>
          <p>Makbuz No: <strong>${receiptNo}</strong></p>
          <p>Tarih: ${dateStr}</p>
        </div>
      </div>

      <div class="details-grid">
        <div class="card">
          <h3>İşlem Detayları</h3>
          <p>Tür: <strong>${typeLabel}</strong></p>
          <p>Durum: <span style="color:#10b981; font-weight:bold;">${transaction.status.toUpperCase()}</span></p>
        </div>
        <div class="card" style="text-align: center;">
          <h3>Güvenlik Mührü</h3>
          <div class="stamp">ÖDEME ONAYLANDI</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Açıklama</th>
            <th>İlişkili Görev / İşlem</th>
            <th class="amount-col">Tutar</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${typeLabel}</td>
            <td>${transaction.taskTitle || '-'}</td>
            <td class="amount-col">${transaction.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
          </tr>
        </tbody>
      </table>

      <div class="summary-container">
        <table class="summary-table">
          <tr>
            <td>Ara Toplam:</td>
            <td style="text-align: right;">${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
          </tr>
          ${commission > 0 ? `
          <tr>
            <td>Sistem Hizmet Bedeli (%10):</td>
            <td style="text-align: right; color:#ef4444;">-${commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
          </tr>
          ` : ''}
          <tr class="total">
            <td>Net Tutar:</td>
            <td style="text-align: right;">${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p>Bu makbuz elektronik ortamda otomatik olarak oluşturulmuştur. Bilgi amaçlıdır, mali fatura yerine geçmez.</p>
        <p>© 2026 Benim İçin Yap A.Ş. | Destek: destek@benimicinyap.com</p>
      </div>

      <script>
        // Trigger print dialog automatically
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
