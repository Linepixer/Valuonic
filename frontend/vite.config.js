import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// MAJOR.MINOR are bumped by hand in package.json; PATCH is the CI run number, so every deploy
// gets a new, ordered version with no release step. Builds outside CI are marked as -dev.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
const [major, minor] = version.split('.')
const buildNumber = process.env.BUILD_NUMBER
const appVersion = buildNumber ? `${major}.${minor}.${buildNumber}` : `${version}-dev`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_APP_COMMIT': JSON.stringify((process.env.GIT_SHA || '').slice(0, 7)),
  },
})
