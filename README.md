# TrackYuhFood

A mobile-friendly home for Caribbean food tracking. Search Jamaican favourites, build and save recipes, and keep a private daily food diary. Accounts and sessions use Better Auth; data lives in PostgreSQL. No AI, payments or subscriptions are included.

**The starter food data is fictional demonstration data.** Every starter food, and any recipe or diary entry made from it, is labelled Demo. These numbers help you try the software. They are not validated nutrition facts and should not guide dietary decisions.

## What you need

- Node.js 22.12 or newer (Node 24 recommended): runs the app.
- PostgreSQL 15 or newer: stores your accounts and food records.
- A terminal, opened in this project folder.

## Start on your computer

1. Install the app's packages: `npm install`.
2. Make a database named `trackyuhfood`. With PostgreSQL running, use `createdb trackyuhfood`.
3. Copy `.env.example` to `.env`. This is your private settings file; Git ignores it.
4. Set `DATABASE_URL` to your database connection address. If your PostgreSQL account needs a password, include it in this private address.
5. Replace `BETTER_AUTH_SECRET` with a random secret. You can generate one with `openssl rand -hex 32`. Keep it private and stable: changing it signs users out.
6. Run `npm run migrate` to create the database tables, including Better Auth's own tables. Running this again is safe.
7. Run `npm run seed` to add the small demo food library. It does not overwrite existing foods.
8. Run `npm run dev`. Open **http://localhost:5173** in your browser.
9. Create an account with an email and a password of at least 12 characters. No email service is needed for this initial MVP.

Keep the terminal open while using the app. Press Ctrl+C to stop it. Your saved data stays in PostgreSQL.

## Try it

- **Overview:** see the selected day's calories and macros. Set your own calorie goal; the default 2,000 is a placeholder, not personal health advice.
- **Food search:** search names, inspect preparation state and source, and log a weight in grams.
- **Recipe builder:** add foods as ingredients, enter their weights, and enter the finished edible cooked weight. Set a serving weight to preview its nutrients. Save the recipe and log it again whenever you like.
- **My diary:** choose a date, review meals and daily totals, or remove an entry.

To log out, use the arrow beside your name in the desktop sidebar. On phones, use the account button at the top of the page.

## How the nutrition maths works

All food nutrition is stored **per 100g of edible food**, with raw/cooked state, source information and a demo flag.

For each nutrient:

- Ingredient amount = per-100g value × ingredient grams ÷ 100.
- Recipe total = sum of ingredient amounts.
- Recipe per 100g = recipe total × 100 ÷ total edible cooked yield in grams.
- Serving amount = recipe total × serving grams ÷ total edible cooked yield in grams.

We calculate calories, protein, carbohydrates, fat and fibre independently from documented values. We do not derive calories from rounded macros. Rounding happens only on screen; stored calculations retain precision.

Match ingredient weights to the listed state: 100g of raw chicken and 100g of cooked chicken are different inputs. Cooked yield excludes bones and other discarded parts. The recipe calculation assumes nutrients are retained; it does not model nutrients lost through draining, discarded oil or cooking liquid. Choose appropriate cooked ingredient records when needed.

The server reads food values from the database and calculates totals itself. It does not trust nutrition figures submitted by a browser. Diary entries store a snapshot, so deleting a recipe does not change your old diary.

### Adding real food data

The demo seed is in `backend/src/seed.js`. Before real dietary use, replace its fixtures with records reviewed against a suitable nutrition reference. Record the reference name, URL or identifier, preparation state, units, edible basis and retrieval/version information in `source`. Set `demo=false` only after validation. Recipe variations require their own weighed ingredients and yield; a dish name alone is not a validated nutrient profile. The initial MVP has no public food-editing endpoint.

## Project map

- `frontend/`: React, Vite and Tailwind; the responsive app.
- `backend/src/`: Express API, Better Auth configuration, database setup and demo seed.
- `backend/migrations/`: versioned application SQL. Better Auth creates its own schema through its migration API.
- `shared/nutrition.js`: deterministic calculation functions, separate from the interface.
- `tests/`: calculation tests and API/account integration tests.
- `render.yaml`: optional Render setup blueprint. Creating its services may cost money.

## Checks

`npm test` runs the calculation and isolated API tests.

`npm run build` creates the production frontend in `frontend/dist`.

For the real database/account integration test, use a **separate test database**, migrate and seed it, then run:

```sh
DATABASE_URL=postgresql://localhost:5432/trackyuhfood_test npm run migrate
DATABASE_URL=postgresql://localhost:5432/trackyuhfood_test npm run seed
DATABASE_URL=postgresql://localhost:5432/trackyuhfood_test RUN_DB_TESTS=1 npm test
```

The test creates two temporary accounts and removes them afterward. Do not point tests at a database with important data.

## Deploy to Render when ready

Nothing is deployed automatically by this repository work. Review costs before creating services.

1. Push the reviewed code to your GitHub repository when you are ready.
2. In Render, create a Blueprint from this repository and review `render.yaml`. It defines a Node web service and a PostgreSQL database.
3. Set both `APP_ORIGIN` and `BETTER_AUTH_URL` to the web service's public HTTPS address, for example `https://trackyuhfood.onrender.com`, with no trailing slash. Use your actual assigned address.
4. Render provides `DATABASE_URL` from the database and generates a private `BETTER_AUTH_SECRET`. Keep the secret stable between deployments.
5. The build installs packages and builds React. The pre-deploy step runs migrations. The start step runs Express, which serves both the frontend and API from one address.
6. Optionally run `npm run seed` in Render's service shell to add the labelled demo library. The seed is deliberately not run automatically in production.
7. Create an account and check sign-in, sign-out, recipe saving, diary logging and persistence after refreshing.

Production cookies are HTTP-only, Secure and SameSite=Lax. Use HTTPS. Keeping the frontend and API on the same Render service avoids cross-site-cookie problems. Locally, Vite forwards `/api` requests to Express; CORS permits only `APP_ORIGIN`, with credentials. Write requests must have the configured Origin. Better Auth also validates trusted origins. Do not loosen these settings to `*`.

Passwords and sessions are managed by Better Auth, not custom code. Every personal query includes the signed-in user's ID. Authentication requests have database-backed rate limiting. The deployment trusts one reverse proxy, matching Render. If your proxy arrangement changes, review that setting.

The initial MVP does not include email verification, password reset emails, account deletion or a food-data administration screen. Add those before a broader public launch. Back up PostgreSQL before changes and review dependency updates regularly.

## If something goes wrong

- **Database connection fails:** check that PostgreSQL is running and `DATABASE_URL` is correct.
- **Tables are missing:** run `npm run migrate` with the same settings used by the app.
- **The library is empty:** run `npm run seed` if you want demo foods.
- **Sign-in or saving is rejected:** confirm the browser address matches `APP_ORIGIN`; on Render both URL settings must use HTTPS.
- **The app will not start:** check the terminal for a missing secret or configuration message. Never paste passwords, connection strings or session cookies into public issues.

Technical references: [Better Auth Express integration](https://better-auth.com/docs/integrations/express), [Better Auth PostgreSQL](https://better-auth.com/docs/adapters/postgresql).
