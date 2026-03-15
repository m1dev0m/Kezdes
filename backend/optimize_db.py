"""
Database optimization script for 1000-1500 users
Run this after migrations: python manage.py shell < optimize_db.py
"""

from django.db import connection
from django.db import models
from django.apps import apps

def create_indexes():
    """Create critical indexes for scale"""
    indexes = [
        ('bookings_booking', ['restaurant_id', 'date']),
        ('bookings_booking', ['user_id', 'status']),
        ('bookings_booking', ['restaurant_id', 'status']),
        ('bookings_booking', ['start_datetime', 'end_datetime']),
        ('chat_message', ['restaurant_id', 'created_at']),
        ('chat_message', ['sender_id', 'created_at']),
        ('orders_order', ['user_id', 'created_at']),
        ('orders_order', ['restaurant_id', 'status']),
        ('orders_order', ['status', 'payment_status']),
        ('restaurants_restaurant', ['owner_id', 'is_verified']),
        ('core_profile', ['restaurant_id', 'role']),
    ]
    
    with connection.cursor() as cursor:
        for table, columns in indexes:
            col_str = ', '.join(columns)
            idx_name = f"idx_{table.split('_')[1]}_{columns[0][:3]}"
            sql = f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {idx_name} ON {table}({col_str});"
            try:
                cursor.execute(sql)
                print(f"✓ Created index {idx_name}")
            except Exception as e:
                print(f"✗ Failed {idx_name}: {e}")
    
    connection.commit()

def enable_partitioning():
    """Enable table partitioning for very large tables (future optimization)"""
    print("\n📊 Partitioning strategy:")
    print("  - bookings: partition by restaurant_id (horizontal)")
    print("  - messages: partition by created_at (time-based)")
    print("  Implement in future when table > 10M rows")

def vacuum_analyze():
    """Vacuum and analyze for query planner"""
    with connection.cursor() as cursor:
        cursor.execute("VACUUM ANALYZE;")
        print("✓ Vacuum and analyze complete")

def check_connection_settings():
    """Check PostgreSQL settings"""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT name, setting FROM pg_settings 
            WHERE name IN (
                'max_connections',
                'shared_buffers', 
                'effective_cache_size',
                'work_mem',
                'maintenance_work_mem'
            );
        """)
        print("\n📈 PostgreSQL Settings:")
        for name, value in cursor.fetchall():
            print(f"  {name}: {value}")

if __name__ == '__main__':
    print("🔧 Optimizing database for scale...\n")
    create_indexes()
    vacuum_analyze()
    check_connection_settings()
    enable_partitioning()
    print("\n✅ Database optimization complete!")
    print("\nRecommend running weekly: SELECT pg_stat_statements_reset();")
