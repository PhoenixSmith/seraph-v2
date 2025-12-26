-- Darken platinum tier color for better contrast with white text
-- Previous color #E5E4E2 was too light for white text readability

UPDATE public.tier_thresholds
SET color = '#0891b2'  -- Tailwind cyan-600, provides good contrast for white text
WHERE tier = 'Platinum';
