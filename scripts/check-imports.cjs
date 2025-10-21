#!/usr/bin/env node

/**
 * Script para verificar importaciones faltantes que puedan causar errores 500
 * Ejecutar con: node scripts/check-imports.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function findImportIssues(dir, issues = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      findImportIssues(fullPath, issues);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Buscar importaciones relativas
        const importMatch = line.match(/import.*from ['"](\.\/.+)['"]/);
        if (importMatch) {
          const importPath = importMatch[1];
          const resolvedPath = path.resolve(path.dirname(fullPath), importPath);
          
          // Verificar si existe como .ts o .tsx
          const possibleExtensions = ['', '.ts', '.tsx', '.js', '.jsx'];
          const exists = possibleExtensions.some(ext => {
            try {
              return fs.existsSync(resolvedPath + ext);
            } catch {
              return false;
            }
          });

          if (!exists) {
            issues.push({
              file: path.relative(process.cwd(), fullPath),
              line: index + 1,
              import: importPath,
              resolvedPath
            });
          }
        }
      });
    }
  }

  return issues;
}

console.log('🔍 Verificando importaciones...\n');

const issues = findImportIssues(srcDir);

if (issues.length === 0) {
  console.log('✅ No se encontraron problemas de importación!');
} else {
  console.log('❌ Se encontraron problemas de importación:\n');
  issues.forEach(issue => {
    console.log(`📁 ${issue.file}:${issue.line}`);
    console.log(`   Import: ${issue.import}`);
    console.log(`   Resolved: ${issue.resolvedPath}\n`);
  });
  
  console.log(`💡 Tip: Estos archivos faltantes pueden causar errores 500.`);
  console.log(`   Crear los archivos o corregir las rutas de importación.`);
  process.exit(1);
}
