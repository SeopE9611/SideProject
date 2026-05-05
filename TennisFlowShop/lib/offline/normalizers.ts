export function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D+/g, "");
}

export function maskPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length < 7) return phone;
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
  }
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  const value = email.trim().toLowerCase();
  return value.length ? value : null;
}
