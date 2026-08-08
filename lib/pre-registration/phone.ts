/** Normalize Iranian mobile numbers to 09xxxxxxxxx. */
export function normalizeIranMobile(input: string): string | null {
  let digits = input.replace(/[^\d۰-۹٠-٩]/g, "");
  digits = digits
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

  if (digits.startsWith("0098")) digits = digits.slice(4);
  else if (digits.startsWith("98") && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith("9") && digits.length === 10) digits = `0${digits}`;

  if (!/^09\d{9}$/.test(digits)) return null;
  return digits;
}

export function maskIranMobile(phone09: string): string {
  if (phone09.length < 8) return phone09;
  return `${phone09.slice(0, 4)}***${phone09.slice(-2)}`;
}
