/**
 * İstemci Taraflı Canlı AMM Hesaplayıcı (useAMMCalculator)
 * docs/WEB_FRONTEND_SPEC.md ile %100 uyumlu matematiksel fonksiyonlar.
 */

export interface BuyPreview {
  sharesReceived: number;
  potentialProfit: number;
  roiPercent: number;
  newYesProb: number;
  newNoProb: number;
}

export interface SellPreview {
  payoutKp: number;
  newYesProb: number;
  newNoProb: number;
}

export function calculateBuyPreview(
  side: "YES" | "NO",
  investmentKp: number,
  yesPool: number,
  noPool: number
): BuyPreview {
  if (investmentKp <= 0) {
    const total = yesPool + noPool;
    const yesProb = total > 0 ? (noPool / total) * 100 : 50;
    return {
      sharesReceived: 0,
      potentialProfit: 0,
      roiPercent: 0,
      newYesProb: Number(yesProb.toFixed(1)),
      newNoProb: Number((100 - yesProb).toFixed(1)),
    };
  }

  const k = yesPool * noPool;
  let sharesReceived = 0;
  let newYesPool = yesPool;
  let newNoPool = noPool;

  if (side === "YES") {
    newNoPool = noPool + investmentKp;
    newYesPool = k / newNoPool;
    sharesReceived = yesPool + investmentKp - newYesPool;
  } else {
    newYesPool = yesPool + investmentKp;
    newNoPool = k / newYesPool;
    sharesReceived = noPool + investmentKp - newNoPool;
  }

  const newYesProb = (newNoPool / (newYesPool + newNoPool)) * 100;
  const potentialProfit = sharesReceived - investmentKp; // 1 Kazanan Hisse = 1 KP

  return {
    sharesReceived: Number(sharesReceived.toFixed(2)),
    potentialProfit: Number(potentialProfit.toFixed(2)),
    roiPercent: Number(((potentialProfit / investmentKp) * 100).toFixed(1)),
    newYesProb: Number(newYesProb.toFixed(1)),
    newNoProb: Number((100 - newYesProb).toFixed(1)),
  };
}

export function calculateSellPreview(
  side: "YES" | "NO",
  sharesToSell: number,
  yesPool: number,
  noPool: number
): SellPreview {
  if (sharesToSell <= 0) {
    const total = yesPool + noPool;
    const yesProb = total > 0 ? (noPool / total) * 100 : 50;
    return {
      payoutKp: 0,
      newYesProb: Number(yesProb.toFixed(1)),
      newNoProb: Number((100 - yesProb).toFixed(1)),
    };
  }

  const k = yesPool * noPool;
  let payoutKp = 0;
  let newYesPool = yesPool;
  let newNoPool = noPool;

  if (side === "YES") {
    const y = yesPool + sharesToSell;
    const n = noPool;
    const discriminant = Math.pow(y - n, 2) + 4 * k;
    payoutKp = (y + n - Math.sqrt(discriminant)) / 2;
    newYesPool = y - payoutKp;
    newNoPool = n - payoutKp;
  } else {
    const n = noPool + sharesToSell;
    const y = yesPool;
    const discriminant = Math.pow(n - y, 2) + 4 * k;
    payoutKp = (n + y - Math.sqrt(discriminant)) / 2;
    newNoPool = n - payoutKp;
    newYesPool = y - payoutKp;
  }

  const newYesProb = (newNoPool / (newYesPool + newNoPool)) * 100;

  return {
    payoutKp: Number(payoutKp.toFixed(2)),
    newYesProb: Number(newYesProb.toFixed(1)),
    newNoProb: Number((100 - newYesProb).toFixed(1)),
  };
}
