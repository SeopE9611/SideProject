export function racketConditionLabel(condition?: string | null) {
  switch (condition) {
    case "A":
      return "최상급";
    case "B":
      return "양호";
    case "C":
      return "보통";
    default:
      return condition ?? "";
  }
}
