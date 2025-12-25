-- ============================================================================
-- SERAPH BIBLE READER - BOOK COMPLETION ACHIEVEMENTS
-- Modular achievement system: One funny achievement per book of the Bible
-- Awarded on 100% completion of all chapters in that book
-- ============================================================================

-- ============================================================================
-- BOOK COMPLETION ACHIEVEMENTS (66 total)
-- ============================================================================

INSERT INTO public.achievements (key, name, description, icon, category, requirement, xp_reward) VALUES
-- OLD TESTAMENT (39 books)
-- Torah / Pentateuch
('book_genesis', 'The OG Reader', 'Complete all 50 chapters of Genesis - you''ve witnessed creation!', '🌍', 'book_completion', '{"book": "Genesis", "chapters": 50}', 100),
('book_exodus', 'Let My People Read!', 'Complete all 40 chapters of Exodus - freedom has never felt so good', '🚶', 'book_completion', '{"book": "Exodus", "chapters": 40}', 80),
('book_leviticus', 'Law & Order: Ancient Edition', 'Complete all 27 chapters of Leviticus - you survived the fine print!', '📜', 'book_completion', '{"book": "Leviticus", "chapters": 27}', 60),
('book_numbers', 'I Can Count!', 'Complete all 36 chapters of Numbers - census complete, soldier!', '🔢', 'book_completion', '{"book": "Numbers", "chapters": 36}', 75),
('book_deuteronomy', 'The Sequel Reader', 'Complete all 34 chapters of Deuteronomy - Moses'' greatest hits, remixed', '📖', 'book_completion', '{"book": "Deuteronomy", "chapters": 34}', 70),

-- Historical Books
('book_joshua', 'Wall Breaker', 'Complete all 24 chapters of Joshua - Jericho didn''t see you coming!', '🏰', 'book_completion', '{"book": "Joshua", "chapters": 24}', 50),
('book_judges', 'Judge, Jury, Reader', 'Complete all 21 chapters of Judges - cycle of chaos, conquered!', '⚖️', 'book_completion', '{"book": "Judges", "chapters": 21}', 45),
('book_ruth', 'Loyal to the Last Page', 'Complete all 4 chapters of Ruth - a short but sweet victory', '🌾', 'book_completion', '{"book": "Ruth", "chapters": 4}', 20),
('book_1samuel', 'Prophet Starter Pack', 'Complete all 31 chapters of I Samuel - from shepherd boy to king!', '👑', 'book_completion', '{"book": "I Samuel", "chapters": 31}', 65),
('book_2samuel', 'David''s Biggest Fan', 'Complete all 24 chapters of II Samuel - the king''s saga continues', '🎵', 'book_completion', '{"book": "II Samuel", "chapters": 24}', 50),
('book_1kings', 'Royal Reader I', 'Complete all 22 chapters of I Kings - throne room access granted', '👑', 'book_completion', '{"book": "I Kings", "chapters": 22}', 45),
('book_2kings', 'Royal Reader II', 'Complete all 25 chapters of II Kings - witnessed the fall of kingdoms', '🏚️', 'book_completion', '{"book": "II Kings", "chapters": 25}', 55),
('book_1chronicles', 'History Buff I', 'Complete all 29 chapters of I Chronicles - you love the details!', '📚', 'book_completion', '{"book": "I Chronicles", "chapters": 29}', 60),
('book_2chronicles', 'History Buff II', 'Complete all 36 chapters of II Chronicles - genealogy master', '🌳', 'book_completion', '{"book": "II Chronicles", "chapters": 36}', 75),
('book_ezra', 'E-Z Does It', 'Complete all 10 chapters of Ezra - temple restoration complete!', '🏛️', 'book_completion', '{"book": "Ezra", "chapters": 10}', 25),
('book_nehemiah', 'Wall Builder', 'Complete all 13 chapters of Nehemiah - 52 days, no problem!', '🧱', 'book_completion', '{"book": "Nehemiah", "chapters": 13}', 30),
('book_esther', 'For Such A Time As This', 'Complete all 10 chapters of Esther - queen-level reading achieved', '👸', 'book_completion', '{"book": "Esther", "chapters": 10}', 25),

