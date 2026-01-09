import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Update or add a variable in the .env file
 * Preserves comments and structure where possible
 * @param {string} key - The environment variable key
 * @param {string} value - The value to set
 */
export function updateEnvVariable(key, value) {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    const lines = envContent.split('\n');
    let found = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Match key=value but not comments
        if (line.startsWith(`${key}=`)) {
            lines[i] = `${key}=${value}`;
            found = true;
            break;
        }
    }

    if (!found) {
        lines.push(`${key}=${value}`);
    }

    fs.writeFileSync(envPath, lines.join('\n'));
}

/**
 * Get a variable from the .env file (reads directly from file, not process.env)
 * @param {string} key - The environment variable key
 * @returns {string|null} The value or null if not found
 */
export function getEnvVariable(key) {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return null;

    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith(`${key}=`)) {
            return trimmed.substring(key.length + 1);
        }
    }

    return null;
}