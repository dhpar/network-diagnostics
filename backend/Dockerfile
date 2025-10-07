# syntax=docker/dockerfile:1
FROM ubuntu:22.04

COPY requirements.txt .
# install app dependencies
RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip install -r requirements.txt

# install app
COPY app.py /

# final configuration
EXPOSE 5000
CMD ["flask", "run", "--host", "0.0.0.0", "--port", "5000"]
