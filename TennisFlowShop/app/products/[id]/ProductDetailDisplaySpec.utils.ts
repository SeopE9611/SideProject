import { stringBrandLabel, stringColorLabel, stringMaterialLabel } from "@/lib/constants";
import { formatGaugeLabel } from "@/lib/formatGaugeLabel";
import { hasPaidMountingFee } from "@/lib/orders/string-mounting-policy";

type ProductDetailDisplaySpecParams = {
  product: any;
  gaugeOptions: string[];
};

export function buildProductDetailDisplaySpec({
  product,
  gaugeOptions,
}: ProductDetailDisplaySpecParams) {
  const spec = product?.specifications || {};
  const origin = spec.origin ?? spec.madeIn ?? spec.제조국 ?? product?.origin ?? product?.madeIn;
  const brand = stringBrandLabel(product?.brand || spec.brand);
  const material =
    stringMaterialLabel(product?.material) || stringMaterialLabel(spec.material) || spec.소재;
  const gaugeRaw = product?.gauge ?? spec.gauge ?? spec.게이지;
  const gauge =
    gaugeOptions.length > 1
      ? gaugeOptions.map((v: string) => formatGaugeLabel(v)).join(" / ")
      : formatGaugeLabel(gaugeRaw);
  const color = stringColorLabel(product?.color) || stringColorLabel(spec.color) || spec.색상;
  const lengthRaw = product?.length ?? spec.length ?? spec.길이;
  const length =
    typeof lengthRaw === "string" && /^\d+(\.\d+)?$/.test(lengthRaw)
      ? `${lengthRaw}m`
      : lengthRaw;

  const display: Record<string, any> = {
    브랜드: brand,
    재질: material,
    "게이지(굵기)": gauge,
    색상: color,
    길이: length,
  };

  if (origin) display["제조국"] = origin;

  if (hasPaidMountingFee(product?.mountingFee)) {
    display["장착 서비스 비용"] = `${Number(product.mountingFee).toLocaleString()}원`;
  }

  return display;
}

export function buildProductDetailHybridDisplay(product: any) {
  const hybridSpec = (product as any)?.specifications?.hybrid;
  const hMain = hybridSpec?.main ?? {};
  const hCross = hybridSpec?.cross ?? {};

  return {
    hybridSpec,
    hMain,
    hCross,
    hMainBrand: stringBrandLabel(hMain.brand),
    hCrossBrand: stringBrandLabel(hCross.brand),
    hMainGauge: formatGaugeLabel(hMain.gauge),
    hCrossGauge: formatGaugeLabel(hCross.gauge),
    hMainColor: stringColorLabel(hMain.color),
    hCrossColor: stringColorLabel(hCross.color),
  };
}
