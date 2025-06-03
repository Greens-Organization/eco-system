import { statSync } from 'node:fs'
import { dirname, isAbsolute, join, parse, resolve } from 'node:path'
import { cwd as getCwd } from 'node:process'
import { fileURLToPath } from 'node:url'

const toPath = (urlOrPath: string | URL): string =>
  urlOrPath instanceof URL ? fileURLToPath(urlOrPath) : urlOrPath

export async function searchUp(
  name: string,
  options: {
    cwd?: string | URL
    type?: 'file' | 'directory'
    stopAt?: string | URL
  } = {}
): Promise<string | undefined> {
  const cwd = resolve(toPath(options.cwd ?? getCwd()))
  const stopAt = resolve(cwd, toPath(options.stopAt ?? parse(cwd).root))
  const isAbsoluteName = isAbsolute(name)
  let directory = cwd

  while (directory) {
    const target = isAbsoluteName ? name : join(directory, name)
    const file = Bun.file(target)

    if (await file.exists()) {
      if (options.type === 'directory' && target.endsWith('/')) {
        return target
      }

      if (options.type === 'file' || options.type === undefined) {
        return target
      }
    }

    if (directory === stopAt || directory === parse(directory).root) {
      break
    }

    directory = dirname(directory)
  }

  return undefined
}

export function searchUpSync(
  name: string,
  options: {
    cwd?: string | URL
    type?: 'file' | 'directory'
    stopAt?: string | URL
  } = {}
): string | undefined {
  const cwd = resolve(toPath(options.cwd ?? getCwd()))
  const stopAt = resolve(cwd, toPath(options.stopAt ?? parse(cwd).root))
  const isAbsoluteName = isAbsolute(name)
  let directory = cwd

  while (directory) {
    const target = isAbsoluteName ? name : join(directory, name)

    try {
      const stats = statSync(target, { throwIfNoEntry: false })
      if (
        (options.type === 'file' && stats?.isFile()) ||
        (options.type === 'directory' && stats?.isDirectory()) ||
        options.type === undefined
      ) {
        return target
      }
    } catch {}

    if (directory === stopAt || directory === parse(directory).root) {
      break
    }

    directory = dirname(directory)
  }

  return undefined
}
