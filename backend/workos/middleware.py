from rest_framework.response import Response
from rest_framework.views import exception_handler
import uuid

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    
    if response is not None:
        response.data = {
            'success': False,
            'error': {
                'code': exc.__class__.__name__,
                'message': response.data.get('detail', str(exc)),
                'details': response.data,
            },
            'request_id': str(uuid.uuid4()),
        }
    
    return response
