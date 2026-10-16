# DigitalOcean PostgreSQL public CA

`digitalocean-postgres-ca.crt` is the certificate supplied by Khalid on
2026-10-16. It contains exactly one public X.509 CA certificate and no private
key, extra PEM block or non-certificate payload. Its self-signature verifies.

- Original and bundled file SHA-256:
  `317a0fb093b91666061633840ac3a827b0bd1d6e4d15ca815e41b15195613c83`.
- Certificate DER SHA-256:
  `fd910223389572486b0ef6936a71b81e1ae4695475a3df7e7deccaeeb8bf1a5c`.
- Validity:2026-10-16 09:56:51 UTC through2036-10-13 09:56:51 UTC.

This public trust anchor may be included in the source artifact for both API
and worker. It is not a client credential. Do not add a CA private key, client
key, database URL, `.env` or private workstation certificate here.

The managed startup scripts check readability and parse the single public CA
before importing application settings. Existing settings independently validate
the configured absolute root path and require `sslmode=verify-full` before a
production engine is created. Neither check connects to a database.

For the existing `/workspace/backend` buildpack layout, configure both
components with `sslrootcert=/workspace/backend/config/ca/digitalocean-postgres-ca.crt`.
Use the preflight's actual absolute path if a future deployment layout differs;
do not downgrade TLS. Rotation needs a fresh provider certificate, fingerprint
review, asset/test update, and rebuild of both components.

See the [deployment and verification procedure](../../../docs/06-delivery-and-operations/digitalocean-postgres-ca.md).
