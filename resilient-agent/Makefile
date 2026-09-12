.PHONY: run build test demo

run:
	python -m uvicorn app.agent:create_app --factory --host 0.0.0.0 --port 8000 --reload

build:
	docker build -t resilient-agent .

test:
	python -m pytest tests/ -v

demo:
	python -m tools.chaos_demo

install:
	pip install -r requirements.txt