-- Wisdom Literature
('book_job', 'Patience Is A Virtue', 'Complete all 42 chapters of Job - you endured the suffering!', '🤕', 'book_completion', '{"book": "Job", "chapters": 42}', 85),
('book_psalms', 'Psalm-body Call A Doctor!', 'Complete all 150 chapters of Psalms - the ultimate worship warrior', '🎶', 'book_completion', '{"book": "Psalms", "chapters": 150}', 200),
('book_proverbs', 'Wisdom Unlocked', 'Complete all 31 chapters of Proverbs - you''re officially wise now', '🦉', 'book_completion', '{"book": "Proverbs", "chapters": 31}', 65),
('book_ecclesiastes', 'Vanity Fair', 'Complete all 12 chapters of Ecclesiastes - everything is meaningless... except this achievement!', '💨', 'book_completion', '{"book": "Ecclesiastes", "chapters": 12}', 30),
('book_songofsolomon', 'Hopeless Romantic', 'Complete all 8 chapters of Song of Solomon - love is in the air', '💕', 'book_completion', '{"book": "Song of Solomon", "chapters": 8}', 25),

-- Major Prophets
('book_isaiah', 'Major League Prophet', 'Complete all 66 chapters of Isaiah - a book within a book!', '📢', 'book_completion', '{"book": "Isaiah", "chapters": 66}', 130),
('book_jeremiah', 'The Weeping Reader', 'Complete all 52 chapters of Jeremiah - tears of joy allowed', '😢', 'book_completion', '{"book": "Jeremiah", "chapters": 52}', 105),
('book_lamentations', 'Sadness Speedrun', 'Complete all 5 chapters of Lamentations - shortest sad story ever', '💔', 'book_completion', '{"book": "Lamentations", "chapters": 5}', 20),
('book_ezekiel', 'Wheel Watcher', 'Complete all 48 chapters of Ezekiel - those visions make sense now, right?', '☸️', 'book_completion', '{"book": "Ezekiel", "chapters": 48}', 95),
('book_daniel', 'Lion''s Den Legend', 'Complete all 12 chapters of Daniel - survived the dreams and the lions', '🦁', 'book_completion', '{"book": "Daniel", "chapters": 12}', 30),

-- Minor Prophets (The Twelve)
('book_hosea', 'Unconditional Love', 'Complete all 14 chapters of Hosea - a love story like no other', '💍', 'book_completion', '{"book": "Hosea", "chapters": 14}', 35),
('book_joel', 'Locust Hunter', 'Complete all 3 chapters of Joel - survived the swarm!', '🦗', 'book_completion', '{"book": "Joel", "chapters": 3}', 15),
('book_amos', 'Shepherd''s Crook', 'Complete all 9 chapters of Amos - from sheep to prophecy', '🐑', 'book_completion', '{"book": "Amos", "chapters": 9}', 25),
('book_obadiah', 'One and Done', 'Complete Obadiah - the shortest book flex!', '⚡', 'book_completion', '{"book": "Obadiah", "chapters": 1}', 10),
('book_jonah', 'Whale of a Tale', 'Complete all 4 chapters of Jonah - fish story verified!', '🐋', 'book_completion', '{"book": "Jonah", "chapters": 4}', 20),
('book_micah', 'Mic Drop', 'Complete all 7 chapters of Micah - justice rolled down', '🎤', 'book_completion', '{"book": "Micah", "chapters": 7}', 25),
('book_nahum', 'Nineveh''s Nightmare', 'Complete all 3 chapters of Nahum - vengeance is the Lord''s', '⚔️', 'book_completion', '{"book": "Nahum", "chapters": 3}', 15),
('book_habakkuk', 'Question Everything', 'Complete all 3 chapters of Habakkuk - your questions were valid', '❓', 'book_completion', '{"book": "Habakkuk", "chapters": 3}', 15),
('book_zephaniah', 'Day of the Lord', 'Complete all 3 chapters of Zephaniah - judgment day prepared', '☀️', 'book_completion', '{"book": "Zephaniah", "chapters": 3}', 15),
('book_haggai', 'Temple Rebuilder', 'Complete all 2 chapters of Haggai - priorities straight!', '🏗️', 'book_completion', '{"book": "Haggai", "chapters": 2}', 10),
('book_zechariah', 'Vision Quest', 'Complete all 14 chapters of Zechariah - 8 visions conquered', '👁️', 'book_completion', '{"book": "Zechariah", "chapters": 14}', 35),
('book_malachi', 'Last Words (OT Edition)', 'Complete all 4 chapters of Malachi - Old Testament complete!', '🔚', 'book_completion', '{"book": "Malachi", "chapters": 4}', 20),

