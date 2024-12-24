# Use the official Python image as the base image
FROM python:3.11-slim

WORKDIR /app

COPY . /app

# RUN apt-get update && apt-get install -y \
#     python3 && \
#     apt-get clean

EXPOSE 80

# Command to run the Python HTTP server
CMD ["python3", "-m", "http.server", "80"]