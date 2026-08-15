-- ZAPILINK — Normaliza plataformas dos links sociais (legado capitalizado)
-- Execute no SQL Editor do Supabase.
-- Converte ex.: "Instagram" -> "instagram", "Website" -> "site", "YouTube" -> "youtube".

update public.profiles
set social_links = coalesce(
  (
    select jsonb_agg(
      jsonb_build_object(
        'url', elem->>'url',
        'platform',
        case lower(elem->>'platform')
          when 'website' then 'site'
          else lower(elem->>'platform')
        end
      )
    )
    from jsonb_array_elements(social_links) elem
  ),
  '[]'::jsonb
)
where social_links is not null
  and jsonb_typeof(social_links) = 'array'
  and social_links != '[]'::jsonb;