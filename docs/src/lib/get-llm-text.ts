import type { source } from '@/lib/source';
import type { InferPageType } from 'fumadocs-core/source';
import { remarkInclude } from 'fumadocs-mdx/config';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';

const processor = remark().use(remarkMdx).use(remarkInclude).use(remarkGfm);

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await processor.process({
    path: page.data._file.absolutePath,
    value: page.data.content,
  });

  // Para desenvolvimento local, use a API local
  const isDev = process.env.NODE_ENV === 'development';
  console.log(isDev);
  const sourceUrl = isDev
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/raw/${page.data._file.relativePath.replace(/\.mdx?$/, '')}`
    : `https://raw.githubusercontent.com/SEU-USUARIO/SEU-REPO/refs/heads/main/content/docs/${page.data._file.relativePath}`;

  return `# ${page.data.title}
URL: ${page.url}
Source: ${sourceUrl}
${page.data.description || ''}

${processed.value}`;
}
