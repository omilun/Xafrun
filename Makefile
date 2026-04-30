.PHONY: run-backend run-frontend run

run-backend:
	cd backend && go run main.go

run-frontend:
	cd frontend && npm run dev

run:
	make -j2 run-backend run-frontend
