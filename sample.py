import requests

access_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY1MDI2MjkyLCJpYXQiOjE3NjQ5Mzk4OTIsImp0aSI6IjJhMDFlZjk5MWUwYTQ4OWM4NWQ5ZTM2MzNlZTI4ZGZkIiwidXNlcl9pZCI6MX0.4QF6IBToohjmGWVpMXAb7YJ_2DhD7XgdiQmU2fD5rWE"

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

data = {
    "name": "Tech Corp",
    "email": "contact@techcorp.com",
    "city": "Mumbai",
    "country": "India"
}

r = requests.post(
    'http://localhost:8000/api/v1/companies/',
    json=data,
    headers=headers
)

print(r.json())
