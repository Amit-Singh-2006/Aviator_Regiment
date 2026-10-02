-- Aviator's Regiment V1: careers directory.
--
-- Each career (role) lists companies, and each company links to its official
-- careers page for that role. Admins manage both from the admin panel; the
-- public site shows published entries only. Links were checked on 2026-10-02.

create table public.career_roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  summary text not null default '' check (char_length(summary) <= 300),
  guide text check (guide is null or char_length(guide) <= 20000),
  enquiry text not null check (char_length(enquiry) between 2 and 120),
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.career_companies (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.career_roles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  careers_url text not null check (careers_url ~ '^https://\S+$'),
  note text check (note is null or char_length(note) <= 120),
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, name)
);
create index career_companies_role_sort_idx on public.career_companies (role_id, sort_order);

create trigger career_roles_updated_at before update on public.career_roles for each row execute function private.set_updated_at();
create trigger career_companies_updated_at before update on public.career_companies for each row execute function private.set_updated_at();

alter table public.career_roles enable row level security;
alter table public.career_companies enable row level security;

grant select on public.career_roles, public.career_companies to anon, authenticated;
grant insert, update, delete on public.career_roles, public.career_companies to authenticated;
grant all on public.career_roles, public.career_companies to service_role;

create policy "Published careers are public" on public.career_roles
  for select to anon, authenticated using (published or (select private.is_admin()));
create policy "Admins insert careers" on public.career_roles
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update careers" on public.career_roles
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete careers" on public.career_roles
  for delete to authenticated using ((select private.is_admin()));

create policy "Published career companies are public" on public.career_companies
  for select to anon, authenticated using (
    (published and exists (select 1 from public.career_roles r where r.id = role_id and r.published))
    or (select private.is_admin())
  );
create policy "Admins insert career companies" on public.career_companies
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update career companies" on public.career_companies
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete career companies" on public.career_companies
  for delete to authenticated using ((select private.is_admin()));

-- Starting directory (admins can edit, reorder, hide or remove entries).
insert into public.career_roles (slug, name, summary, enquiry, sort_order) values
  ('commercial-pilot', 'Commercial Pilot', 'Fly passengers and cargo for airlines and charter operators with a DGCA Commercial Pilot Licence (CPL).', 'becoming a commercial pilot', 1),
  ('private-pilot', 'Private Pilot', 'Fly for personal and recreational purposes with a Private Pilot Licence (PPL). A PPL doesn''t allow paid flying, so the organisations below are flying schools that offer PPL training.', 'getting a private pilot licence', 2),
  ('flight-instructor', 'Flight Instructor', 'Train the next generation of pilots at flying training organisations by adding an instructor rating to your licence.', 'becoming a flight instructor', 3),
  ('airline-careers', 'Airline Careers', 'Explore the airline world beyond the flight deck, from operations and planning to customer service and management.', 'airline careers', 4),
  ('defence-aviation', 'Defence Aviation', 'Fly and serve with the Indian Air Force, Indian Navy, Indian Army or Indian Coast Guard through the defence selection process.', 'a career in defence aviation', 5),
  ('cabin-crew', 'Cabin Crew', 'Look after passenger safety and comfort on board as part of an airline''s cabin crew team.', 'becoming cabin crew', 6),
  ('aircraft-maintenance-engineering', 'Aircraft Maintenance / Engineering', 'Keep aircraft safe and airworthy as a licensed Aircraft Maintenance Engineer (AME) or aviation technician.', 'a career in aircraft maintenance engineering', 7),
  ('atc', 'Air Traffic Control (ATC)', 'Keep aircraft safely separated and traffic flowing, in the air and on the ground, as an air traffic controller.', 'becoming an air traffic controller', 8),
  ('ground-operations', 'Ground Operations', 'Keep flights moving on the ground, from ramp and baggage handling to passenger services and aircraft turnaround.', 'a career in ground operations', 9),
  ('other-aviation-careers', 'Other Aviation Careers', 'Discover more ways to build a life in aviation, from airport management and aerospace manufacturing to drone operations.', 'other aviation careers', 10);

