FROM python:3.13.8-slim-trixie

ENV FLASK_ENV=development

WORKDIR /usr/src/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# final configuration
EXPOSE 5000

CMD ["python", "app.py"]