-- NEW TESTAMENT (27 books)
-- Gospels
('book_matthew', 'Gospel Getter I', 'Complete all 28 chapters of Matthew - the Jewish perspective unlocked', '📕', 'book_completion', '{"book": "Matthew", "chapters": 28}', 60),
('book_mark', 'On Your Mark...', 'Complete all 16 chapters of Mark - shortest Gospel, still counts!', '🏃', 'book_completion', '{"book": "Mark", "chapters": 16}', 40),
('book_luke', 'Luke Who''s Reading!', 'Complete all 24 chapters of Luke - the doctor is in', '👨‍⚕️', 'book_completion', '{"book": "Luke", "chapters": 24}', 50),
('book_john', 'In The Beginning Was The Word', 'Complete all 21 chapters of John - the beloved disciple approves', '🕊️', 'book_completion', '{"book": "John", "chapters": 21}', 45),

-- History
('book_acts', 'Acts of Dedication', 'Complete all 28 chapters of Acts - church history unlocked', '⛪', 'book_completion', '{"book": "Acts", "chapters": 28}', 60),

-- Pauline Epistles
('book_romans', 'When In Rome...', 'Complete all 16 chapters of Romans - theology degree pending', '🏛️', 'book_completion', '{"book": "Romans", "chapters": 16}', 40),
('book_1corinthians', 'Love Is Patient', 'Complete all 16 chapters of I Corinthians - chapter 13 hits different', '💗', 'book_completion', '{"book": "I Corinthians", "chapters": 16}', 40),
('book_2corinthians', 'Strength In Weakness', 'Complete all 13 chapters of II Corinthians - Paul''s heart revealed', '💪', 'book_completion', '{"book": "II Corinthians", "chapters": 13}', 35),
('book_galatians', 'Freedom Fighter', 'Complete all 6 chapters of Galatians - law vs grace settled', '🗽', 'book_completion', '{"book": "Galatians", "chapters": 6}', 25),
('book_ephesians', 'Armor Bearer', 'Complete all 6 chapters of Ephesians - fully armored up!', '🛡️', 'book_completion', '{"book": "Ephesians", "chapters": 6}', 25),
('book_philippians', 'Joy Rider', 'Complete all 4 chapters of Philippians - rejoicing intensifies', '😊', 'book_completion', '{"book": "Philippians", "chapters": 4}', 20),
('book_colossians', 'Colossal Achievement', 'Complete all 4 chapters of Colossians - Christ is supreme!', '⭐', 'book_completion', '{"book": "Colossians", "chapters": 4}', 20),
('book_1thessalonians', 'Rapture Ready I', 'Complete all 5 chapters of I Thessalonians - keep watching the skies', '☁️', 'book_completion', '{"book": "I Thessalonians", "chapters": 5}', 25),
('book_2thessalonians', 'Rapture Ready II', 'Complete all 3 chapters of II Thessalonians - still watching!', '👀', 'book_completion', '{"book": "II Thessalonians", "chapters": 3}', 15),
('book_1timothy', 'Pastoral Pro I', 'Complete all 6 chapters of I Timothy - ready to lead', '🧑‍🏫', 'book_completion', '{"book": "I Timothy", "chapters": 6}', 25),
('book_2timothy', 'Endurance Runner', 'Complete all 4 chapters of II Timothy - finished the race!', '🏅', 'book_completion', '{"book": "II Timothy", "chapters": 4}', 20),
('book_titus', 'Island Hopper', 'Complete all 3 chapters of Titus - Crete conquered', '🏝️', 'book_completion', '{"book": "Titus", "chapters": 3}', 15),
('book_philemon', 'Short & Sweet', 'Complete Philemon - forgiveness in one chapter', '🤝', 'book_completion', '{"book": "Philemon", "chapters": 1}', 10),

