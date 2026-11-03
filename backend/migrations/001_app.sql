CREATE TABLE foods (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name text NOT NULL UNIQUE, state text NOT NULL CHECK (state IN ('raw','cooked')),
 per100g jsonb NOT NULL, source text NOT NULL, demo boolean NOT NULL DEFAULT true
);
CREATE TABLE recipes (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 name text NOT NULL, cooked_yield numeric NOT NULL CHECK(cooked_yield > 0),
 ingredients jsonb NOT NULL, per100g jsonb NOT NULL, demo boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recipes_owner ON recipes(user_id);
CREATE TABLE diary (
 id uuid PRIMARY KEY, user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 day date NOT NULL, meal text NOT NULL, name text NOT NULL,
 grams numeric NOT NULL CHECK(grams > 0), nutrition jsonb NOT NULL,
 demo boolean NOT NULL, source text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX diary_owner_day ON diary(user_id,day);
CREATE TABLE preferences (
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 calorie_goal integer NOT NULL DEFAULT 2000 CHECK(calorie_goal BETWEEN 500 AND 10000)
);
