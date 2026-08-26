#!/usr/bin/env node
/**
 * Patches cordova-plugin-jpush plugin.xml to add android:exported="true"
 * to all <service> and <receiver> tags that lack it.
 * Required for Android 12+ (targetSdk >= 31).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(__dirname, '..')
const pluginXmlPath = join(projectRoot, 'node_modules', 'cordova-plugin-jpush', 'plugin.xml')

if (!existsSync(pluginXmlPath)) {
  console.error('[JPush Patcher] File not found:', pluginXmlPath)
  process.exit(1)
}

let xml = readFileSync(pluginXmlPath, 'utf-8')
const original = xml

// Helper: add android:exported="true" to a tag if not already present
function patchTag(tag) {
  let count = 0
  xml = xml.replace(new RegExp(`<${tag}(\\s[^>]*?)>`, 'g'), (match, attrs) => {
    if (attrs.includes('android:exported=')) return match
    count++
    return `<${tag} android:exported="true" ${attrs}>`
  })
  // Also handle bare <tag> without attrs (shouldn't happen in this plugin but just in case)
  xml = xml.replace(new RegExp(`<${tag}(?!\\s)`, 'g'), `<${tag} android:exported="true" `)
  return count
}

const serviceCount = patchTag('service')
const receiverCount = patchTag('receiver')

if (xml === original) {
  console.log('[JPush Patcher] No changes needed')
} else {
  writeFileSync(pluginXmlPath, xml, 'utf-8')
  console.log(`[JPush Patcher] ✅ Patched: ${serviceCount} services, ${receiverCount} receivers`)
  console.log('  →', pluginXmlPath)
}
