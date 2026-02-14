export function confirmDeleteSnapshots(count: number) {
  return confirm(`선택한 ${count}개의 스냅샷을 삭제하시겠습니까?`);
}

export function confirmDeleteSnapshot(yyyymm: string) {
  return confirm(`${yyyymm} 스냅샷을 삭제하시겠습니까?`);
}
