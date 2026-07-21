export function renderMarketingPreview(
  heading: string,
  story: string,
  customerName: string,
): string {
  const name = customerName.trim() || 'there';
  const replaceName = (text: string) => text.replace(/\{\{name\}\}/gi, name);

  return [
    `*${replaceName(heading.trim())}*`,
    '',
    `Hi ${name},`,
    '',
    replaceName(story.trim()),
    '',
    '— Team Singari Sarees',
    'singarisarees.com',
  ].join('\n');
}
