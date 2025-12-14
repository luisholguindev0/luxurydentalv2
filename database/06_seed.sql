-- Seed Data

-- 1. Default Organization
INSERT INTO public.organizations (id, slug, name, settings)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'luxury-dental-demo',
    'Luxury Dental Clinic',
    '{"currency": "COP", "timezone": "America/Bogota"}'::jsonb
) ON CONFLICT DO NOTHING;

-- 2. Default Services
INSERT INTO public.services (organization_id, title, description, price, duration_minutes)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Limpieza General', 'Limpieza profunda con ultrasonido', 150000, 45),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Valoración Inicial', 'Diagnóstico completo con cámara intraoral', 80000, 30),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Blanqueamiento', 'Blanqueamiento láser premium', 450000, 60)
ON CONFLICT DO NOTHING;
