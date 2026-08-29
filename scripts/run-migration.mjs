// scripts/run-migration.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Client } from 'pg'

const [, , migrationPath] = process.argv
if (!migrationPath) {
  console.error('Usage: node scripts/run-migration.mjs <path-to-sql-file>')
  process.exit(1)
}

const sql = readFileSync(migrationPath, 'utf8')

// --- TLS: proper certificate-chain validation, not a compatibility bypass --
//
// Recent pg-connection-string releases treat `sslmode=require` as an alias
// for `verify-full` (full CA chain validation against Node's default OS
// trust bundle) instead of the classic libpq semantics (encrypt only, don't
// validate the chain). Supabase's Postgres endpoints (both the direct
// `db.<ref>.supabase.co` host and the `*.pooler.supabase.com` Supavisor
// pooler used here) present a certificate chain issued by "Supabase
// Intermediate 2021 CA" -> "Supabase Root 2021 CA", a *private* CA that is
// not in any OS/browser trust store. That's why strict verify-full fails
// with SELF_SIGNED_CERT_IN_CHAIN even though the connection itself is fine
// — confirmed by inspecting the live TLS handshake against both hosts
// (`openssl s_client` / a raw Postgres SSLRequest+TLS probe), which returned
// the same self-signed "Supabase Root 2021 CA" root both times.
//
// The correct fix is to pin that actual root CA and get real verify-full
// validation, not to weaken TLS. Supabase publishes this root at a stable
// URL (https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt,
// also downloadable from Database Settings -> SSL Configuration in the
// dashboard) as `prod-ca-2021.crt`. The copy vendored at
// `supabase/prod-ca-2021.crt` was verified byte-for-byte identical (SHA-256
// fingerprint 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:
// F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA) to both that published download and the
// root actually presented by the live pooler host.
//
// `pg`'s ConnectionParameters merges `parse(connectionString)` on top of the
// config object (see pg/lib/connection-parameters.js), and `sslmode=require`
// parses to `ssl: {}` (i.e. verify-full with no custom CA) — which would
// silently clobber an explicit `ssl` option passed alongside the raw
// connection string. So `sslmode` is stripped from the URL here and TLS
// config is supplied solely via the explicit `ssl` option below, with
// `rejectUnauthorized: true` (the default) doing real chain verification
// against the pinned Supabase CA instead of the OS trust store.
const caCertPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'prod-ca-2021.crt')
const ca = readFileSync(caCertPath, 'utf8')

const rawConnectionString = process.env.POSTGRES_URL_NON_POOLING
if (!rawConnectionString) {
  console.error('POSTGRES_URL_NON_POOLING is not set')
  process.exit(1)
}
const parsedUrl = new URL(rawConnectionString)
parsedUrl.searchParams.delete('sslmode')
parsedUrl.searchParams.delete('uselibpqcompat')
const connectionString = parsedUrl.toString()

const client = new Client({
  connectionString,
  ssl: { ca, rejectUnauthorized: true },
})

await client.connect()
try {
  await client.query(sql)
  console.log(`Applied ${migrationPath}`)
} finally {
  await client.end()
}
