
from fastapi import FastAPI
from starlette.middleware.wsgi import WSGIMiddleware
from starlette.routing import Mount
from starlette.applications import Starlette
import django
import os

# Set Django settings before importing Django modules
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sme_ai.settings")

# Configure Django
django.setup()

# Now import Django ASGI app and FastAPI backend
from sme_ai.asgi import application as django_app
from api import backend

# Create the combined application
app = Starlette(routes=[
    Mount("/api", app=backend.app),              # FastAPI under /api
    Mount("/", app=django_app),                  # Django for everything else
])





















# from fastapi import FastAPI
# from starlette.middleware.wsgi import WSGIMiddleware
# from starlette.routing import Mount
# from starlette.applications import Starlette
# import django
# import os

# from sme_ai.asgi import application as django_asgi_app

# os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sme_ai.settings")
# django.setup()

# # Create FastAPI app
# api = FastAPI(title="Email Verifier API", version="1.0.0")

# @api.get("/")
# async def root():
#     return {"message": "Email Verifier API is running"}

# @api.get("/health")
# async def health_check():
#     return {"status": "healthy"}

# # Main Starlette app that combines FastAPI and Django
# app = Starlette(routes=[
#     Mount("/api", app=api),                  # FastAPI under /api
#     Mount("/", app=django_asgi_app),         # Django for everything else
# ])
