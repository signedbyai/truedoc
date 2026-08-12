# EuroTSA — infra runbook

Not part of the Next.js app build (lives outside `src/`/`public/` on
purpose). This is the part `EUROTSA_SCOPE.md` calls steps 1-8: real
infra, needs your own Hetzner/GCP accounts and API access I don't have in
this sandbox. Everything code-side (the waitlist API route, migration
0053) is already built and committed to master — this doc is what's left.

Commands below assume you're running them yourself, from a machine with
real internet access and your own `hcloud`/`gcloud` CLI auth already set
up. Replace every `<...>` placeholder before running anything.

## 1. Provision the Hetzner VM

```bash
hcloud server create \
  --name eurotsa-01 \
  --type cx22 \
  --image ubuntu-24.04 \
  --location fsn1 \
  --ssh-key <your-ssh-key-name>
```

`fsn1` = Falkenstein; use `nbg1` for Nuremberg if you'd rather. Note the
IP it prints — you'll need it for DNS in step 7.

## 2. Create the GCP KMS keys

Two asymmetric signing keys, per the "self-signed root on GCP" path
`timestamp-authority`'s own docs recommend (confirmed against the actual
README, not assumed) — one acts as the self-signed root/parent, one is
the actual timestamp-signing leaf key.

```bash
gcloud kms keyrings create eurotsa --location europe-west3 --project <your-project>

gcloud kms keys create eurotsa-parent \
  --keyring eurotsa --location europe-west3 \
  --purpose asymmetric-signing --default-algorithm ec-sign-p384-sha384

gcloud kms keys create eurotsa-leaf \
  --keyring eurotsa --location europe-west3 \
  --purpose asymmetric-signing --default-algorithm ec-sign-p384-sha384
```

Then a service account scoped only to sign with these keys (not broader
project access):

```bash
gcloud iam service-accounts create eurotsa-signer

gcloud kms keyrings add-iam-policy-binding eurotsa \
  --location europe-west3 \
  --member "serviceAccount:eurotsa-signer@<your-project>.iam.gserviceaccount.com" \
  --role roles/cloudkms.signerVerifier

gcloud iam service-accounts keys create eurotsa-signer-key.json \
  --iam-account eurotsa-signer@<your-project>.iam.gserviceaccount.com
```

Copy `eurotsa-signer-key.json` to the VM (`scp` it) — it's the credential
`timestamp-server` uses to sign without the key ever leaving GCP KMS.

## 3. Build timestamp-authority and generate the certificate chain

On the VM:

```bash
sudo apt update && sudo apt install -y golang-go git
git clone https://github.com/sigstore/timestamp-authority.git
cd timestamp-authority
make timestamp-server

export GOOGLE_APPLICATION_CREDENTIALS=/path/to/eurotsa-signer-key.json

go run cmd/fetch-tsa-certs/fetch_tsa_certs.go \
  --leaf-kms-resource="gcpkms://projects/<your-project>/locations/europe-west3/keyRings/eurotsa/cryptoKeys/eurotsa-leaf/versions/1" \
  --parent-kms-resource="gcpkms://projects/<your-project>/locations/europe-west3/keyRings/eurotsa/cryptoKeys/eurotsa-parent/versions/1" \
  --parent-validity=3650 \
  --org-name="SPRK10 B.V." \
  --output="/etc/eurotsa/chain.crt.pem"
```

`--parent-validity=3650` = 10 years for the self-signed root, matching how
long you'd want to avoid a root rotation. Move `chain.crt.pem` and the
built `bin/timestamp-server` binary into `/etc/eurotsa/` and `/usr/local/bin/`
respectively (or wherever `eurotsa.service` below expects them — adjust
paths to match).

## 4. systemd service

See `ops/eurotsa/eurotsa.service` in this repo — copy it to
`/etc/systemd/system/eurotsa.service` on the VM, fix the paths, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now eurotsa
sudo systemctl status eurotsa
```

Runs `timestamp-server` on `127.0.0.1:3000`, KMS-backed signing — Caddy
(next step) is what actually faces the internet.

## 5. Caddy — TLS, reverse proxy, rate limiting, static site

Caddy's core doesn't ship rate limiting — needs the `mholt/caddy-ratelimit`
plugin, built in via `xcaddy`:

```bash
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
xcaddy build --with github.com/mholt/caddy-ratelimit
sudo mv caddy /usr/local/bin/caddy
```

Copy `ops/eurotsa/Caddyfile` from this repo to `/etc/caddy/Caddyfile` on
the VM (create `/etc/systemd/system/caddy.service` the standard way, or
`sudo apt install caddy` first for the service file then swap the binary).
Also copy `ops/eurotsa/site/` to `/var/www/eurotsa/` — that's the static
CPS + waitlist page Caddy serves at `/`.

```bash
sudo systemctl restart caddy
```

Caddy auto-provisions the Let's Encrypt cert for `eurotsa.eu` on first
request once DNS (step 7) points here.

## 6. Waitlist wiring

`ops/eurotsa/site/waitlist.html` already POSTs to
`https://signedby.ai/api/eurotsa-waitlist` (the route + migration 0053 are
built and committed to master — needs `git push` + `./deploy-prod.sh` +
applying migration 0053 via the Supabase SQL editor, same as every other
pending migration). Nothing further needed here once that deploy lands.

## 7. DNS

`eurotsa.eu` — A record to the VM's IP (from step 1).

`eurotsa.org` / `eurotsa.com` — redirect to `eurotsa.eu`, same pattern
already used for signedby.you/.dev → signedby.ai. If these three domains
sit in the same Cloudflare account as those, use Cloudflare's redirect
rules rather than routing them through this VM's Caddy — keeps the VM's
TLS cert and config to one domain.

## 8. Uptime monitoring

Free tier of UptimeRobot or Better Uptime, hitting
`https://eurotsa.eu/api/v1/timestamp/certchain` (a real, cheap GET the
service already serves) every 5 minutes. Alert to whatever channel
already gets prod incident alerts — not a new ops stack.

## 9. SignedBy-side integration — do this AFTER steps 1-8 are confirmed live

Deliberately not built yet — writing the `"eurotsa"` branch into
`timestamp-authority.ts`'s fallback chain now, before `eurotsa.eu/tsr`
actually resolves, means shipping code with nothing real to call. Once
you confirm the service is live and `/verify`-testable, come back and
I'll wire in the three-tier chain (Sectigo → EuroTSA → FreeTSA) and the
matching `/verify`/certificate-page copy branch — small, config-shaped
change per the scope doc, not a rebuild.

## 10. Disaster-recovery checklist

Check `chain.crt.pem` and this whole `ops/eurotsa/` directory into the
private ops repo (or leave it here in git history, already git-tracked)
so a dead VM is a rebuild-from-script problem, not a key-recovery one —
the signing key itself lives in GCP KMS, independent of the VM.

## 11. 30-day promotion

Once EuroTSA has run 30 days as tier 2 with no unexplained downtime on
the uptime check, drop FreeTSA from the fallback chain entirely
(Sectigo → EuroTSA, two tiers) — that's a one-line code change when you
get there, not part of this runbook.
