/**
 * 将文本截断到至多 `maxLength` 个字符，并附加一个标记，
 * 告诉模型（和用户）被裁掉了多少内容。
 */
export function truncate(text: string, maxLength = 20_000): string {
  if (text.length <= maxLength) {
    return text;
  }
  const omitted = text.length - maxLength;
  return `${text.slice(0, maxLength)}\n... [truncated ${omitted} characters]`;
}
