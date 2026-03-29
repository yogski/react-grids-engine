/**
 * Computes the SHA-256 digest of a UTF-8 string.
 * Returns a lowercase hex string.
 *
 * Uses the Web Crypto API (`crypto.subtle`), which is available in all
 * modern browsers and Node 20+.
 *
 * @param input - The string to hash
 * @returns Lowercase hex SHA-256 digest
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
