-- Run this once in PGAdmin Query Tool (connected to the default `postgres` database).
-- Then drag/create a server connection under your "Guilds of Ardessia" server group
-- pointing at this database (or keep using your existing local server and select this DB).

CREATE DATABASE guilds_of_ardessia
  WITH
  OWNER = CURRENT_USER
  ENCODING = 'UTF8'
  TEMPLATE = template0;
