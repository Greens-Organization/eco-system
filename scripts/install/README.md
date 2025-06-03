# Bun Workspace Linker

Uma solução simples e eficiente para criar `node_modules` isolados em cada workspace do Bun, similar ao comportamento do pnpm.

## 🎯 O Problema

O Bun instala todas as dependências no `node_modules` raiz (hoisting), o que pode causar problemas com ferramentas que esperam encontrar suas dependências localmente (como Storybook, ESLint, etc).

## 💡 A Solução

O `bun-workspace-linker` cria symlinks automáticos das dependências do root para cada workspace, mantendo a performance do Bun mas com isolamento de dependências.

## 🚀 Instalação

1. Copie o arquivo `bun-workspace-linker.ts` para a raiz do seu monorepo

2. Adicione os scripts no `package.json`:

```json
{
  "scripts": {
    "postinstall": "bun bun-workspace-linker.ts",
    "workspaces:link": "bun bun-workspace-linker.ts",
    "workspaces:clean": "bun bun-workspace-linker.ts clean",
    "workspaces:verify": "bun bun-workspace-linker.ts verify"
  }
}
```

3. Execute `bun install` - o postinstall criará os links automaticamente

## 📋 Comandos

```bash
# Criar links (executado automaticamente no postinstall)
bun run workspaces:link

# Limpar todos os node_modules dos workspaces
bun run workspaces:clean

# Verificar se todos os links estão corretos
bun run workspaces:verify

# Modo verbose para debug
bun bun-workspace-linker.ts --verbose
```

## 🏗️ Como Funciona

1. **Análise**: Lê o `package.json` raiz e identifica todos os workspaces
2. **Descoberta**: Encontra todas as dependências de cada workspace
3. **Linking**: Cria symlinks do `node_modules` raiz para cada workspace
4. **Catalogs**: Resolve automaticamente referências de catalog

## 📁 Estrutura Resultante

```
monorepo/
├── node_modules/              # Dependências reais (instaladas pelo Bun)
│   ├── react/
│   ├── vite/
│   └── ...
├── packages/
│   ├── app/
│   │   ├── node_modules/      # Symlinks para dependências necessárias
│   │   │   ├── react -> ../../../node_modules/react
│   │   │   ├── vite -> ../../../node_modules/vite
│   │   │   └── ui -> ../../ui  # Link para outro workspace
│   │   └── package.json
│   └── ui/
│       ├── node_modules/      # Symlinks para dependências necessárias
│       │   └── react -> ../../../node_modules/react
│       └── package.json
└── package.json
```

## ⚙️ Funcionalidades

- ✅ Suporta todos os tipos de dependências (dependencies, devDependencies, peerDependencies, optionalDependencies)
- ✅ Resolve referências de catalog automáticamente
- ✅ Cria links entre workspaces quando usando `workspace:*`
- ✅ Funciona com pacotes scoped (@scope/package)
- ✅ Não interfere com o funcionamento normal do Bun
- ✅ Performance rápida - apenas cria symlinks

## 🔍 Troubleshooting

### Dependência não encontrada no workspace

Execute com `--verbose` para ver detalhes:
```bash
bun bun-workspace-linker.ts --verbose
```

### Links quebrados após atualizar dependências

Execute novamente o linker:
```bash
bun run workspaces:link
```

### Verificar integridade dos links

```bash
bun run workspaces:verify
```

## 📝 Notas

- Os symlinks são ignorados pelo git por padrão
- O script não modifica o comportamento do Bun
- Compatível com CI/CD - roda automaticamente no postinstall
- Não cria diretórios `.bin` (deixa para os próprios pacotes gerenciarem)

## 🤝 Contribuindo

Este é um script simples e focado. Sugestões de melhorias são bem-vindas!

## ⚡ Performance

O script é extremamente rápido pois:
- Usa apenas operações de filesystem (symlinks)
- Não modifica ou copia arquivos
- Aproveita o cache do Bun
- Roda em paralelo quando possível