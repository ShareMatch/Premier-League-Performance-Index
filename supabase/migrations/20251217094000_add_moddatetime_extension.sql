-- Ensure required schema exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Install moddatetime extension
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;
