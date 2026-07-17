export const CONTENT_TITLE_MAX_LENGTH = 80;

export const CONTENT_TITLE_MAX_LENGTH_MESSAGE =
  `عنوان نباید بیشتر از ${CONTENT_TITLE_MAX_LENGTH} کاراکتر باشد`;

export function getContentTitleValidationError(title: unknown): string | null {
  if (title == null) return null;
  if (typeof title !== "string" || !title.trim()) return "عنوان الزامی است";
  if (title.trim().length > CONTENT_TITLE_MAX_LENGTH) {
    return CONTENT_TITLE_MAX_LENGTH_MESSAGE;
  }
  return null;
}
