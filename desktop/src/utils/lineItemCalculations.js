/**
 * Shared line-item financial display (orders + deliveries).
 *
 * Convention:
 *   grossTotal = quantity × unit_price
 *   discountAmount = line discount
 *   netPrice = grossTotal − discountAmount
 */

const round2 = (value) => parseFloat((parseFloat(value) || 0).toFixed(2));

export function getLineDisplayValues(item) {
  const qty = parseFloat(
    item.quantity_delivered ?? item.quantity_ordered ?? item.quantity ?? 0
  );
  const unitPrice = parseFloat(item.unit_price) || 0;
  const grossTotal = round2(qty * unitPrice);

  const storedNetRaw = item.net_amount ?? item.net_price;
  const storedNet =
    storedNetRaw != null && storedNetRaw !== '' ? parseFloat(storedNetRaw) : null;

  let discountAmount = round2(item.discount_amount ?? item.discount ?? 0);

  if (
    discountAmount === 0 &&
    storedNet != null &&
    Number.isFinite(storedNet) &&
    storedNet < grossTotal - 0.01
  ) {
    discountAmount = round2(grossTotal - storedNet);
  }

  const expectedNet = round2(grossTotal - discountAmount);

  let netPrice = expectedNet;
  if (storedNet != null && Number.isFinite(storedNet)) {
    if (Math.abs(storedNet - expectedNet) < 0.02) {
      netPrice = round2(storedNet);
    } else if (storedNet < grossTotal - 0.01) {
      netPrice = round2(storedNet);
      if (discountAmount === 0) {
        discountAmount = round2(grossTotal - netPrice);
      }
    }
  }

  if (discountAmount > 0 && Math.abs(netPrice - grossTotal) < 0.02) {
    netPrice = expectedNet;
  }

  const discountPercentage =
    item.discount_percentage != null && item.discount_percentage !== ''
      ? parseFloat(item.discount_percentage)
      : grossTotal > 0
        ? parseFloat(((discountAmount / grossTotal) * 100).toFixed(4))
        : 0;

  return { grossTotal, discountAmount, discountPercentage, netPrice };
}

export function sumLineNetPrices(items) {
  return round2(
    (items || []).reduce((sum, item) => sum + getLineDisplayValues(item).netPrice, 0)
  );
}

export function formatOrderDiscountPct(pct) {
  const value = parseFloat(pct) || 0;
  if (value <= 0) return '0';
  if (value < 10) return value.toFixed(1);
  return value.toFixed(0);
}
