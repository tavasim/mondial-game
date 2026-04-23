-- Seed tournament + group-stage matches (aligned with src/lib/matches.ts)
-- Prerequisites: run 01_schema.sql first

insert into public.tournaments (id, name, betting_deadline_at)
values (
  'WC2026',
  'FIFA World Cup 2026',
  timestamptz '2026-06-10 23:59:59.999+00'
)
on conflict (id) do update
set
  name = excluded.name,
  betting_deadline_at = excluded.betting_deadline_at;

do $$
declare
  teams text[] := array[
    'Argentina',
    'Australia',
    'Belgium',
    'Brazil',
    'Canada',
    'Colombia',
    'Croatia',
    'Denmark',
    'Ecuador',
    'Egypt',
    'England',
    'France',
    'Germany',
    'Ghana',
    'Iran',
    'Japan',
    'Mexico',
    'Morocco',
    'Netherlands',
    'Nigeria',
    'Norway',
    'Paraguay',
    'Poland',
    'Portugal',
    'Qatar',
    'Saudi Arabia',
    'Senegal',
    'Serbia',
    'South Africa',
    'South Korea',
    'Spain',
    'Switzerland',
    'Tunisia',
    'United States',
    'Uruguay',
    'Wales',
    'Algeria',
    'Austria',
    'Bosnia and Herzegovina',
    'Czechia',
    'Jamaica',
    'New Zealand',
    'Panama',
    'Romania',
    'Scotland',
    'Ukraine',
    'Turkey',
    'Ivory Coast'
  ];
  grp int;
  gcode text;
  t0 text;
  t1 text;
  t2 text;
  t3 text;
  j int;
  r int;
  home_t text;
  away_t text;
  mid text;
  kick timestamptz;
  base timestamptz := timestamptz '2026-06-11 00:00:00+00';
  slot int := 0;
begin
  if array_length(teams, 1) <> 48 then
    raise exception 'Expected 48 teams, got %', array_length(teams, 1);
  end if;

  for grp in 0..11 loop
    gcode := chr(ascii('A') + grp);
    t0 := teams[grp * 4 + 1];
    t1 := teams[grp * 4 + 2];
    t2 := teams[grp * 4 + 3];
    t3 := teams[grp * 4 + 4];

    for j in 0..5 loop
      if j = 0 then
        home_t := t0;
        away_t := t3;
        r := 1;
      elsif j = 1 then
        home_t := t1;
        away_t := t2;
        r := 1;
      elsif j = 2 then
        home_t := t0;
        away_t := t2;
        r := 2;
      elsif j = 3 then
        home_t := t1;
        away_t := t3;
        r := 2;
      elsif j = 4 then
        home_t := t0;
        away_t := t1;
        r := 3;
      else
        home_t := t2;
        away_t := t3;
        r := 3;
      end if;

      mid := format('WC2026-%s-R%s-M%s', gcode, r, j + 1);
      kick := base + make_interval(mins => slot * 45);

      insert into public.matches (
        id,
        tournament_id,
        phase,
        group_code,
        round,
        home_team,
        away_team,
        kickoff_at
      )
      values (
        mid,
        'WC2026',
        'group',
        gcode,
        r::smallint,
        home_t,
        away_t,
        kick
      )
      on conflict (id) do update
      set
        tournament_id = excluded.tournament_id,
        phase = excluded.phase,
        group_code = excluded.group_code,
        round = excluded.round,
        home_team = excluded.home_team,
        away_team = excluded.away_team,
        kickoff_at = excluded.kickoff_at;

      slot := slot + 1;
    end loop;
  end loop;
end $$;
