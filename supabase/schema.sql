-- Esquema para la "Copia en la nube" del Panel Personal.
-- Ejecútalo en tu proyecto de Supabase: SQL Editor → pega esto → Run.
--
-- Guarda UNA fila por usuario con el estado completo (JSON o texto cifrado).
-- La seguridad la dan las políticas RLS: cada usuario solo puede ver y modificar
-- su propia fila.

create table if not exists public.backups (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  data text not null,
  updated_at timestamptz not null default now()
);

alter table public.backups enable row level security;

-- Un usuario solo lee su propia fila.
drop policy if exists "backups_select_own" on public.backups;
create policy "backups_select_own" on public.backups
  for select using (auth.uid() = user_id);

-- Un usuario solo puede insertar una fila con su propio id.
drop policy if exists "backups_insert_own" on public.backups;
create policy "backups_insert_own" on public.backups
  for insert with check (auth.uid() = user_id);

-- Un usuario solo puede actualizar su propia fila.
drop policy if exists "backups_update_own" on public.backups;
create policy "backups_update_own" on public.backups
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
