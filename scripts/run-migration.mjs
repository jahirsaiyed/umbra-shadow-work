// scripts/run-migration.mjs
import { readFileSync } from 'node:fs'
import { Client } from 'pg'

const [, , migrationPath] = process.argv
if (!migrationPath) {
  console.error('Usage: node scripts/run-migration.mjs <path-to-sql-file>')
  process.exit(1)
}

const sql = readFileSync(migrationPath, 'utf8')
// Recent pg-connection-string releases treat `sslmode=require` as an alias for
// `verify-full` (full CA chain validation) instead of the classic libpq
// semantics (encrypt only, don't validate the chain). Supabase's pooler
// certificate chain isn't in Node's default trust bundle, so strict
// validation fails with "self-signed certificate in chain" even though the
// connection is otherwise fine. `pg`'s ConnectionParameters re-parses
// `connectionString` and lets it win over an explicit `ssl` option, so the
// fix has to live in the connection string itself: append
// `uselibpqcompat=true`, which pg-connection-string documents as restoring
// the traditional libpq sslmode=require semantics (encrypt, don't verify).
const rawConnectionString = process.env.POSTGRES_URL_NON_POOLING
const connectionString = rawConnectionString.includes('uselibpqcompat')
  ? rawConnectionString
  : `${rawConnectionString}${rawConnectionString.includes('?') ? '&' : '?'}uselibpqcompat=true`
const client = new Client({ connectionString })

await client.connect()
try {
  await client.query(sql)
  console.log(`Applied ${migrationPath}`)
} finally {
  await client.end()
}
