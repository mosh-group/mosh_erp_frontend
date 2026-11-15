# Setup

Extract `MOSH_LARAVEL_BACKEND.zip` and `MOSH_VANILLA_FRONTEND.zip` into sibling folders. The backend is based on RonasIT/laravel-empty-project, development commit `157945b676acf1b24439a6a2e20ded802c7890c9`.

## Requirements

- PHP 8.5+, Composer 2; PHP extensions BCMath, Ctype, DOM, Fileinfo, Filter, Hash, Mbstring, OpenSSL, PCRE, PDO, PDO_SQLite, Session, Tokenizer and XML.
- Python 3 to serve the static frontend locally, or any ordinary static web server.
- A current browser. No Node build, frontend framework, Redis or queue worker is required.

## Backend

From the extracted backend directory:

```sh
composer install
cp .env.example .env
php artisan key:generate
php -r "file_exists('database/database.sqlite') || touch('database/database.sqlite');"
php artisan migrate --seed
php artisan serve --host=localhost --port=8000
```

The default database is `database/database.sqlite`. Keep `storage/` and `bootstrap/cache/` writable by PHP. `.env.example` contains the required settings; no account or password is preinstalled. `GET http://localhost:8000/status` is the health check. `GET /api/auth/status` reports setup/login availability.

For files up to 25 MiB, set `upload_max_filesize=25M` and `post_max_size=32M` in the PHP configuration used by the server, then restart it. Files remain in private `storage/app/private/attachments`; **do not** make that directory public or create a storage symlink for it.

## Frontend and first login

In a second terminal, from the extracted frontend directory:

```sh
python3 -m http.server 8080 --bind localhost
```

Open **http://localhost:8080**. Complete the existing initial-account form with your own username and a password of at least eight characters. The setup creates the protected root account and its employee profile. Create subsequent employee profiles, then linked user accounts and their roles in the existing administration UI.

Use `localhost` consistently for both servers; do not mix `localhost` and `127.0.0.1`. Session cookies and CSRF require HTTP(S); opening `index.html` as a local file will not work.

The only frontend API URL definition is in **config.js**:

```js
window.API_BASE_URL = 'http://localhost:8000/api';
```

To change the backend, edit this value once. If the frontend origin changes, also set `FRONTEND_ORIGINS` in backend `.env` to its exact origin. This is the server's CORS allowlist. Run `php artisan config:clear` after changing `.env`. The application fetches authorized data at login and on the existing navigation/Refresh controls; search, filters, statistics, printing and pagination keep their original JavaScript renderers.

## Optional demonstration records

Normal seeding creates roles, settings, field-work templates, the original editable wisdom messages and warehouse definitions. It creates no fake tasks, payments, employees or login credentials. To explicitly load the useful original sample customers, services, salespeople, teams, quotation templates and quotations:

```sh
php artisan db:seed --class=DemoSeeder
```

Alternatively set `MOSH_DEMO_DATA=true` before the initial `migrate --seed`. DemoSeeder is repeatable without overwriting existing records. These become normal editable database records; the frontend has no mock-data fallback.

## Quotation email

Configure your SMTP provider in `.env` before using the existing Send button:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
MAIL_FROM_ADDRESS=your-verified-sender@example.com
MAIL_FROM_NAME="MOSH GROUP"
```

Use your provider's TLS scheme/port requirements. The default `log` transport deliberately does not claim successful delivery. The API returns 503 until a real transport is configured. No live mail was sent during verification.

## Tests and maintenance

```sh
php vendor/bin/phpunit
php artisan mosh:clean-uploads
```

Tests use an in-memory SQLite database. The cleanup command removes files that have had no saved record reference for more than one day; run it periodically if desired. Back up the database and private attachment directory together. Read `VERIFICATION.md` for the executed browser/API checks.

For hosting, point the PHP web root to `backend/public`, serve the frontend on the same HTTPS site or a same-site subdomain, set `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` and `SESSION_SECURE_COOKIE=true`, configure the cookie domain if using subdomains, then run `php artisan config:cache`. After the first account is created, `MOSH_ALLOW_SETUP=false` explicitly disables the initial setup endpoint. Never expose `.env`, the SQLite database, or `storage/` through the web server. A reverse proxy serving `/api` from Laravel and the static frontend from the same origin is the simplest production arrangement.
