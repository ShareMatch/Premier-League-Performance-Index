-- 20251216000000_init_extensions.sql

create schema if not exists extensions;

create extension if not exists moddatetime with schema extensions;
create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists http;
