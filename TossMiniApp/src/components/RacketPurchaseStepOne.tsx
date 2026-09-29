import type { RacketStringProductPickerProps } from "./RacketStringProductPicker";
import RacketStringProductPicker from "./RacketStringProductPicker";

export default function RacketPurchaseStepOne(props: Omit<RacketStringProductPickerProps, "mode">) {
  return <RacketStringProductPicker {...props} mode="racket-purchase" />;
}
