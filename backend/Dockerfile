FROM python:3.11.8-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:0.7.3 /uv /uvx /bin/
ENV UV_SYSTEM_PYTHON=1
EXPOSE 5000
WORKDIR /app
COPY requirements.txt .
RUN uv pip install --require-hashes -r requirements.txt --no-deps
ARG youtube_data_api_key
ENV GOOGLE_API_KEY=$youtube_data_api_key
ENTRYPOINT ["gunicorn" , "-b",  ":5000",  "ads_placement_guardian.server:app"]
