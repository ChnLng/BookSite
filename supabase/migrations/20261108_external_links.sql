update public.content_sections
set title = 'Liens externes', updated_at = now()
where section_key = 'liens-partenaires';

with links(title_fr, target_url, sort_order) as (
  values
    ('Applications Android', 'https://play.google.com/store/apps/developer?id=Visd+AR', 20),
    ('Albums illustrés sur Amazon Kindle', 'https://www.amazon.fr/stores/Visd-AR/author/B0GX4QJQJW/allbooks', 30),
    ('TikTok', 'https://www.tiktok.com/@visd_ar', 40),
    ('X', 'https://x.com/visd_ar', 50),
    ('Instagram', 'https://www.instagram.com/visd_ar', 60),
    ('YouTube', 'https://www.youtube.com/@VisdARfr', 70),
    ('LinkedIn', 'https://www.linkedin.com/in/visd-ar', 80),
    ('Malt', 'https://www.malt.fr/profile/visdar', 90),
    ('RedBubble', 'https://www.redbubble.com/fr/people/visdar', 100),
    ('Spreadshirt', 'https://visd-ar.myspreadshop.fr', 110)
)
insert into public.partner_links (title_fr, icon_url, target_url, tooltip_text, sort_order, visible)
select links.title_fr, '', links.target_url, links.title_fr, links.sort_order, true
from links
where not exists (select 1 from public.partner_links existing where existing.target_url = links.target_url);
