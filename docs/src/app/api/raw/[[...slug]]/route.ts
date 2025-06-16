import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await context.params;

    // Caminho para o arquivo na pasta content
    const filePath = join(process.cwd(), 'content', 'docs', ...slug);

    console.log('Tentando ler arquivo:', filePath);

    // Tenta diferentes extensões
    let content: string;
    let actualPath: string;

    try {
      actualPath = `${filePath}.mdx`;
      content = await readFile(actualPath, 'utf-8');
    } catch {
      try {
        actualPath = `${filePath}.md`;
        content = await readFile(actualPath, 'utf-8');
      } catch {
        return new NextResponse(
          `Arquivo não encontrado: ${filePath}.mdx ou ${filePath}.md`,
          { status: 404 }
        );
      }
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Erro lendo arquivo:', error);
    return new NextResponse(`Erro: ${error}`, { status: 500 });
  }
}
