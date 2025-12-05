from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Company
from .serializers import CompanySerializer
from datetime import datetime

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.filter(deleted_at__isnull=True)
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def active_companies(self, request):
        """Get all active companies"""
        companies = self.queryset.filter(is_active=True)
        serializer = self.get_serializer(companies, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a company"""
        company = self.get_object()
        company.is_active = True
        company.save()
        return Response({
            'success': True,
            'message': f'Company {company.name} activated',
            'data': CompanySerializer(company).data
        })
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a company"""
        company = self.get_object()
        company.is_active = False
        company.save()
        return Response({
            'success': True,
            'message': f'Company {company.name} deactivated',
            'data': CompanySerializer(company).data
        })
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete a company"""
        company = self.get_object()
        company.deleted_at = datetime.now()
        company.save()
        return Response({
            'success': True,
            'message': f'Company {company.name} deleted'
        }, status=status.HTTP_204_NO_CONTENT)
