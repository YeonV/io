export const camelToSnake = (str: string) =>
  str[0].toLowerCase() +
  str
    .slice(1, str.length)
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

export const download = (
  content: any,
  fileName: string,
  contentType: string
) => {
  const a = document.createElement('a');
  const file = new Blob([JSON.stringify(content, null, 4)], {
    type: contentType,
  });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
};