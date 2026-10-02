-- Aviator's Regiment V1: images for news articles.
--
-- Admins upload images from the news editor. The bucket is public so published
-- articles can show them by URL; only admins can add or remove files.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-images', 'news-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Admins upload news images" on storage.objects
  for insert to authenticated with check (bucket_id = 'news-images' and (select private.is_admin()));
create policy "Admins see news images" on storage.objects
  for select to authenticated using (bucket_id = 'news-images' and (select private.is_admin()));
create policy "Admins remove news images" on storage.objects
  for delete to authenticated using (bucket_id = 'news-images' and (select private.is_admin()));