-- General Epistles
('book_hebrews', 'Faith Hall of Famer', 'Complete all 13 chapters of Hebrews - chapter 11 was legendary', '🏆', 'book_completion', '{"book": "Hebrews", "chapters": 13}', 35),
('book_james', 'Faith In Action', 'Complete all 5 chapters of James - taming the tongue achieved', '👅', 'book_completion', '{"book": "James", "chapters": 5}', 25),
('book_1peter', 'Rock Solid I', 'Complete all 5 chapters of I Peter - suffering with hope', '🪨', 'book_completion', '{"book": "I Peter", "chapters": 5}', 25),
('book_2peter', 'Rock Solid II', 'Complete all 3 chapters of II Peter - false teachers exposed', '🔍', 'book_completion', '{"book": "II Peter", "chapters": 3}', 15),
('book_1john', 'Walking In Light I', 'Complete all 5 chapters of I John - love level: maximum', '💡', 'book_completion', '{"book": "I John", "chapters": 5}', 25),
('book_2john', 'Walking In Light II', 'Complete II John - truth and love in one chapter', '✨', 'book_completion', '{"book": "II John", "chapters": 1}', 10),
('book_3john', 'Walking In Light III', 'Complete III John - hospitality unlocked', '🏠', 'book_completion', '{"book": "III John", "chapters": 1}', 10),
('book_jude', 'Hey Jude!', 'Complete Jude - contending for the faith!', '🎸', 'book_completion', '{"book": "Jude", "chapters": 1}', 10),

-- Apocalyptic
('book_revelation', 'Revelation Sensation', 'Complete all 22 chapters of Revelation - you''ve seen how it ends!', '🔮', 'book_completion', '{"book": "Revelation of John", "chapters": 22}', 50);

