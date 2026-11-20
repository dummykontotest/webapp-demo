FROM python:3.13-slim
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng poppler-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py shared_server.py ./
COPY dist ./dist
ENV PORT=10000 HANDOVER_DB=/var/data/desk.sqlite3
EXPOSE 10000
CMD ["python","-B","shared_server.py","--host","0.0.0.0"]
