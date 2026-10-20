/**
 * Compatibilidade temporária Expo SDK 57 / Gradle autolinking Android.
 *
 * Kotlin Publication exige groupId, artifactId, version, repository. Algumas
 * versões de pacotes Expo publicam metadados opcionais incompletos. Como o
 * projeto usa buildFromSource para os módulos Expo Android, estes blocos
 * incompletos não são necessários. Eles impedem a desserialização ANTES
 * de o Gradle aplicar buildFromSource.
 *
 * Apenas altera node_modules/ após npm ci; NÃO altera dependências, lockfile
 * ou arquivos de código versionados. Registra os pacotes corrigidos no CI.
 */
const fs = require('node:fs');
const path = require('node:path');

const REQUIRED = ['groupId', 'artifactId', 'version', 'repository'];
function isMalformed(pub) {
  return pub != null && (typeof pub !== 'object' || Array.isArray(pub) ||
    REQUIRED.some(key => typeof pub[key] !== 'string' || pub[key].trim() === ''));
}
function repairConfig(config) {
  const fixed = [];
  if (!config || typeof config !== 'object' || !config.android || typeof config.android !== 'object') return fixed;
  if (isMalformed(config.android.publication)) {
    delete config.android.publication;
    fixed.push('android.publication');
  }
  if (Array.isArray(config.android.projects)) {
    config.android.projects.forEach((project, index) => {
      if (project && typeof project === 'object' && isMalformed(project.publication)) {
        delete project.publication;
        fixed.push(`android.projects[${index}].publication`);
      }
    });
  }
  return fixed;
}
function walkModules(directory, seen = new Set(), depth = 0) {
  if (!fs.existsSync(directory) || depth > 6) return [];
  const canonical = fs.realpathSync(directory);
  if (seen.has(canonical)) return [];
  seen.add(canonical);
  const changed = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === '.bin') continue;
    const entryPath = path.join(directory, entry.name);
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    if (entry.name.startsWith('@')) {
      changed.push(...walkModules(entryPath, seen, depth + 1));
      continue;
    }
    const configPath = path.join(entryPath, 'expo-module.config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(raw);
      const fields = repairConfig(config);
      if (fields.length > 0) {
        fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
        changed.push({ package: entry.name, fields });
      }
    }
    // Procura também dependências aninhadas por versões duplicadas.
    const nested = path.join(entryPath, 'node_modules');
    if (fs.existsSync(nested)) changed.push(...walkModules(nested, seen, depth + 1));
  }
  return changed;
}
function main() {
  const modulesPath = path.resolve(__dirname, '..', 'node_modules');
  if (!fs.existsSync(modulesPath)) {
    console.log('[Lunivo] node_modules ainda ausente; ajuste não necessário.');
    return;
  }
  const changed = walkModules(modulesPath);
  for (const item of changed) {
    console.log(`[Lunivo] Publicação Android incompleta retirada de ${item.package}: ${item.fields.join(', ')}`);
  }
  console.log(`[Lunivo] Checagem Expo Android concluída: ${changed.length} pacote(s) ajustado(s).`);
}
if (require.main === module) main();
module.exports = { isMalformed, repairConfig, walkModules };
