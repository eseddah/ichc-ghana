-- Original public.get_my_application_status, saved before the interview state was added.
-- Run this in the Supabase SQL editor to put the function back exactly as it was.
-- (The helper public.app_status_calc added by the update can stay or be dropped; nothing else uses it.)
CREATE OR REPLACE FUNCTION public.get_my_application_status(p_token text, p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  apps jsonb;
  decisions jsonb;
  pending jsonb;
  latest jsonb;
begin
  select value into apps from ichc_kv where key = 'applications:list';
  select value into decisions from ichc_kv where key = 'application_decisions:list';

  if p_token is not null and p_token <> '' then
    select elem into pending from jsonb_array_elements(coalesce(apps,'[]'::jsonb)) elem
    where elem->>'token' = p_token limit 1;
  end if;
  if pending is null and p_email is not null and p_email <> '' then
    select elem into pending from jsonb_array_elements(coalesce(apps,'[]'::jsonb)) elem
    where lower(elem->>'email') = lower(p_email) and (elem->>'token') is null limit 1;
  end if;
  if pending is not null then
    -- Interest List signups (closed-period, status:'interested') get their own
    -- banner type: "in review" would be the wrong message for someone who
    -- hasn't actually applied yet, just registered interest.
    if pending->>'status' = 'interested' then
      return jsonb_build_object('type','interested','key','interested:'||(pending->>'id'));
    end if;
    return jsonb_build_object('type','pending','key','pending:'||(pending->>'id'));
  end if;

  if p_token is not null and p_token <> '' then
    select elem into latest from jsonb_array_elements(coalesce(decisions,'[]'::jsonb)) elem
    where elem->>'token' = p_token order by elem->>'date' desc limit 1;
  end if;
  if latest is null and p_email is not null and p_email <> '' then
    select elem into latest from jsonb_array_elements(coalesce(decisions,'[]'::jsonb)) elem
    where lower(elem->>'email') = lower(p_email) and (elem->>'token') is null order by elem->>'date' desc limit 1;
  end if;
  if latest is not null then
    return jsonb_build_object('type', latest->>'decision', 'reason', latest->>'reason', 'key', latest->>'id');
  end if;

  return null;
end;
$function$;
