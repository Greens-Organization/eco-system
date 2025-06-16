import { getLLMText } from '@/lib/get-llm-text';
import { source } from '@/lib/source';
import { type NextRequest, NextResponse } from 'next/server';

export const revalidate = false;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await context.params;

    let pageSlug = slug;
    if (slug[0] !== 'docs') {
      pageSlug = ['docs', ...slug];
    }

    const page = source.getPage(pageSlug);

    if (!page) {
      const alternativeSlug = slug[0] === 'docs' ? slug.slice(1) : slug;
      const alternativePage = source.getPage(alternativeSlug);

      if (!alternativePage) {
        return new NextResponse(
          `Página não encontrada para: ${slug.join('/')}`,
          { status: 404 }
        );
      }

      const content = await getLLMText(alternativePage);
      return new NextResponse(content, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const content = await getLLMText(page);
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('Erro na API:', error);
    return new NextResponse(`Erro interno: ${error}`, { status: 500 });
  }
}
