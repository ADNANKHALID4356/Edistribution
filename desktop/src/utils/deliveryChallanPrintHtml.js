/**
 * Delivery challan print HTML (browser print / Save as PDF).
 * Layout v6: classic table with Disc column (actual amount) in two side-by-side columns.
 */
export const DELIVERY_PRINT_LAYOUT_VERSION = 'v6-classic-2col-disc-labels';

function lineDiscountAmount(item) {
  const qty = parseFloat(item.quantity_delivered || item.quantity_ordered || 0);
  const price = parseFloat(item.unit_price || 0);
  const grossTotal = qty * price;
  const itemTotal = parseFloat(item.total_price || 0);
  const itemDiscountAmt = parseFloat(item.discount_amount || 0);
  if (itemDiscountAmt > 0) return itemDiscountAmt;
  if (grossTotal > itemTotal) return grossTotal - itemTotal;
  return 0;
}

function lineDiscountKept(item) {
  const qty = parseFloat(item.quantity_delivered || item.quantity_ordered || 0);
  const ret = parseFloat(item.quantity_returned || 0);
  const kept = Math.max(qty - ret, 0);
  const fullDisc = lineDiscountAmount(item);
  return qty > 0 ? fullDisc * (kept / qty) : 0;
}

function buildItemRow(item, rowNum, lineNetBaseline) {
  const qty = parseFloat(item.quantity_delivered || item.quantity_ordered || 0);
  const ret = parseFloat(item.quantity_returned || 0);
  const kept = Math.max(qty - ret, 0);
  const price = parseFloat(item.unit_price || 0);
  const lineNetFull = lineNetBaseline(item);
  const lineNetKept = qty > 0 ? lineNetFull * (kept / qty) : 0;
  const discKept = lineDiscountKept(item);
  const qtyLabel =
    ret > 0 ? `${kept}<span style="font-size:4.5pt">(-${ret})</span>` : `${kept}`;
  const discCell =
    discKept > 0
      ? `<span class="disc-amt">-${discKept.toFixed(0)}</span>`
      : '';

  return `
    <tr>
      <td>${rowNum}</td>
      <td>${item.product_name}${
        item.product_code
          ? ` <span style="font-size:4.5pt;color:#555">[${item.product_code}]</span>`
          : ''
      }</td>
      <td class="right">${qtyLabel}</td>
      <td class="right">${price.toFixed(0)}</td>
      <td class="right disc-col">${discCell}</td>
      <td class="right"><strong>${lineNetKept.toFixed(0)}</strong></td>
    </tr>`;
}

function buildItemsColumnTable(columnItems, startIndex, lineNetBaseline) {
  const rows = columnItems
    .map((item, i) => buildItemRow(item, startIndex + i + 1, lineNetBaseline))
    .join('');

  return `
    <table class="items-table">
      <colgroup>
        <col class="col-num" />
        <col class="col-item" />
        <col class="col-qty" />
        <col class="col-rate" />
        <col class="col-disc" />
        <col class="col-amt" />
      </colgroup>
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th class="right">Qty</th>
          <th class="right">Rate</th>
          <th class="right">Disc</th>
          <th class="right">Amt</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="6" style="color:#999;font-style:italic">—</td></tr>'}</tbody>
    </table>`;
}

