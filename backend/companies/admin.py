from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import Company
from datetime import datetime

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    # Display columns
    list_display = [
        'name',
        'code',
        'city',
        'subscription_status',
        'is_active_display',
        'created_at',
    ]
    
    # Filters
    list_filter = [
        'is_active',
        'subscription_plan',
        'created_at',
        'country',
    ]
    
    # Search
    search_fields = [
        'name',
        'code',
        'email',
        'phone',
    ]
    
    # Ordering
    ordering = ['-created_at']
    
    # Read-only fields
    readonly_fields = [
        'id',
        'created_at',
        'updated_at',
        'deleted_at',
    ]
    
    # Fieldsets for better organization
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'code', 'is_active')
        }),
        ('Contact Information', {
            'fields': ('email', 'phone', 'website')
        }),
        ('Address', {
            'fields': (
                'address',
                'city',
                'state',
                'country',
                'pincode',
            ),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('timezone', 'currency')
        }),
        ('Subscription', {
            'fields': (
                'subscription_plan',
                'subscription_valid_until',
            )
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'updated_at',
                'deleted_at',
            ),
            'classes': ('collapse',)
        }),
    )
    
    # Actions
    actions = ['activate_companies', 'deactivate_companies', 'mark_as_deleted']
    
    def activate_companies(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} companies activated.')
    activate_companies.short_description = "Activate selected companies"
    
    def deactivate_companies(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} companies deactivated.')
    deactivate_companies.short_description = "Deactivate selected companies"
    
    def mark_as_deleted(self, request, queryset):
        updated = queryset.update(deleted_at=datetime.now())
        self.message_user(request, f'{updated} companies marked as deleted.')
    mark_as_deleted.short_description = "Mark selected companies as deleted"
    
    def is_active_display(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="color: green;">✓ Active</span>'
            )
        return format_html(
            '<span style="color: red;">✗ Inactive</span>'
        )
    is_active_display.short_description = 'Status'
    
    def subscription_status(self, obj):
        if obj.subscription_plan:
            plan_colors = {
                'free': '#gray',
                'starter': '#0066cc',
                'professional': '#00cc00',
                'enterprise': '#ff6600',
            }
            color = plan_colors.get(obj.subscription_plan, '#000000')
            return format_html(
                f'<span style="color: {color}; font-weight: bold;">{obj.subscription_plan.upper()}</span>'
            )
        return '-'
    subscription_status.short_description = 'Plan'
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing an existing object
            return self.readonly_fields + ['name', 'code']
        return self.readonly_fields
    
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
