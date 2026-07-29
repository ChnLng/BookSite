alter table public.books
  add column if not exists external_purchase_label text;

update public.books
set external_purchase_label = 'Amazon broché'
where external_purchase_label is null or trim(external_purchase_label) = '';

update public.books
set title_fr = 'Jiti le faon crédule'
where slug = 'jiti' and title_fr = 'Jiti le faon credule';

update public.books
set synopsis_fr = case slug
  when 'lumi' then 'Lumi veut plaire à tout le monde, jusqu''au jour où il comprend qu''il n''a plus d''énergie pour lui-même. Pas à pas, il apprend à dire non avec douceur et à suivre son propre chemin.'
  when 'jiti' then 'Jiti accepte trop facilement ce qu''on lui demande. En observant le monde autour de lui, il commence enfin à poser une question essentielle : pour le bien de qui fais-je cela ?'
  when 'taogao' then 'Taogao porte la tristesse des autres comme si elle lui appartenait. Ce récit tendre l''aide à rendre à chacun ce qui lui revient et à retrouver une respiration plus légère.'
  when 'fulbert' then 'Fulbert adore dessiner, mais son temps disparaît à force d''aider tout le monde. Avec l''aide d''un grand chat, il apprend à protéger son temps et à terminer ce qui compte pour lui.'
  else synopsis_fr
end
where slug in ('lumi', 'jiti', 'taogao', 'fulbert');

notify pgrst, 'reload schema';
