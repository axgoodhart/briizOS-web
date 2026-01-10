#!/usr/bin/env node

/**
 * Automated ID Injection System
 *
 * This script:
 * 1. Scans all component files (.tsx, .jsx)
 * 2. Parses JSX/TSX to find all HTML elements
 * 3. Assigns permanent, unique IDs to each element
 * 4. Stores ID mappings in a JSON file
 * 5. Modifies source files directly with the IDs
 * 6. Reuses existing IDs on subsequent runs (stable across changes)
 */

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

// Configuration
const COMPONENT_DIRS = [
  'src/components',
  'src/app'
];

const ID_MAP_FILE = 'id-mappings.json';
const ID_PREFIX = 'el';

// Load existing ID mappings or create new one
let idMappings = {};
let idCounter = 0;

if (fs.existsSync(ID_MAP_FILE)) {
  idMappings = JSON.parse(fs.readFileSync(ID_MAP_FILE, 'utf-8'));
  // Find highest existing ID number
  Object.values(idMappings).forEach(id => {
    const match = id.match(/el-(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= idCounter) idCounter = num + 1;
    }
  });
  console.log(`📂 Loaded ${Object.keys(idMappings).length} existing ID mappings`);
} else {
  console.log('🆕 Creating new ID mapping file');
}

/**
 * Generate a unique key for an element based on:
 * - File path
 * - Element type (tag name)
 * - Attributes (especially className)
 * - Position in file
 */
function generateElementKey(filePath, element, line, column) {
  const tag = element.openingElement.name.name || 'unknown';

  // Get className if it exists
  let className = '';
  const classAttr = element.openingElement.attributes.find(attr =>
    attr.name && attr.name.name === 'className'
  );

  if (classAttr && classAttr.value) {
    if (t.isStringLiteral(classAttr.value)) {
      className = classAttr.value.value;
    } else if (t.isJSXExpressionContainer(classAttr.value)) {
      // For template strings or expressions, use a simplified version
      className = 'dynamic';
    }
  }

  // Create unique key
  const relativePath = path.relative(process.cwd(), filePath);
  return `${relativePath}:${tag}:${className}:${line}:${column}`;
}

/**
 * Get or create ID for an element
 */
function getOrCreateId(elementKey) {
  if (idMappings[elementKey]) {
    return idMappings[elementKey];
  }

  const newId = `${ID_PREFIX}-${idCounter++}`;
  idMappings[elementKey] = newId;
  return newId;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  console.log(`\n📄 Processing: ${path.relative(process.cwd(), filePath)}`);

  const code = fs.readFileSync(filePath, 'utf-8');

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch (error) {
    console.error(`❌ Parse error in ${filePath}:`, error.message);
    return;
  }

  let modified = false;
  let addedCount = 0;
  let skippedCount = 0;

  traverse(ast, {
    JSXElement(path) {
      const element = path.node;
      const { line, column } = element.loc.start;

      // Skip if it's a React component (starts with capital letter)
      const tagName = element.openingElement.name.name;
      if (!tagName || tagName[0] === tagName[0].toUpperCase()) {
        return;
      }

      // Skip if already has an id attribute
      const hasId = element.openingElement.attributes.some(attr =>
        attr.name && attr.name.name === 'id'
      );

      if (hasId) {
        skippedCount++;
        return;
      }

      // Generate element key and get/create ID
      const elementKey = generateElementKey(filePath, element, line, column);
      const id = getOrCreateId(elementKey);

      // Add id attribute
      const idAttr = t.jsxAttribute(
        t.jsxIdentifier('id'),
        t.stringLiteral(id)
      );

      element.openingElement.attributes.unshift(idAttr);
      modified = true;
      addedCount++;
    }
  });

  if (modified) {
    const output = generate(ast, {
      retainLines: true,
      retainFunctionParens: true,
    }, code);

    fs.writeFileSync(filePath, output.code, 'utf-8');
    console.log(`✅ Added ${addedCount} IDs, skipped ${skippedCount} (already have IDs)`);
  } else {
    console.log(`⏭️  No changes needed (${skippedCount} elements already have IDs)`);
  }
}

/**
 * Recursively find all component files
 */
function findComponentFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  Directory not found: ${dir}`);
    return files;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and .next
      if (item === 'node_modules' || item === '.next' || item === 'ui') {
        continue;
      }
      files.push(...findComponentFiles(fullPath));
    } else if (item.match(/\.(tsx|jsx)$/) && !item.includes('.test.') && !item.includes('.spec.')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting Automated ID Injection System\n');
  console.log('=' .repeat(60));

  // Find all component files
  let allFiles = [];
  for (const dir of COMPONENT_DIRS) {
    const files = findComponentFiles(dir);
    allFiles.push(...files);
  }

  console.log(`\n📦 Found ${allFiles.length} component files to process\n`);

  // Process each file
  for (const file of allFiles) {
    processFile(file);
  }

  // Save updated ID mappings
  fs.writeFileSync(ID_MAP_FILE, JSON.stringify(idMappings, null, 2), 'utf-8');
  console.log('\n' + '='.repeat(60));
  console.log(`\n💾 Saved ${Object.keys(idMappings).length} ID mappings to ${ID_MAP_FILE}`);
  console.log(`\n✨ Done! All components now have permanent IDs.`);
  console.log(`\nNext ID will be: ${ID_PREFIX}-${idCounter}`);
}

// Run the script
main();
