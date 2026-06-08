/**
 * Canonical order line-item and header calculations.
 *
 * Convention:
 *   gross_total / total_price = quantity × unit_price (before line discount)
 *   discount                  = line discount amount
 *   net_price                 = gross_total − discount
 */

const round2 = (value) => parseFloat((parseFloat(value) || 0).toFixed(2));

/**
 * Normalize a single order line item from any client payload.
 * Always derives gross from quantity × unit_price to avoid double-discount bugs
 * when clients send net values in total_price.
 */
function normalizeOrderLineItem(item) {
  const qty = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unit_price) || 0;
  const grossTotal = round2(qty * unitPrice);
  const discountAmount = round2(item.discount_amount ?? item.discount ?? 0);
  const expectedNet = round2(grossTotal - discountAmount);

  const storedNet = item.net_price != null && item.net_price !== ''
    ? round2(item.net_price)
    : null;

  // Heal legacy rows where discount was applied twice (stored net too low).
  const netPrice =
    storedNet != null && Math.abs(storedNet - expectedNet) < 0.02
      ? storedNet
      : expectedNet;

  const discountPercentage =
    item.discount_percentage != null && item.discount_percentage !== ''
      ? parseFloat(item.discount_percentage)
      : grossTotal > 0
        ? parseFloat(((discountAmount / grossTotal) * 100).toFixed(4))
        : 0;

  return {
    product_id: parseInt(item.product_id, 10),
    quantity: qty,
    unit_price: unitPrice,
    total_price: grossTotal,
    discount: discountAmount,
    discount_amount: discountAmount,
    discount_percentage: discountPercentage,
    net_price: netPrice,
  };
}

/**
 * Normalize all line items and derive consistent order header totals.
 */
function normalizeOrderPayload({ items = [], subtotal, discount_amount, total_amount }) {
  const normalizedItems = items.map(normalizeOrderLineItem);

  const itemsNetSubtotal = round2(
    normalizedItems.reduce((sum, item) => sum + item.net_price, 0)
  );
  const itemsGrossSubtotal = round2(
    normalizedItems.reduce((sum, item) => sum + item.total_price, 0)
  );
  const itemsDiscountTotal = round2(
    normalizedItems.reduce((sum, item) => sum + item.discount, 0)
  );

  const orderDiscount = round2(discount_amount ?? 0);
  const orderTotalAmount = round2(subtotal ?? itemsNetSubtotal);
  const orderNetAmount = round2(total_amount ?? (orderTotalAmount - orderDiscount));

  return {
    items: normalizedItems,
    total_amount: orderTotalAmount,
    discount: orderDiscount,
    net_amount: orderNetAmount,
    gross_subtotal: itemsGrossSubtotal,
    item_discount_total: itemsDiscountTotal,
    items_net_subtotal: itemsNetSubtotal,
  };
}

module.exports = {
  round2,
  normalizeOrderLineItem,
  normalizeOrderPayload,
};
