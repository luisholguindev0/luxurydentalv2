-- Enable necessary extensions
CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions; -- For AI embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions; -- For fuzzy search
