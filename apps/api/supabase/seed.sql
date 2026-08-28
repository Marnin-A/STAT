-- Lagos agencies, units and hospitals for development.
-- Matches the seed data in MockApiClient so screens look the same either way.

insert into agencies (id, name, type) values
  ('agency-medical',  'Lagos Medical Response', 'medical'),
  ('agency-security', 'Lagos Police Command',   'police'),
  ('agency-fire',     'Lagos Fire Service',     'fire')
on conflict (id) do nothing;

insert into units (agency_id, type, call_sign, status, location, capabilities) values
  ('agency-medical',  'ambulance', 'AMB-01', 'available',
   st_point(3.3800, 6.5200)::geography, array['ALS', 'defibrillator', 'oxygen']),
  ('agency-medical',  'ambulance', 'AMB-02', 'available',
   st_point(3.3350, 6.5950)::geography, array['BLS', 'oxygen']),
  ('agency-security', 'police',    'POL-14', 'available',
   st_point(3.3900, 6.4500)::geography, array['armed_response', 'body_cam']),
  ('agency-fire',     'fire',      'FIRE-07', 'available',
   st_point(3.3400, 6.5900)::geography, array['hazmat', 'ladder', 'rescue'])
on conflict do nothing;

insert into hospitals (name, location, capabilities, available_beds) values
  ('Lagos University Teaching Hospital', st_point(3.3619, 6.5175)::geography,
   array['trauma', 'cardiac', 'burn'], 12),
  ('Reddington Hospital Victoria Island', st_point(3.4219, 6.4318)::geography,
   array['cardiac', 'stroke'], 4)
on conflict do nothing;