-- ============================================================================
-- FUNCTION: Check and award book completion achievement
-- ============================================================================
CREATE OR REPLACE FUNCTION check_book_completion_achievement(
    p_user_id UUID,
    p_book TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_achievement RECORD;
    v_required_chapters INTEGER;
    v_completed_chapters INTEGER;
    v_already_has BOOLEAN;
    v_result JSONB;
BEGIN
    -- Find the achievement for this book
    SELECT * INTO v_achievement
    FROM public.achievements
    WHERE category = 'book_completion'
      AND requirement->>'book' = p_book;

    IF v_achievement IS NULL THEN
        RETURN jsonb_build_object('awarded', false, 'reason', 'No achievement found for this book');
    END IF;

    -- Get required chapters from the achievement requirement
    v_required_chapters := (v_achievement.requirement->>'chapters')::INTEGER;

    -- Count completed chapters for this user and book
    SELECT COUNT(*) INTO v_completed_chapters
    FROM public.chapter_completions
    WHERE user_id = p_user_id AND book = p_book;

    -- Check if all chapters are completed
    IF v_completed_chapters < v_required_chapters THEN
        RETURN jsonb_build_object(
            'awarded', false,
            'reason', 'Not all chapters completed',
            'completed', v_completed_chapters,
            'required', v_required_chapters
        );
    END IF;

    -- Check if user already has this achievement
    SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) INTO v_already_has;

    IF v_already_has THEN
        RETURN jsonb_build_object('awarded', false, 'reason', 'Already unlocked');
    END IF;

    -- Award the achievement!
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (p_user_id, v_achievement.id);

    -- Award XP for the achievement
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + v_achievement.xp_reward
    WHERE id = p_user_id;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (p_user_id, CURRENT_DATE, v_achievement.xp_reward)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_achievement.xp_reward;

    -- Recalculate tier
    PERFORM recalculate_user_tier(p_user_id);

    RETURN jsonb_build_object(
        'awarded', true,
        'achievement', jsonb_build_object(
            'id', v_achievement.id,
            'key', v_achievement.key,
            'name', v_achievement.name,
            'description', v_achievement.description,
            'icon', v_achievement.icon,
            'xp_reward', v_achievement.xp_reward
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE: Modify complete_chapter to check for book achievement
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_chapter(
    p_book TEXT,
    p_chapter INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_existing RECORD;
    v_xp_per_chapter INTEGER := 10;
    v_new_total_xp INTEGER;
    v_today DATE := CURRENT_DATE;
    v_achievement_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if already completed
    SELECT * INTO v_existing
    FROM public.chapter_completions
    WHERE user_id = v_user_id AND book = p_book AND chapter = p_chapter;

    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'xp_awarded', 0
        );
    END IF;

    -- Record completion
    INSERT INTO public.chapter_completions (user_id, book, chapter, xp_awarded)
    VALUES (v_user_id, p_book, p_chapter, v_xp_per_chapter);

    -- Update user XP
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + v_xp_per_chapter
    WHERE id = v_user_id
    RETURNING total_xp INTO v_new_total_xp;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (v_user_id, v_today, v_xp_per_chapter)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_xp_per_chapter;

    -- Recalculate tier
    PERFORM recalculate_user_tier(v_user_id);

    -- Check for book completion achievement
    v_achievement_result := check_book_completion_achievement(v_user_id, p_book);

    RETURN jsonb_build_object(
        'success', true,
        'already_completed', false,
        'xp_awarded', v_xp_per_chapter,
        'achievement', v_achievement_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get book completion progress for all books
-- ============================================================================
CREATE OR REPLACE FUNCTION get_all_book_progress()
RETURNS TABLE (
    book TEXT,
    completed_chapters INTEGER,
    total_chapters INTEGER,
    percentage INTEGER,
    is_complete BOOLEAN,
    achievement_key TEXT,
    achievement_name TEXT,
    achievement_unlocked BOOLEAN
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    RETURN QUERY
    SELECT
        a.requirement->>'book' as book,
        COALESCE(cc.completed, 0)::INTEGER as completed_chapters,
        (a.requirement->>'chapters')::INTEGER as total_chapters,
        CASE
            WHEN (a.requirement->>'chapters')::INTEGER > 0
            THEN ROUND((COALESCE(cc.completed, 0)::NUMERIC / (a.requirement->>'chapters')::INTEGER) * 100)::INTEGER
            ELSE 0
        END as percentage,
        COALESCE(cc.completed, 0) >= (a.requirement->>'chapters')::INTEGER as is_complete,
        a.key as achievement_key,
        a.name as achievement_name,
        CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as achievement_unlocked
    FROM public.achievements a
    LEFT JOIN (
        SELECT c.book, COUNT(*)::INTEGER as completed
        FROM public.chapter_completions c
        WHERE c.user_id = v_user_id
        GROUP BY c.book
    ) cc ON cc.book = a.requirement->>'book'
    LEFT JOIN public.user_achievements ua
        ON ua.achievement_id = a.id AND ua.user_id = v_user_id
    WHERE a.category = 'book_completion'
    ORDER BY a.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Check all book achievements (for retroactive unlocking)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_all_book_achievements()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_book_record RECORD;
    v_results JSONB := '[]'::JSONB;
    v_achievement_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Loop through all book completion achievements
    FOR v_book_record IN
        SELECT requirement->>'book' as book
        FROM public.achievements
        WHERE category = 'book_completion'
    LOOP
        v_achievement_result := check_book_completion_achievement(v_user_id, v_book_record.book);
        IF (v_achievement_result->>'awarded')::BOOLEAN THEN
            v_results := v_results || v_achievement_result;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'checked', (SELECT COUNT(*) FROM public.achievements WHERE category = 'book_completion'),
        'newly_awarded', v_results
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