export function buildDeliveryChallanPrintDocument({
  challan,
  companySettings,
  items,
  sub,
  gt,
  effectiveDiscount,
  effectiveDiscountPct,
  hasReturns,
  totalReturnedUnits,
  totalReturnedValue,
  totalKeptQty,
  returnDocs,
  hasReturnDocs,
  lineNetBaseline,
}) {
  const companyName = companySettings?.company_name || 'COMPANY NAME';
  const companyPhone = companySettings?.company_phone || 'N/A';
  const companyAddress = companySettings?.company_address || '';
  const deliveryDate = challan.delivery_date
    ? new Date(challan.delivery_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : 'N/A';

  const splitAt = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, splitAt);
  const rightItems = items.slice(splitAt);

  const totalLineDiscount = items.reduce((sum, item) => sum + lineDiscountKept(item), 0);

  const leftTable = buildItemsColumnTable(leftItems, 0, lineNetBaseline);
  const rightTable = buildItemsColumnTable(rightItems, splitAt, lineNetBaseline);

  const returnsBlock = hasReturns
    ? `<div class="notice-box"><span class="notice-title">Returns:</span> ${totalReturnedUnits} units | Rs. ${totalReturnedValue.toFixed(0)}</div>`
    : '';

  const returnDocsBlock = hasReturnDocs
    ? `<div class="notice-box"><span class="notice-title">Ret docs:</span> ${returnDocs
        .map((ret) => {
          const hdr = ret || {};
          const hdrNo = hdr.return_number || '-';
          const hdrAmt = parseFloat(hdr.total_return_amount || 0);
          const hdrQty = parseFloat(hdr.total_quantity_returned || 0);
          return `#${hdrNo} Q${hdrQty}/Rs${hdrAmt.toFixed(0)}`;
        })
        .join(' | ')}</div>`
    : '';

  const balanceBlock =
    challan.shop_current_balance !== undefined && challan.shop_current_balance !== null
      ? `
        <div class="balance-block">
          <div class="fin-row"><span>Prev bal</span><span>${(parseFloat(challan.shop_current_balance) - gt).toFixed(0)}</span></div>
          <div class="fin-row"><span>Bill</span><span>${gt.toFixed(0)}</span></div>
          <div class="fin-row total-dark"><span>Due</span><span>Rs. ${parseFloat(challan.shop_current_balance).toFixed(0)}</span></div>
        </div>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Delivery Challan - ${challan.challan_number}</title>
  <style>
    @page { size: A6 portrait; margin: 2mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      width: auto;
      min-height: auto;
      margin: 0;
      padding: 0;
      background: white;
      color: #111;
      font-size: 6pt;
      line-height: 1.1;
    }
    .header {
      border-bottom: 1px solid #111;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 4px;
    }
    .company-name { font-size: 7.5pt; font-weight: 700; color: #111; }
    .header-meta { text-align: right; font-size: 5.5pt; line-height: 1.15; }
    .doc-title { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; }
    .company-details { font-size: 5pt; color: #444; margin-top: 1px; }
    .status-badge {
      display: inline-block;
      padding: 0 3px;
      border: 1px solid #333;
      font-size: 5pt;
      font-weight: 600;
      text-transform: uppercase;
    }
    .info-strip {
      border: 1px solid #ccc;
      padding: 2px 3px;
      margin-bottom: 4px;
      font-size: 5.5pt;
      line-height: 1.2;
    }
    .info-line { display: flex; gap: 3px; flex-wrap: wrap; }
    .info-line + .info-line { margin-top: 1px; }
    .info-tag { font-weight: 700; color: #333; }
    .items-two-col {
      display: flex;
      gap: 1.5mm;
      width: 100%;
      margin-bottom: 2px;
      align-items: flex-start;
    }
    .items-col { flex: 1; min-width: 0; width: 50%; }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 5pt;
      table-layout: fixed;
    }
    .items-table .col-num { width: 6%; }
    .items-table .col-item { width: 28%; }
    .items-table .col-qty { width: 12%; }
    .items-table .col-rate { width: 14%; }
    .items-table .col-disc { width: 14%; }
    .items-table .col-amt { width: 26%; }
    .items-table .disc-col .disc-amt { color: #333; font-weight: 600; }
    .items-table thead th {
      background: #eee;
      color: #111;
      padding: 1px 1px;
      text-align: left;
      font-weight: 700;
      font-size: 4.5pt;
      text-transform: uppercase;
      border: 1px solid #aaa;
    }
    .items-table thead th.right { text-align: right; }
    .items-table tbody td {
      padding: 1px 1px;
      border: 1px solid #ccc;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .items-table tbody td.right { text-align: right; white-space: nowrap; }
    .items-totals {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
      font-size: 5.5pt;
      table-layout: fixed;
    }
    .items-totals col.num { width: 6%; }
    .items-totals col.item { width: 28%; }
    .items-totals col.qty { width: 12%; }
    .items-totals col.rate { width: 14%; }
    .items-totals col.disc { width: 14%; }
    .items-totals col.amt { width: 26%; }
    .items-totals thead th {
      background: #eee;
      color: #111;
      padding: 1px 2px;
      text-align: left;
      font-weight: 700;
      font-size: 4.5pt;
      text-transform: uppercase;
      border: 1px solid #aaa;
    }
    .items-totals thead th.right { text-align: right; }
    .items-totals tbody td {
      padding: 1px 2px;
      font-weight: 700;
      border: 1px solid #aaa;
      font-size: 5.5pt;
    }
    .items-totals .right { text-align: right; }
    .notice-box {
      margin-bottom: 3px;
      padding: 2px 3px;
      border: 1px solid #ccc;
      font-size: 5.5pt;
      line-height: 1.15;
    }
    .notice-title { font-weight: 700; text-transform: uppercase; font-size: 5pt; }
    .financial-section { width: 72%; margin-left: auto; margin-bottom: 4px; }
    .fin-row {
      display: flex;
      justify-content: space-between;
      padding: 1px 2px;
      font-size: 5.5pt;
    }
    .fin-row.border { border-bottom: 1px solid #ddd; }
    .fin-row.total,
    .fin-row.total-dark {
      border: 1px solid #111;
      font-weight: 700;
      font-size: 6pt;
      padding: 2px 3px;
      margin-top: 1px;
    }
    .balance-block { margin-top: 2px; padding-top: 2px; border-top: 1px dashed #999; }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 4px;
      margin-top: 5px;
      padding-top: 3px;
      border-top: 1px solid #ccc;
    }
    .sig-box { text-align: center; }
    .sig-line { border-bottom: 1px solid #333; height: 12px; margin-bottom: 1px; }
    .sig-label { font-size: 5pt; font-weight: 600; color: #222; }
    .footer { text-align: center; margin-top: 3px; font-size: 4.5pt; color: #666; }
    @media print {
      body { width: auto; padding: 0; min-height: auto; }
      .items-table thead th,
      .items-totals thead th {
        background: #f3f3f3 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div class="company-name">${companyName}</div>
      <div class="header-meta">
        <div class="doc-title">Delivery Challan</div>
        <div>${challan.challan_number}</div>
        <div>${deliveryDate} | <span class="status-badge">${String(challan.status || 'pending').replace('_', ' ')}</span></div>
      </div>
    </div>
    <div class="company-details">${companyPhone}${companyAddress ? ' | ' + companyAddress : ''}</div>
  </div>

  <div class="info-strip">
    <div class="info-line">
      <span><span class="info-tag">Shop:</span> ${challan.shop_name}</span>
      <span><span class="info-tag">Ph:</span> ${challan.shop_contact || 'N/A'}</span>
      ${challan.salesman_name ? `<span><span class="info-tag">Sm:</span> ${challan.salesman_name}</span>` : ''}
    </div>
    <div class="info-line">
      <span><span class="info-tag">Addr:</span> ${challan.shop_address || 'N/A'}</span>
      ${challan.route_name ? `<span><span class="info-tag">Route:</span> ${challan.route_name}</span>` : ''}
    </div>
    <div class="info-line">
      <span><span class="info-tag">Driver:</span> ${challan.driver_name || 'N/A'}</span>
      <span><span class="info-tag">Veh:</span> ${challan.vehicle_number || 'N/A'}</span>
      <span><span class="info-tag">WH:</span> ${challan.warehouse_name || 'N/A'}</span>
      ${challan.order_id ? `<span><span class="info-tag">Ord:</span> #${challan.order_id}</span>` : ''}
    </div>
  </div>

  <div class="items-two-col">
    <div class="items-col">${leftTable}</div>
    <div class="items-col">${rightTable}</div>
  </div>

  <table class="items-totals">
    <colgroup>
      <col class="num" /><col class="item" /><col class="qty" /><col class="rate" /><col class="disc" /><col class="amt" />
    </colgroup>
    <thead>
      <tr>
        <th colspan="2">Total Items</th>
        <th class="right">Total Qty</th>
        <th></th>
        <th class="right">Total Disc</th>
        <th class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td colspan="2">${items.length}${hasReturns ? ` | ret ${totalReturnedUnits}` : ''}</td>
        <td class="right">${totalKeptQty}</td>
        <td class="right"></td>
        <td class="right">${totalLineDiscount > 0 ? `-${totalLineDiscount.toFixed(0)}` : '0'}</td>
        <td class="right">${sub.toFixed(0)}</td>
      </tr>
    </tbody>
  </table>

  ${returnsBlock}
  ${returnDocsBlock}

  <div class="financial-section">
    <div class="fin-row border"><span>Subtotal</span><span>${sub.toFixed(0)}</span></div>
    ${
      effectiveDiscount > 0
        ? `<div class="fin-row border"><span>Disc ${effectiveDiscountPct.toFixed(0)}%</span><span>-${effectiveDiscount.toFixed(0)}</span></div>`
        : ''
    }
    ${
      parseFloat(challan.tax_amount || 0) > 0
        ? `<div class="fin-row border"><span>Tax</span><span>+${parseFloat(challan.tax_amount || 0).toFixed(0)}</span></div>`
        : ''
    }
    <div class="fin-row total"><span>Grand Total</span><span>Rs. ${gt.toFixed(0)}</span></div>
    ${balanceBlock}
  </div>

  ${
    challan.notes
      ? `<div class="notice-box"><span class="notice-title">Note:</span> ${challan.notes}</div>`
      : ''
  }

  <div class="signatures">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Prepared</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Dispatch</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Driver</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Customer</div></div>
  </div>

  <div class="footer">
    ${new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
    · layout ${DELIVERY_PRINT_LAYOUT_VERSION}
  </div>
</body>
</html>`;
}
