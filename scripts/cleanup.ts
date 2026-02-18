#!/usr/bin/env bun
import { $ } from "bun";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Script de limpeza que executa o comando 'clean' em todos os pacotes do monorepo
 * Remove node_modules e outros arquivos que não estão presentes no git
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../");

async function cleanup() {
	console.log("🧹 Iniciando limpeza do monorepo...\n");

	try {
		console.log("📦 Limpando raiz do projeto...");
		await $`cd ${rootDir} && bun run clean`.quiet();
		console.log("✅ Raiz limpa com sucesso!\n");

		const packagePaths =
			await $`find ${rootDir}/packages ${rootDir}/apps -name "package.json" -type f -not -path "*/node_modules/*" -not -path "*/.next/*"`.text();

		const packages = packagePaths
			.trim()
			.split("\n")
			.filter((path) => path.length > 0);

		console.log(`📦 Encontrados ${packages.length} pacotes para limpar\n`);

		for (const packagePath of packages) {
			const packageDir = packagePath.replace("/package.json", "");
			const packageName = packageDir.split("/").pop();

			try {
				console.log(`🔧 Limpando ${packageName}...`);
				await $`cd ${packageDir} && bun run clean`.nothrow().quiet();
				console.log(`✅ ${packageName} limpo com sucesso!`);
			} catch (error) {
				console.error(
					`⚠️  Erro ao limpar ${packageName}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
				);
			}
		}

		console.log("\n✨ Limpeza concluída com sucesso!");
	} catch (error) {
		console.error(
			`❌ Erro durante a limpeza: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
		);
		process.exit(1);
	}
}

cleanup();
