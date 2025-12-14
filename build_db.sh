#!/bin/bash
# Concatenate all SQL files in order

OUTPUT="database/schema.sql"

cat database/00_extensions.sql \
    database/01_types.sql \
    database/02_tables.sql \
    database/03_indexes.sql \
    database/04_security.sql \
    database/05_functions.sql \
    database/06_seed.sql > $OUTPUT

echo "Successfully built $OUTPUT"