insert into public.career_companies (role_id, name, careers_url, note, sort_order)
select r.id, v.name, v.url, v.note, v.sort_order
from (values
  ('commercial-pilot', 'IndiGo', 'https://www.goindigo.in/careers/departments/flightoperations.html', 'Flight operations', 1),
  ('commercial-pilot', 'Air India', 'https://pilotcareers.airindia.com/', 'Pilot careers', 2),
  ('commercial-pilot', 'Air India Cadet Pilot Programme', 'https://cadetpilot.airindia.com/', 'Cadet pilot programme', 3),
  ('commercial-pilot', 'Air India Trainee Pilot Programme', 'https://traineepilot.airindia.com/', 'Trainee pilot programme', 4),
  ('commercial-pilot', 'Air India Express', 'https://www.airindiaexpress.com/careers', 'Current vacancies', 5),
  ('commercial-pilot', 'Akasa Air', 'https://www.akasaair.com/careers-at-akasa-air/pilots-careers-at-akasa-air', 'Pilot careers', 6),
  ('commercial-pilot', 'SpiceJet', 'https://corporate.spicejet.com/Careers.aspx', 'Current openings', 7),
  ('commercial-pilot', 'Alliance Air', 'https://www.allianceair.in/careers', 'Recruitment notices', 8),
  ('commercial-pilot', 'Star Air', 'https://www.starair.in/careers', 'Current openings', 9),
  ('commercial-pilot', 'Fly91', 'https://fly91.in/careers', 'Current openings', 10),
  ('commercial-pilot', 'Pawan Hans', 'https://www.pawanhans.co.in/english/career.aspx', 'Helicopter operator', 11),
  ('commercial-pilot', 'Emirates', 'https://www.emiratesgroupcareers.com/pilots/', 'International airline', 12),

  ('private-pilot', 'The Bombay Flying Club', 'https://thebombayflyingclub.com/hobby-flying-private-pilot-licence-course/', 'Executive PPL, Mumbai', 1),
  ('private-pilot', 'The Madhya Pradesh Flying Club', 'https://mpfc.in/index.php/service/private-pilot-license/', 'PPL course, Indore', 2),
  ('private-pilot', 'Redbird Aviation', 'https://redbirdaviation.com/private-pilot-license-course-ppl/', 'PPL course', 3),

  ('flight-instructor', 'Indira Gandhi Rashtriya Uran Akademi (IGRUA)', 'https://www.igrua.gov.in/careers', 'Recruitment notices', 1),
  ('flight-instructor', 'Redbird Aviation', 'https://redbirdaviation.com/career/', 'Careers', 2),
  ('flight-instructor', 'CAE', 'https://www.cae.com/civil-aviation/instructor-pilot-jobs-at-cae', 'Instructor pilot jobs', 3),

  ('airline-careers', 'IndiGo', 'https://www.goindigo.in/careers/departments.html', 'All departments', 1),
  ('airline-careers', 'Air India', 'https://careers.airindia.com/', 'All openings', 2),
  ('airline-careers', 'Air India Express', 'https://www.airindiaexpress.com/careers', 'Current vacancies', 3),
  ('airline-careers', 'Akasa Air', 'https://www.akasaair.com/careers-at-akasa-air/corporate-and-commercial-careers-at-akasa-air', 'Corporate and commercial roles', 4),
  ('airline-careers', 'SpiceJet', 'https://corporate.spicejet.com/Careers.aspx', 'Current openings', 5),
  ('airline-careers', 'Alliance Air', 'https://www.allianceair.in/careers', 'Recruitment notices', 6),
  ('airline-careers', 'Star Air', 'https://www.starair.in/careers', 'Current openings', 7),
  ('airline-careers', 'Fly91', 'https://fly91.in/careers', 'Current openings', 8),
  ('airline-careers', 'Emirates Group', 'https://www.emiratesgroupcareers.com/', 'International', 9),
  ('airline-careers', 'Qatar Airways', 'https://careers.qatarairways.com/', 'International', 10),
  ('airline-careers', 'Etihad', 'https://careers.etihad.com/', 'International', 11),

  ('defence-aviation', 'Indian Air Force', 'https://careerindianairforce.cdac.in/', 'Officer and airmen entries', 1),
  ('defence-aviation', 'Indian Navy', 'https://www.joinindiannavy.gov.in/en/page/officers-ways-to-join.html', 'Officer entries', 2),
  ('defence-aviation', 'Indian Army', 'https://joinindianarmy.nic.in/', 'Officer entries', 3),
  ('defence-aviation', 'Indian Coast Guard', 'https://joinindiancoastguard.cdac.in/cgcat/', 'Officer entries (CGCAT)', 4),
  ('defence-aviation', 'Union Public Service Commission (UPSC)', 'https://upsc.gov.in/', 'NDA and CDS examinations', 5),

  ('cabin-crew', 'IndiGo', 'https://www.goindigo.in/careers/departments/inflightservices.html', 'Inflight services', 1),
  ('cabin-crew', 'Air India', 'https://cabincrewcareers.airindia.com/', 'Cabin crew programme', 2),
  ('cabin-crew', 'Air India Express', 'https://www.airindiaexpress.com/careers', 'Current vacancies', 3),
  ('cabin-crew', 'Akasa Air', 'https://www.akasaair.com/careers-at-akasa-air/crew-careers-at-akasa-air', 'Cabin crew', 4),
  ('cabin-crew', 'SpiceJet', 'https://corporate.spicejet.com/Careers.aspx', 'Current openings', 5),
  ('cabin-crew', 'Emirates', 'https://www.emiratesgroupcareers.com/cabin-crew/', 'International airline', 6),
  ('cabin-crew', 'Qatar Airways', 'https://www.qatarairways.com/en/careers/customer-experience/cabin-crew-recruitment.html', 'International airline', 7),
  ('cabin-crew', 'Etihad', 'https://careers.etihad.com/teams/cabin-crew', 'International airline', 8),

  ('aircraft-maintenance-engineering', 'AI Engineering Services (AIESL)', 'https://aiesl.in/careers', 'Current openings', 1),
  ('aircraft-maintenance-engineering', 'Air India', 'https://careers.airindia.com/go/Engineering/668144/', 'Engineering', 2),
  ('aircraft-maintenance-engineering', 'IndiGo', 'https://www.goindigo.in/careers/departments/engineering.html', 'Engineering', 3),
  ('aircraft-maintenance-engineering', 'Akasa Air', 'https://www.akasaair.com/aircraft-maintenance-engineering-training-programme', 'AME training programme', 4),
  ('aircraft-maintenance-engineering', 'Hindustan Aeronautics Limited (HAL)', 'https://hal-india.co.in/career', 'Careers', 5),
  ('aircraft-maintenance-engineering', 'Pawan Hans', 'https://www.pawanhans.co.in/english/career.aspx', 'Helicopter operator', 6),
  ('aircraft-maintenance-engineering', 'Airbus', 'https://www.airbus.com/en/careers', 'Aerospace', 7),
  ('aircraft-maintenance-engineering', 'Boeing', 'https://jobs.boeing.com/', 'Aerospace', 8),

  ('atc', 'Airports Authority of India (AAI)', 'https://www.aai.aero/en/careers/recruitment', 'Junior Executive (ATC) recruitment', 1),
  ('atc', 'Indian Air Force', 'https://careerindianairforce.cdac.in/', 'Officer entries', 2),
  ('atc', 'Indian Navy', 'https://www.joinindiannavy.gov.in/en/page/officers-ways-to-join.html', 'Officer entries', 3),

  ('ground-operations', 'AI Airport Services (AIASL)', 'https://www.aiasl.in/Recruitment', 'Recruitment', 1),
  ('ground-operations', 'AISATS', 'https://www.aisats.in/careers', 'Current openings', 2),
  ('ground-operations', 'Bird Group', 'https://bird.in/careers/', 'Careers', 3),
  ('ground-operations', 'Çelebi Aviation', 'https://www.celebiaviation.com/career', 'Global careers page', 4),
  ('ground-operations', 'IndiGo', 'https://www.goindigo.in/careers/departments/airportoperationscustomerservices.html', 'Airport operations and customer services', 5),
  ('ground-operations', 'Air India', 'https://careers.airindia.com/go/Ground-Services/668244/', 'Ground services', 6),

  ('other-aviation-careers', 'Airports Authority of India (AAI)', 'https://www.aai.aero/en/careers/recruitment', 'Airport management and engineering', 1),
  ('other-aviation-careers', 'Pawan Hans', 'https://www.pawanhans.co.in/english/career.aspx', 'Helicopter services', 2),
  ('other-aviation-careers', 'Hindustan Aeronautics Limited (HAL)', 'https://hal-india.co.in/career', 'Aerospace manufacturing', 3),
  ('other-aviation-careers', 'ideaForge', 'https://ideaforgetech.com/career', 'Drones', 4),
  ('other-aviation-careers', 'Garuda Aerospace', 'https://www.garudaaerospace.com/company/careers', 'Drones', 5),
  ('other-aviation-careers', 'CAE', 'https://www.cae.com/careers/', 'Simulation and training', 6),
  ('other-aviation-careers', 'Airbus', 'https://www.airbus.com/en/careers', 'Aerospace', 7),
  ('other-aviation-careers', 'Boeing', 'https://jobs.boeing.com/', 'Aerospace', 8)
) as v (slug, name, url, note, sort_order)
join public.career_roles r on r.slug = v.slug;
