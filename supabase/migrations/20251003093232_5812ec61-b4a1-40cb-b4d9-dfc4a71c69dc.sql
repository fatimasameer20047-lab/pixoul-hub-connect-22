-- Drop existing policies that reference auth.users
drop policy if exists "Pixoul staff can manage posts" on public.pixoul_posts;
drop policy if exists "Published posts are viewable by everyone" on public.pixoul_posts;

-- Alter table to match new schema
alter table public.pixoul_posts
  drop column if exists media_urls,
  add column if not exists images jsonb not null default '[]',
  add column if not exists pinned boolean not null default false,
  add column if not exists published_at timestamptz;

-- Update type constraint
alter table public.pixoul_posts 
  drop constraint if exists pixoul_posts_type_check;
  
alter table public.pixoul_posts
  add constraint pixoul_posts_type_check 
  check (type in ('event', 'program', 'announcement', 'post'));

-- Create indexes for better performance
create index if not exists pixoul_posts_author_status_idx on public.pixoul_posts(author_id, status);
create index if not exists pixoul_posts_sort_idx on public.pixoul_posts(pinned desc, created_at desc);

-- RLS policies that work without referencing auth.users
create policy "read_published_or_own"
on public.pixoul_posts
for select
using (
  status = 'published'
  or auth.uid() = author_id
);

-- Only the Pixoul account can manage posts
-- We check the email by looking it up in a secure way
create policy "pixoul_manage_own"
on public.pixoul_posts
for all
to authenticated
using (
  auth.uid() = author_id 
  and exists (
    select 1 from auth.users 
    where auth.users.id = auth.uid() 
    and auth.users.email = 'pixoulgaming@staffportal.com'
  )
)
with check (
  auth.uid() = author_id
  and exists (
    select 1 from auth.users 
    where auth.users.id = auth.uid() 
    and auth.users.email = 'pixoulgaming@staffportal.com'
  )
);

-- Create storage bucket for Pixoul posts
insert into storage.buckets (id, name, public)
values ('pixoul-posts', 'pixoul-posts', true)
on conflict (id) do nothing;

-- Storage policies: public read, Pixoul-only write
create policy "Public can view Pixoul post images"
on storage.objects
for select
using (bucket_id = 'pixoul-posts');

create policy "Pixoul can upload images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pixoul-posts'
  and exists (
    select 1 from auth.users 
    where auth.users.id = auth.uid() 
    and auth.users.email = 'pixoulgaming@staffportal.com'
  )
);

create policy "Pixoul can delete images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pixoul-posts'
  and exists (
    select 1 from auth.users 
    where auth.users.id = auth.uid() 
    and auth.users.email = 'pixoulgaming@staffportal.com'
  )
);