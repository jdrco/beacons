# beacons backend

## Start
```
docker-compose up --build
docker compose up --build
```
## When starting fresh, ensure DB is cleared
```
docker exec backend-db-1 psql -U postgres -d postgres -c "TRUNCATE TABLE users, cookies RESTART IDENTITY;"
docker exec backend_db_1 psql -U postgres -d postgres -c "TRUNCATE TABLE users, cookies RESTART IDENTITY;"
```

## Generate new db if something change in app/models/*
```
docker-compose exec web alembic revision --autogenerate
docker-compose exec web alembic upgrade head
```

## If the above doesnt work, run the below code first and rerun the above to empty db before new migration (1 of them)
```
docker exec backend-db-1 psql -U postgres -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker exec backend_db_1 psql -U postgres -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

