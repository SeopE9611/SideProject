export const PACKAGE_DEDUCTION_POLICY = {
  // 'onSubmit' | 'onComplete' 중 하나
  when: (process.env.PASS_DEDUCT_WHEN as 'onSubmit' | 'onComplete') ?? 'onSubmit',
};
