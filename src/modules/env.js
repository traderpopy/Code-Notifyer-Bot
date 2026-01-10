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
    if ((key === undefined || key === null) || (value === undefined || value === null)) {
        throw new Error('Key and value are required (cannot be null/undefined)');
    }

    if (/[\r\n]/.test(key) || /[\r\n]/.test(value)) {
        throw new Error('Key and value cannot contain newlines');
    }

    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    const lines = envContent.split('\n');
    let found = false;

    for (let i = 0; i < lines.length; i++) {
        // Extract leading whitespace to preserve indentation
        const match = lines[i].match(/^(\s*)/);
        const leadingWhitespace = match ? match[1] : '';
        const line = lines[i].trim();

        // Match key=value but not comments
        if (line.startsWith(`${key}=`)) {
            lines[i] = `${leadingWhitespace}${key}=${value}`;
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
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return null;

    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith(`${key}=`)) {
            let value = trimmed.substring(key.length + 1).trim();

            // Strip quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            } else {
                // If not quoted, strip inline comments
                const commentIndex = value.indexOf(' #');
                if (commentIndex !== -1) {
                    value = value.substring(0, commentIndex).trim();
                }
            }

            // Return null for empty string to preserve "not found" semantics
            if (value === '') return null;

            return value;
        }
    }

    return null;
}