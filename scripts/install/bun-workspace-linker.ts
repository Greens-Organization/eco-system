#!/usr/bin/env bun
import { exists, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { $ } from 'bun';
import { searchUpSync } from '../utils/search-up.js';

interface PackageJson {
  name: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface WorkspaceInfo {
  path: string;
  name: string;
  packageJson: PackageJson;
  dependencies: Map<string, string>;
}

interface RootPackageJson extends PackageJson {
  workspaces?:
    | string[]
    | {
        packages?: string[];
        catalog?: Record<string, string>;
        catalogs?: Record<string, Record<string, string>>;
      };
}

class BunWorkspaceLinker {
  private rootPath: string;
  private rootPackageJson: RootPackageJson;
  private workspaces: Map<string, WorkspaceInfo> = new Map();
  private catalog: Record<string, string> = {};
  private catalogs: Record<string, Record<string, string>> = {};
  private verbose: boolean;

  constructor(rootPath?: string, verbose = false) {
    // If rootPath is not provided, search for it
    if (!rootPath) {
      const foundPath = searchUpSync('package.json', { cwd: process.cwd(), type: 'file' });
      if (!foundPath) {
        throw new Error('Could not find package.json');
      }
      rootPath = dirname(foundPath);
    }
    
    this.rootPath = rootPath;
    this.rootPackageJson = {} as RootPackageJson;
    this.verbose = verbose;
  }

  async link() {
    console.log('🚀 Bun Workspace Linker\n');

    try {
      // 1. Read root package.json and extract catalogs
      await this.readRootPackageJson();

      // 2. Discover all workspaces
      await this.discoverWorkspaces();

      // 3. Create symlinks for each workspace
      await this.mergeWorkspaceLinks();

      console.log('\n✅ Workspace linking completed successfully!');
    } catch (error) {
      console.error('\n❌ Error:', error);
      process.exit(1);
    }
  }

  private async readRootPackageJson() {
    const packageJsonPath = join(this.rootPath, 'package.json');
    const file = Bun.file(packageJsonPath);

    if (!(await file.exists())) {
      throw new Error('No package.json found in root directory');
    }

    this.rootPackageJson = await file.json();

    if (typeof this.rootPackageJson.workspaces === 'object' && !Array.isArray(this.rootPackageJson.workspaces)) {
      this.catalog = this.rootPackageJson.workspaces.catalog || {};
      this.catalogs = this.rootPackageJson.workspaces.catalogs || {};
    }

    this.log('📦 Root package.json loaded');
  }

  private async discoverWorkspaces() {
    const patterns = this.getWorkspacePatterns();
    this.log(`🔍 Workspace patterns: ${JSON.stringify(patterns)}`);
    this.log(`🔍 Root path: ${this.rootPath}`);

    for (const pattern of patterns) {
      if (pattern.endsWith('/*')) {
        const baseDir = join(this.rootPath, pattern.slice(0, -2));
        this.log(`📂 Checking directory: ${baseDir}`);
        
        if (await exists(baseDir)) {
          const entries = await readdir(baseDir, { withFileTypes: true });
          
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const workspacePath = join(baseDir, entry.name);
              const packageJsonPath = join(workspacePath, 'package.json');
              
              if (await exists(packageJsonPath)) {
                await this.addWorkspace(workspacePath);
              }
            }
          }
        } else {
          this.log(`⚠️  Directory not found: ${baseDir}`);
        }
      } else if (pattern.includes('*')) {
        const glob = new Bun.Glob(pattern);
        
        for await (const file of glob.scan({ cwd: this.rootPath })) {
          const workspacePath = join(this.rootPath, file);
          const packageJsonPath = join(workspacePath, 'package.json');
          
          if (await exists(packageJsonPath)) {
            await this.addWorkspace(workspacePath);
          }
        }
      } else {
        const workspacePath = join(this.rootPath, pattern);
        const packageJsonPath = join(workspacePath, 'package.json');
        
        if (await exists(packageJsonPath)) {
          await this.addWorkspace(workspacePath);
        }
      }
    }

    console.log(`\n📊 Total workspaces found: ${this.workspaces.size}`);
  }
  
  private async addWorkspace(workspacePath: string) {
    const packageJsonPath = join(workspacePath, 'package.json');
    const packageJson = await Bun.file(packageJsonPath).json();
    const dependencies = this.extractAllDependencies(packageJson);
    
    const workspaceInfo: WorkspaceInfo = {
      path: workspacePath,
      name: packageJson.name || workspacePath,
      packageJson,
      dependencies
    };
    
    this.workspaces.set(workspaceInfo.name, workspaceInfo);
    console.log(`📁 Found workspace: ${workspaceInfo.name} (${relative(this.rootPath, workspacePath)})`);
  }

  private getWorkspacePatterns(): string[] {
    const workspaces = this.rootPackageJson.workspaces;

    if (Array.isArray(workspaces)) {
      return workspaces;
    }
    
    if (workspaces?.packages) {
      return workspaces.packages;
    }

    return [];
  }

  private extractAllDependencies(
    packageJson: PackageJson
  ): Map<string, string> {
    const deps = new Map<string, string>();

    const depFields = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ] as const;

    for (const field of depFields) {
      const dependencies = packageJson[field];
      if (dependencies) {
        for (const [name, version] of Object.entries(dependencies)) {
          let resolvedVersion = version;

          if (version.startsWith('catalog:')) {
            const catalogRef = version.substring(8);
            if (catalogRef === '') {
              resolvedVersion = this.catalog[name] || version;
            } else {
              resolvedVersion = this.catalogs[catalogRef]?.[name] || version;
            }
          }

          // Skip workspace protocol dependencies
          if (!resolvedVersion.startsWith('workspace:')) {
            deps.set(name, resolvedVersion);
            this.log(`  📌 ${name}@${resolvedVersion} (from ${field})`);
          }
        }
      }
    }

    return deps;
  }

  private async createWorkspaceLinks() {
    const rootNodeModules = join(this.rootPath, 'node_modules');

    if (!(await exists(rootNodeModules))) {
      console.log("\n⚠️  Root node_modules not found. Run 'bun install' first.");
      return;
    }

    console.log('\n🔗 Creating workspace links...\n');

    for (const [name, workspace] of this.workspaces) {
      console.log(`📦 Processing ${name}...`);

      const workspaceNodeModules = join(workspace.path, 'node_modules');

      await $`mkdir -p ${workspaceNodeModules}`.quiet();

      let linkedCount = 0;
      let skippedCount = 0;

      for (const [depName, depVersion] of workspace.dependencies) {
        console.log(depName)
        const sourcePath = join(rootNodeModules, depName);
        const targetPath = join(workspaceNodeModules, depName);

        if (await exists(sourcePath)) {
          if (depName.includes('/')) {
            const parentDir = dirname(targetPath);
            await $`mkdir -p ${parentDir}`.quiet();
          }

          await $`rm -rf ${targetPath}`.quiet().nothrow();

          const relativePath = relative(dirname(targetPath), sourcePath);
          await $`ln -s ${relativePath} ${targetPath}`.quiet();

          linkedCount++;
          this.log(`  ✅ Linked ${depName}`);
        } else {
          skippedCount++;
          this.log(`  ⏭️  Skipped ${depName} (not found in root)`);
        }
      }

      let workspaceLinkedCount = 0;
      for (const [otherName, otherWorkspace] of this.workspaces) {
        if (otherName !== name) {
          const depVersion =
            workspace.packageJson.dependencies?.[otherName] ||
            workspace.packageJson.devDependencies?.[otherName] ||
            workspace.packageJson.peerDependencies?.[otherName];
      
          if (depVersion?.startsWith('workspace:')) {
            const targetPath = join(workspaceNodeModules, otherName);
            
            if (otherName.includes('/')) {
              const parentDir = dirname(targetPath);
              await $`mkdir -p ${parentDir}`.quiet();
            }
            
            const relativePath = relative(
              dirname(targetPath),
              otherWorkspace.path
            );
      
            await $`rm -rf ${targetPath}`.quiet().nothrow();
            await $`ln -s ${relativePath} ${targetPath}`.quiet();
      
            workspaceLinkedCount++;
            this.log(`  🔗 Linked workspace ${otherName}`);
          }
        }
      }

      console.log(
        `  📊 Summary: ${linkedCount} packages linked, ${workspaceLinkedCount} workspaces linked, ${skippedCount} skipped\n`
      );
    }
  }

  private async mergeWorkspaceLinks() {
    const rootNodeModules = join(this.rootPath, 'node_modules');
    
    console.log('\n🔗 Merging workspace dependencies...\n');
  
    for (const [name, workspace] of this.workspaces) {
      console.log(`📦 Processing ${name}...`);
  
      const workspaceNodeModules = join(workspace.path, 'node_modules');
      
      // Ensure workspace node_modules exists
      await $`mkdir -p ${workspaceNodeModules}`.quiet();
  
      // Strategy: Only link what's in root, preserve everything else
      for (const [depName, depVersion] of workspace.dependencies) {
        // Never touch these special directories
        const preservedDirs = ['.bin', '.cache', '.pnpm', '.vite'];
        if (preservedDirs.includes(depName)) {
          continue;
        }
  
        const sourcePath = join(rootNodeModules, depName);
        const targetPath = join(workspaceNodeModules, depName);
  
        // Only create link if:
        // 1. Dependency exists in root
        // 2. It doesn't exist in workspace OR it's not a local-only dependency
        if (await exists(sourcePath)) {
          const targetExists = await exists(targetPath);
          
          if (!targetExists) {
            // Simple case: create the link
            if (depName.includes('/')) {
              const parentDir = dirname(targetPath);
              await $`mkdir -p ${parentDir}`.quiet();
            }
            
            const relativePath = relative(dirname(targetPath), sourcePath);
            await $`ln -s ${relativePath} ${targetPath}`.quiet();
            this.log(`  ✅ Linked ${depName}`);
          } else {
            // Check if it's already a symlink to the right place
            try {
              const stats = await Bun.file(targetPath).stat();
              if (!stats.isSymbolicLink) {
                // It's a real directory/file, check if we should replace it
                const rootPackageJson = join(sourcePath, 'package.json');
                const localPackageJson = join(targetPath, 'package.json');
                
                if (await exists(rootPackageJson) && await exists(localPackageJson)) {
                  const rootPkg = await Bun.file(rootPackageJson).json();
                  const localPkg = await Bun.file(localPackageJson).json();
                  
                  // Only replace if versions match (same package)
                  if (rootPkg.name === localPkg.name && rootPkg.version === localPkg.version) {
                    await $`rm -rf ${targetPath}`.quiet();
                    const relativePath = relative(dirname(targetPath), sourcePath);
                    await $`ln -s ${relativePath} ${targetPath}`.quiet();
                    this.log(`  ♻️  Replaced ${depName} with link`);
                  } else {
                    this.log(`  🔒 Kept local ${depName}@${localPkg.version} (root has ${rootPkg.version})`);
                  }
                }
              }
            } catch (e) {
              this.log(`  ⚠️  Error checking ${depName}: ${e}`);
            }
          }
        }
      }
    }
  }

  async clean() {
    console.log('🧹 Cleaning workspace node_modules...\n');

    await this.readRootPackageJson();
    await this.discoverWorkspaces();

    for (const [name, workspace] of this.workspaces) {
      const workspaceNodeModules = join(workspace.path, 'node_modules');

      if (await exists(workspaceNodeModules)) {
        await $`rm -rf ${workspaceNodeModules}`.quiet();
        console.log(`✅ Cleaned ${name}`);
      }
    }

    console.log('\n🧹 Cleanup completed!');
  }

  async verify() {
    console.log('🔍 Verifying workspace setup...\n');

    await this.readRootPackageJson();
    await this.discoverWorkspaces();

    let issues = 0;

    for (const [name, workspace] of this.workspaces) {
      console.log(`📦 Checking ${name}...`);

      const workspaceNodeModules = join(workspace.path, 'node_modules');

      if (!(await exists(workspaceNodeModules))) {
        console.log(`  ❌ Missing node_modules directory`);
        issues++;
        continue;
      }

      let missingDeps = 0;
      for (const [depName] of workspace.dependencies) {
        const depPath = join(workspaceNodeModules, depName);
        if (!(await exists(depPath))) {
          this.log(`  ❌ Missing: ${depName}`);
          missingDeps++;
        }
      }

      if (missingDeps === 0) {
        console.log(`  ✅ All dependencies linked`);
      } else {
        console.log(`  ⚠️  Missing ${missingDeps} dependencies`);
        issues++;
      }
    }

    console.log(
      `\n${issues === 0 ? '✅ All workspaces verified!' : `⚠️  Found ${issues} issues`}`
    );
  }

  private log(message: string) {
    if (this.verbose) {
      console.log(message);
    }
  }
}

const args = process.argv.slice(2);

const command = args.find((arg) => !arg.startsWith('-')) || 'link';
const verbose = args.includes('--verbose') || args.includes('-v');
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log(`
Bun Workspace Linker - Create isolated node_modules for each workspace

Usage:
  bun-workspace-linker [command] [options]

Commands:
  link      Create symlinks for all workspace dependencies (default)
  clean     Remove all workspace node_modules directories
  verify    Check if all dependencies are properly linked

Options:
  --verbose, -v    Show detailed output
  --help, -h       Show this help message

Examples:
  bun-workspace-linker              # Link all workspaces
  bun-workspace-linker clean        # Clean workspace node_modules
  bun-workspace-linker verify -v    # Verify with detailed output
`);
  process.exit(0);
}

const linker = new BunWorkspaceLinker(undefined, verbose);

switch (command) {
  case 'link':
    await linker.link();
    break;
  case 'clean':
    await linker.clean();
    break;
  case 'verify':
    await linker.verify();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}