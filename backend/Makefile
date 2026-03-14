.PHONY: test install run migrate makemigrations shell

install:
	pip install -r requirements.txt

test:
	python manage.py test

run:
	python manage.py runserver 0.0.0.0:8000

migrate:
	python manage.py migrate

makemigrations:
	python manage.py makemigrations

shell:
	python manage.py shell

lint:
	# Add linting command here later
	echo "No linter configured"
